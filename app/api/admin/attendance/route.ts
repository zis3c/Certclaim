import { NextRequest, NextResponse } from "next/server";
import { auditLog } from "@/lib/auditLog";
import { getAdminSession } from "@/lib/auth";
import {
  clearParticipantAttendance,
  findParticipantForAttendance,
  markParticipantAttended
} from "@/lib/googleSheets";
import { requireSameOrigin } from "@/lib/requestSecurity";
import type { RecipientSource } from "@/types/participant";
import { hasAttended } from "@/types/participant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const forbidden = requireSameOrigin(request);
  if (forbidden) return forbidden;

  const isAuthed = await getAdminSession();
  if (!isAuthed) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      action?: unknown;
      matricNo?: unknown;
      query?: unknown;
      rowNumber?: unknown;
      source?: unknown;
    };
    const rawQuery = typeof body.query === "string" ? body.query : body.matricNo;
    const query = typeof rawQuery === "string" ? rawQuery.trim() : "";
    const rowNumber = typeof body.rowNumber === "number" ? body.rowNumber : undefined;
    const source =
      body.source === "committee" || body.source === "participant"
        ? (body.source as RecipientSource)
        : undefined;

    if (body.action === "undo") {
      if (!rowNumber) {
        return NextResponse.json({ message: "Please choose a record to undo attendance." }, { status: 400 });
      }

      const participant = await findParticipantForAttendance("", rowNumber, source);
      if (!participant) {
        return NextResponse.json({ message: "Record not found. Unable to undo attendance." }, { status: 404 });
      }

      await clearParticipantAttendance(participant);
      await auditLog({
        event: "ATTENDANCE_UNDONE",
        request,
        metadata: {
          source: participant.source,
          rowNumber: participant.rowNumber
        }
      });
      return NextResponse.json({
        participant: {
          ...participant,
          attendance_status: "",
          attended_at: ""
        },
        message: `Attendance mark removed for ${participant.student_name}.`
      });
    }

    if (!query) {
      return NextResponse.json({ message: "Please enter name or matric number." }, { status: 400 });
    }

    if (query.length > 120) {
      return NextResponse.json({ message: "Please enter a shorter name or matric number." }, { status: 400 });
    }

    const participant = await findParticipantForAttendance(query, rowNumber, source);
    if (!participant) {
      return NextResponse.json(
        { message: "Record not found. Please check the name or matric number." },
        { status: 404 }
      );
    }

    if (hasAttended(participant.attendance_status)) {
      return NextResponse.json({
        participant,
        attendedAt: participant.attended_at,
        message: `${participant.student_name} already marked as attended.`
      });
    }

    const attendedAt = await markParticipantAttended(participant);
    await auditLog({
      event: "ATTENDANCE_MARKED",
      request,
      metadata: {
        source: participant.source,
        rowNumber: participant.rowNumber
      }
    });

    return NextResponse.json({
      participant: {
        ...participant,
        attendance_status: "ATTENDED",
        attended_at: attendedAt
      },
      attendedAt,
      message: `${participant.student_name} marked as attended.`
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to mark attendance." },
      { status: 500 }
    );
  }
}
