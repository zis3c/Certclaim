import AdminSetupNeeded from "@/components/AdminSetupNeeded";
import AdminTable from "@/components/AdminTable";
import { getParticipants } from "@/lib/googleSheets";
import type { Participant } from "@/types/participant";

export const dynamic = "force-dynamic";

export default async function AdminRecipientsPage() {
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

  if (setupError) {
    return (
      <div className="flex h-full flex-col p-6 animate-fade-in">
        <h1 className="text-lg font-semibold text-foreground">Recipients</h1>
        <div className="mt-4">
          <AdminSetupNeeded message={setupError} />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full animate-fade-in">
      <AdminTable participants={participants} />
    </div>
  );
}
