import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { findParticipantForAttendance, markParticipantAttended } from "@/lib/googleSheets";
import type { RecipientSource } from "@/types/participant";
import { hasAttended } from "@/types/participant";

type VerifyAttendancePageProps = {
  searchParams: Promise<{
    row?: string;
    source?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function VerifyAttendancePage({
  searchParams
}: VerifyAttendancePageProps) {
  const params = await searchParams;
  const rowNumber = Number(params.row);
  const source =
    params.source === "committee" || params.source === "participant"
      ? (params.source as RecipientSource)
      : undefined;

  let title = "Attendance QR";
  let message = "Invalid attendance QR link.";
  let success = false;

  if (Number.isInteger(rowNumber) && rowNumber > 1 && source) {
    const recipient = await findParticipantForAttendance("", rowNumber, source);

    if (recipient) {
      title = recipient.student_name;

      if (hasAttended(recipient.attendance_status)) {
        success = true;
        message = `${recipient.sourceLabel} already marked as attended.`;
      } else {
        const attendedAt = await markParticipantAttended(recipient);
        success = true;
        message = `${recipient.sourceLabel} marked as attended at ${attendedAt}.`;
      }
    } else {
      message = "Record not found for this QR link.";
    }
  }

  return (
    <main className="flex min-h-[70dvh] items-center justify-center px-4 py-8">
      <section className="surface-card w-full max-w-md p-5 text-center">
        <Badge variant={success ? "success" : "warning"}>
          {success ? "Verified" : "Needs Check"}
        </Badge>
        <h1 className="mt-4 text-2xl font-bold text-foreground">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{message}</p>
        <Link href="/admin/attendance" className="mt-5 block">
          <Button className="w-full">Back to Attendance</Button>
        </Link>
      </section>
    </main>
  );
}
