import { NextRequest, NextResponse } from "next/server";
import { verifyClaimToken } from "@/lib/claimToken";
import { generateCertificatePdf } from "@/lib/certificate";
import {
  findParticipantByMatric,
  getClaimSettings,
  markCertificateClaimed
} from "@/lib/googleSheets";
import { getClientIp, rateLimit } from "@/lib/rateLimit";
import { validateMatricInput } from "@/lib/validation";
import { canClaimCertificate, hasAttended, isCertificateEligible, normalizeMatric } from "@/types/participant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const ipLimited = await rateLimit({
      key: `download-certificate:ip:${ip}`,
      limit: 12,
      windowMs: 60 * 1000
    });
    if (ipLimited) return ipLimited;

    const body = (await request.json()) as { matricNo?: unknown; claimToken?: unknown };
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

    const matricLimited = await rateLimit({
      key: `download-certificate:matric:${validated.matricNo.toUpperCase()}:${ip}`,
      limit: 3,
      windowMs: 10 * 60 * 1000
    });
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
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to download certificate." },
      { status: 500 }
    );
  }
}
