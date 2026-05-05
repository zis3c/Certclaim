import BrandLogo from "@/components/BrandLogo";
import ClaimForm from "@/components/ClaimForm";
import { getClaimBrandConfig, getClaimBrandStyle, type Theme } from "@/lib/claimTheme";
import { getClaimSettings } from "@/lib/googleSheets";
import { cookies } from "next/headers";
import { ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ClaimPage() {
  const cookieStore = await cookies();
  const savedTheme = cookieStore.get("theme")?.value;
  const theme: Theme = savedTheme === "light" ? "light" : "dark";
  const { brandMode, primaryColor, claimTitle } = getClaimBrandConfig();
  const claimBrandStyle = getClaimBrandStyle(theme, brandMode, primaryColor);
  let isOpen = false;
  let setupError = "";

  try {
    const settings = await getClaimSettings();
    isOpen = settings.claimStatus === "OPEN";
  } catch (error) {
    setupError = error instanceof Error ? error.message : "Unable to load claim setting.";
  }

  return (
    <main
      className="relative flex h-screen w-full overflow-hidden bg-transparent text-foreground"
      style={claimBrandStyle}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,color-mix(in_srgb,var(--primary)_12%,transparent),transparent_34%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(color-mix(in_srgb,var(--primary)_4%,transparent)_1px,transparent_1px),linear-gradient(90deg,color-mix(in_srgb,var(--primary)_4%,transparent)_1px,transparent_1px)] bg-[size:64px_64px] opacity-40 [mask-image:radial-gradient(ellipse_at_center,black_35%,transparent_80%)]" />

      <div className="relative z-10 flex h-full w-full items-center justify-center px-4 py-4 sm:px-6">
        <section className="grid w-full max-w-5xl items-center gap-6 md:grid-cols-[0.9fr_1.1fr]">
          <div className="hidden min-w-0 flex-col md:flex">
            <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-lg border border-primary/20 bg-card shadow-sm">
              <BrandLogo className="h-7 w-7 text-primary" />
            </div>
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Certificate Portal
              </p>
              <h1 className="max-w-sm text-5xl font-semibold tracking-tight text-foreground">
                Claim your certificate.
              </h1>
              <p className="max-w-sm text-sm leading-6 text-muted-foreground">
                Verify your matric number and download your {claimTitle} certificate in one secure step.
              </p>
            </div>
            <div className="mt-8 flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span>USAS secure verification</span>
            </div>
          </div>

          <div className="mx-auto w-full max-w-[430px] md:max-w-none">
            <div className="mb-5 flex items-center gap-3 md:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-primary/20 bg-card">
                <BrandLogo className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Claim Certificate</p>
                <p className="text-xs text-muted-foreground">{claimTitle}</p>
              </div>
            </div>

            <ClaimForm isOpen={isOpen && !setupError} claimTitle={claimTitle} />

            {setupError && (
              <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-300">
                {setupError}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
