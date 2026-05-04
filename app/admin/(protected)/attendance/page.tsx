import AdminSetupNeeded from "@/components/AdminSetupNeeded";
import AttendanceCheck from "@/components/AttendanceCheck";
import { getParticipants } from "@/lib/googleSheets";
import type { Participant } from "@/types/participant";
import { hasAttended } from "@/types/participant";

export const dynamic = "force-dynamic";

export default async function AdminAttendancePage() {
  let setupError = "";
  let participants: Participant[] = [];

  try {
    participants = await getParticipants();
  } catch (error) {
    setupError =
      error instanceof Error
        ? error.message
        : "Unable to connect to Google Sheets.";
  }

  const attendedCount = participants.filter((participant) =>
    hasAttended(participant.attendance_status)
  ).length;

  if (setupError) {
    return (
      <div className="flex h-full flex-col p-6 animate-fade-in">
        <h1 className="text-lg font-semibold text-foreground">Attendance</h1>
        <div className="mt-4">
          <AdminSetupNeeded message={setupError} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full items-center justify-center p-6 animate-fade-in">
      <div className="w-full max-w-xl">
        <AttendanceCheck
          attendedCount={attendedCount}
          participants={participants}
          totalCount={participants.length}
        />
      </div>
    </div>
  );
}
