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

    const pdfBytes = await generateCertificatePdf(participant);
    await markCertificateClaimed(participant);

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="certificate-${normalizeMatric(
          participant.matric_no
        )}.pdf"`
      }
    });
  } catch (error) {
    console.error("download-certificate failed", error);
    return publicServerError();
  }
}
