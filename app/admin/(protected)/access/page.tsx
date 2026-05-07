import AdminSetupNeeded from "@/components/AdminSetupNeeded";
import QRCard from "@/components/QRCard";
import { Badge } from "@/components/ui/badge";
import { getClaimSettings } from "@/lib/googleSheets";
import type { ClaimStatus } from "@/types/participant";

export const dynamic = "force-dynamic";

export default async function AdminClaimAccessPage() {
  let setupError = "";
  let settings: { claimStatus: ClaimStatus } = { claimStatus: "OPEN" };

  try {
    settings = await getClaimSettings();
  } catch (error) {
    setupError =
      error instanceof Error
        ? error.message
        : "Unable to connect to Google Sheets.";
  }

  const claimUrl = "https://cert-management-five.vercel.app/claim";

  if (setupError) {
    return (
      <div className="flex min-h-full flex-col p-4 pb-20 animate-fade-in sm:p-6 sm:pb-6">
        <h1 className="text-lg font-semibold text-foreground">Claim Access</h1>
        <div className="mt-4">
          <AdminSetupNeeded message={setupError} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col items-center px-4 py-6 pb-20 animate-fade-in sm:px-6 md:py-10 lg:h-full lg:min-h-0 lg:justify-center lg:py-0">
      <div className="w-full max-w-3xl">
        <QRCard initialStatus={settings.claimStatus} claimUrl={claimUrl} />
      </div>
    </div>
  );
}
