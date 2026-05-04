import { NextRequest, NextResponse } from "next/server";
import { createClaimToken } from "@/lib/claimToken";
import { getClaimSettings, findParticipantByMatric } from "@/lib/googleSheets";
import { getClientIp, rateLimit } from "@/lib/rateLimit";
import { validateMatricInput } from "@/lib/validation";
import { canClaimCertificate, hasAttended, isCertificateEligible } from "@/types/participant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const ipLimited = await rateLimit({
      key: `check-matric:ip:${ip}`,
      limit: 30,
      windowMs: 60 * 1000
    });
    if (ipLimited) return ipLimited;

    const body = (await request.json()) as { matricNo?: unknown };
    const validated = validateMatricInput(body.matricNo);

    if (!validated.ok) {
      return NextResponse.json(
        { found: false, eligible: false, message: validated.message },
        { status: 400 }
      );
    }

    const matricLimited = await rateLimit({
      key: `check-matric:matric:${validated.matricNo.toUpperCase()}:${ip}`,
      limit: 6,
      windowMs: 10 * 60 * 1000
    });
    if (matricLimited) return matricLimited;

    const settings = await getClaimSettings();
    if (settings.claimStatus === "CLOSED") {
      return NextResponse.json(
        {
          found: false,
          eligible: false,
          message: "Certificate claim is currently closed."
        },
        { status: 403 }
      );
    }

    const participant = await findParticipantByMatric(validated.matricNo);
    if (!participant) {
      return NextResponse.json(
        {
          found: false,
          eligible: false,
          message: "Matric number not found. Please check your number or contact the organizer."
        },
        { status: 404 }
      );
    }

    const certificateApproved = isCertificateEligible(participant.certificate_status);
    const attended = hasAttended(participant.attendance_status);
    const eligible = canClaimCertificate(participant);
    const message = !certificateApproved
      ? "Your certificate is not available yet. Please contact the organizer."
      : !attended
        ? "Attendance not verified. Please complete physical attendance verification with the organizer."
        : "";

    return NextResponse.json({
      found: true,
      eligible,
      message,
      claimToken: createClaimToken(participant.matric_no),
      participant: {
        matric_no: participant.matric_no,
        source: participant.source,
        sourceLabel: participant.sourceLabel,
        certificateApproved,
        attendanceVerified: attended
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        found: false,
        eligible: false,
        message: error instanceof Error ? error.message : "Unable to check matric number."
      },
      { status: 500 }
    );
  }
}
