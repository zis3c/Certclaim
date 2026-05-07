import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit, parseJsonBody, publicServerError } from "@/lib/apiSecurity";
import { verifyClaimToken } from "@/lib/claimToken";
import { generateCertificatePdf } from "@/lib/certificate";
import {
  findParticipantByMatric,
  getClaimSettings,
  markCertificateClaimed
} from "@/lib/googleSheets";
import { getClientIp } from "@/lib/rateLimit";
import { validateMatricInput } from "@/lib/validation";
import { canClaimCertificate, hasAttended, isCertificateEligible, normalizeMatric } from "@/types/participant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PDF_CACHE_TTL_MS = 10 * 60 * 1000;
const CLAIM_SIDE_EFFECT_LOCK_MS = 30 * 1000;
const MAX_CONCURRENT_PDF_JOBS = 10;
const MAX_WAITING_PDF_JOBS = 100;

type CachedPdfEntry = {
  pdfBytes: Uint8Array;
  expiresAt: number;
};

const cachedPdfs = new Map<string, CachedPdfEntry>();
const inflightPdfJobs = new Map<string, Promise<Uint8Array>>();
const claimSideEffectLocks = new Map<string, number>();
let activePdfJobs = 0;
const pdfJobWaiters: Array<() => void> = [];

class PdfQueueBusyError extends Error {
  queuePosition: number;

  constructor(queuePosition: number) {
    super("PDF queue is busy");
    this.queuePosition = queuePosition;
  }
}

function cleanupMemory(now: number) {
  for (const [key, entry] of cachedPdfs) {
    if (entry.expiresAt <= now) {
      cachedPdfs.delete(key);
    }
  }

  for (const [key, lockedUntil] of claimSideEffectLocks) {
    if (lockedUntil <= now) {
      claimSideEffectLocks.delete(key);
    }
  }
}

async function runWithPdfConcurrencyLimit<T>(job: () => Promise<T>) {
  if (activePdfJobs >= MAX_CONCURRENT_PDF_JOBS && pdfJobWaiters.length >= MAX_WAITING_PDF_JOBS) {
    throw new PdfQueueBusyError(pdfJobWaiters.length + 1);
  }

  if (activePdfJobs >= MAX_CONCURRENT_PDF_JOBS) {
    await new Promise<void>((resolve) => {
      pdfJobWaiters.push(resolve);
    });
  }

  activePdfJobs += 1;
  try {
    return await job();
  } finally {
    activePdfJobs = Math.max(0, activePdfJobs - 1);
    const next = pdfJobWaiters.shift();
    if (next) next();
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const ipLimited = await applyRateLimit(`download-certificate:ip:${ip}`, 8, 60 * 1000);
    if (ipLimited) return ipLimited;

    const parsed = await parseJsonBody<{ matricNo?: unknown; claimToken?: unknown }>(request);
    if (!parsed.ok) return parsed.response;
    const body = parsed.body;
    const validated = validateMatricInput(body.matricNo);

    if (!validated.ok) {
      return NextResponse.json({ message: validated.message }, { status: 400 });
    }

    if (!verifyClaimToken(validated.matricNo, body.claimToken)) {
      return NextResponse.json(
        { message: "Verification expired. Please check your matric number again." },
        { status: 403 }
      );
    }

    const matricLimited = await applyRateLimit(
      `download-certificate:matric:${validated.matricNo.toUpperCase()}:${ip}`,
      2,
      10 * 60 * 1000
    );
    if (matricLimited) return matricLimited;

    const settings = await getClaimSettings();
    if (settings.claimStatus === "CLOSED") {
      return NextResponse.json(
        { message: "Certificate claim is currently closed." },
        { status: 403 }
      );
    }

    const participant = await findParticipantByMatric(validated.matricNo);
    if (!participant) {
      return NextResponse.json(
        { message: "Matric number not found. Please check your number or contact the organizer." },
        { status: 404 }
      );
    }

    if (!isCertificateEligible(participant.certificate_status)) {
      return NextResponse.json(
        { message: "Your certificate is not available yet. Please contact the organizer." },
        { status: 403 }
      );
    }

    if (!hasAttended(participant.attendance_status) || !canClaimCertificate(participant)) {
      return NextResponse.json(
        { message: "Attendance not verified. Please complete physical attendance verification with the organizer." },
        { status: 403 }
      );
    }

    const matricKey = normalizeMatric(participant.matric_no);
    const now = Date.now();
    cleanupMemory(now);

    let pdfBytes: Uint8Array;
    const cached = cachedPdfs.get(matricKey);
    if (cached && cached.expiresAt > now) {
      pdfBytes = cached.pdfBytes;
    } else {
      let pdfJob = inflightPdfJobs.get(matricKey);

      if (!pdfJob) {
        pdfJob = runWithPdfConcurrencyLimit(() => generateCertificatePdf(participant));
        inflightPdfJobs.set(matricKey, pdfJob);
      }

      try {
        pdfBytes = await pdfJob;
      } finally {
        if (inflightPdfJobs.get(matricKey) === pdfJob) {
          inflightPdfJobs.delete(matricKey);
        }
      }

      cachedPdfs.set(matricKey, {
        pdfBytes,
        expiresAt: now + PDF_CACHE_TTL_MS
      });
    }

    const claimedAlready = participant.claim_status.trim().toUpperCase() === "CLAIMED";
    const lockUntil = claimSideEffectLocks.get(matricKey) || 0;
    if (!claimedAlready && lockUntil <= now) {
      claimSideEffectLocks.set(matricKey, now + CLAIM_SIDE_EFFECT_LOCK_MS);
      await markCertificateClaimed(participant);
    }

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="certificate-${normalizeMatric(
          participant.matric_no
        )}.pdf"`
      }
    });
  } catch (error) {
    if (error instanceof PdfQueueBusyError) {
      return NextResponse.json(
        {
          message: `Server is busy right now. Queue number: ${error.queuePosition}. Please retry shortly.`,
          queuePosition: error.queuePosition
        },
        {
          status: 503,
          headers: {
            "Retry-After": "10"
          }
        }
      );
    }
    console.error("download-certificate failed", error);
    return publicServerError();
  }
}
