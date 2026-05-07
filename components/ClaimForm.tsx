"use client";

import { FormEvent, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PublicParticipant } from "@/types/participant";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Loader2,
  Lock,
  RotateCcw,
  Search,
  ShieldCheck
} from "lucide-react";
import { cn } from "@/lib/utils";

type ClaimFormProps = {
  isOpen: boolean;
  claimTitle: string;
};

type CheckResult =
  | {
      found: true;
      eligible: boolean;
      message?: string;
      claimToken: string;
      participant: PublicParticipant;
    }
  | {
      found: false;
      eligible: false;
      message: string;
    };

export default function ClaimForm({ isOpen, claimTitle }: ClaimFormProps) {
  const [matricNo, setMatricNo] = useState("");
  const [result, setResult] = useState<CheckResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isChecking || isDownloading) return;
    setStatusMessage("");
    setResult(null);
    setDownloadSuccess(false);

    const normalizedMatric = matricNo.trim();
    if (!normalizedMatric) {
      setStatusMessage("Please enter your matric number.");
      return;
    }

    setIsChecking(true);

    try {
      const response = await fetch("/api/check-matric", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matricNo: normalizedMatric })
      });

      const data = (await response.json()) as CheckResult;
      setResult(data);
      if (!response.ok && "message" in data) {
        setStatusMessage(data.message || "Unable to check your matric number.");
      }
    } catch {
      setStatusMessage("Unable to check your matric number right now. Please try again.");
    } finally {
      setIsChecking(false);
    }
  }

  async function handleDownload() {
    if (!result?.found || !result.eligible || isDownloading || isChecking) return;

    setIsDownloading(true);
    setStatusMessage("");

    try {
      const response = await fetch("/api/download-certificate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matricNo: result.participant.matric_no,
          claimToken: result.claimToken
        })
      });

      if (!response.ok) {
        const data = (await response.json()) as { message?: string };
        setStatusMessage(data.message || "Unable to download certificate.");
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `certificate-${result.participant.matric_no}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setDownloadSuccess(true);
      setStatusMessage("Certificate downloaded successfully.");
    } catch {
      setStatusMessage("Unable to download certificate. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  }

  function resetForm() {
    setResult(null);
    setDownloadSuccess(false);
    setStatusMessage("");
    setMatricNo("");
  }

  const verifiedResult = result?.found ? result : null;

  return (
    <Card className="overflow-hidden rounded-lg border-border/70 bg-card/80 shadow-[0_24px_80px_-40px_rgba(0,0,0,0.45)] backdrop-blur-xl">
      <CardHeader className="space-y-1 border-b border-border/60 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground">{claimTitle}</p>
            <CardTitle className="mt-1 text-xl font-semibold tracking-tight">
              Certificate claim
            </CardTitle>
          </div>
          <Badge variant={isOpen ? "default" : "warning"} className="shrink-0">
            {isOpen ? "Open" : "Closed"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-5">
        {!isOpen ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg border border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-300">
              <Lock className="h-5 w-5" />
            </div>
            <h2 className="text-base font-semibold text-foreground">Claim period closed</h2>
            <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
              Certificate claiming is not available right now. Please contact the administrator.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {!verifiedResult ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="matricNo" className="text-xs text-muted-foreground">
                      Matric number
                    </Label>
                    <ShieldCheck className="h-4 w-4 text-primary/70" />
                  </div>
                  <Input
                    id="matricNo"
                    value={matricNo}
                    onChange={(event) => setMatricNo(event.target.value.toUpperCase())}
                    className="h-11 bg-background/70"
                    placeholder="Example: ABC1234"
                    disabled={isChecking}
                    maxLength={40}
                    autoComplete="off"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isChecking || isDownloading || !matricNo.trim()}
                  className="h-11 w-full rounded-md"
                  style={{
                    backgroundColor: "color-mix(in srgb, var(--primary), var(--foreground) 14%)",
                    color: "var(--primary-foreground)"
                  }}
                >
                  {isChecking ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Verifying
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4" />
                      Check eligibility
                    </>
                  )}
                </Button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg border border-border/70 bg-background/50 p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border",
                        verifiedResult.eligible
                          ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                          : "border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-300"
                      )}
                    >
                      {verifiedResult.eligible ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">
                        {verifiedResult.eligible ? "Certificate ready" : "Action required"}
                      </p>
                      <p className="mt-1 truncate text-sm text-muted-foreground">
                        {verifiedResult.participant.matric_no}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant={verifiedResult.participant.attendanceVerified ? "success" : "warning"}>
                          {verifiedResult.participant.attendanceVerified ? "Attended" : "Attendance needed"}
                        </Badge>
                        <Badge variant="outline">{verifiedResult.participant.sourceLabel}</Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {verifiedResult.eligible ? (
                  <Button
                    onClick={handleDownload}
                    disabled={isDownloading || isChecking || downloadSuccess}
                    className={cn("h-11 w-full rounded-md", downloadSuccess && "bg-emerald-600 text-white hover:bg-emerald-600")}
                    style={
                      downloadSuccess
                        ? {}
                        : {
                            backgroundColor: "color-mix(in srgb, var(--primary), var(--foreground) 14%)",
                            color: "var(--primary-foreground)"
                          }
                    }
                  >
                    {isDownloading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Preparing certificate
                      </>
                    ) : downloadSuccess ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Downloaded
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        Download certificate
                      </>
                    )}
                  </Button>
                ) : (
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm leading-6 text-amber-700 dark:text-amber-300">
                    {verifiedResult.message || "Attendance verification is required before this certificate can be claimed."}
                  </div>
                )}

                <Button type="button" variant="outline" className="h-10 w-full rounded-md" onClick={resetForm}>
                  <RotateCcw className="h-4 w-4" />
                  Check another matric
                </Button>
              </div>
            )}

            {statusMessage && (
              <div
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm",
                  downloadSuccess
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300"
                )}
              >
                {statusMessage}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
