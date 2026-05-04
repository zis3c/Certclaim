import Link from "next/link";
import AdminSetupNeeded from "@/components/AdminSetupNeeded";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getClaimSettings, getParticipants } from "@/lib/googleSheets";
import type { ClaimStatus, Participant } from "@/types/participant";
import { canClaimCertificate, hasAttended } from "@/types/participant";
import {
  Award,
  ExternalLink,
  TrendingUp,
  Users
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  let setupError = "";
  let participants: Participant[] = [];
  let settings: { claimStatus: ClaimStatus } = { claimStatus: "OPEN" };

  try {
    [participants, settings] = await Promise.all([
      getParticipants(),
      getClaimSettings()
    ]);
  } catch (error) {
    setupError =
      error instanceof Error
        ? error.message
        : "Unable to connect to Google Sheets.";
  }

  if (setupError) {
    return (
      <div className="flex h-full flex-col p-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-foreground">Dashboard</h1>
          <Badge variant="warning">Data Unavailable</Badge>
        </div>
        <div className="mt-4">
          <AdminSetupNeeded message={setupError} />
        </div>
      </div>
    );
  }

  const attendedCount = participants.filter((participant) =>
    hasAttended(participant.attendance_status)
  ).length;
  const eligibleCount = participants.filter(canClaimCertificate).length;
  const claimedCount = participants.filter(
    (participant) => participant.claim_status.toUpperCase() === "CLAIMED"
  ).length;
  const claimRate =
    participants.length > 0
      ? Math.round((claimedCount / participants.length) * 100)
      : 0;

  const stats = [
    {
      label: "Total Records",
      value: participants.length,
      note: "Participants + committee",
      icon: Users,
      color: "text-primary",
      bg: "bg-primary/20",
      ring: "ring-primary/35"
    },
    {
      label: "Eligible",
      value: eligibleCount,
      note: "Attendance + SIJIL verified",
      icon: Award,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/20",
      ring: "ring-emerald-500/35"
    },
    {
      label: "Claimed",
      value: claimedCount,
      note: `${claimRate}% claim rate`,
      icon: TrendingUp,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-500/20",
      ring: "ring-blue-500/35"
    }
  ];

  return (
    <div className="flex h-full flex-col p-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Dashboard</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Summary of records, attendance, and claims
          </p>
        </div>
        <Badge
          variant={settings.claimStatus === "OPEN" ? "success" : "warning"}
          className="w-fit"
        >
          Claim {settings.claimStatus}
        </Badge>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-3 mt-5 shrink-0 sm:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="hover-lift">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {stat.label}
                  </p>
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg ring-1"
                    style={{ 
                      backgroundColor: `color-mix(in srgb, ${stat.label === "Eligible" ? "var(--success)" : stat.label === "Claimed" ? "#3b82f6" : "var(--primary)"}, transparent 75%)`,
                      boxShadow: `0 0 0 1px color-mix(in srgb, ${stat.label === "Eligible" ? "var(--success)" : stat.label === "Claimed" ? "#3b82f6" : "var(--primary)"}, transparent 60%)`
                    }}
                  >
                    <Icon className={cn("h-4 w-4", stat.label === "Eligible" ? "text-emerald-600 dark:text-emerald-400" : stat.label === "Claimed" ? "text-blue-600 dark:text-blue-400" : "text-primary")} />
                  </div>
                </div>
                <p className="mt-2 text-3xl font-bold tabular-nums text-foreground">
                  {stat.value}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{stat.note}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Claim status summary */}
      <Card className="mt-4 shrink-0">
        <CardContent className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Certificate Claim is{" "}
                <span
                  className={
                    settings.claimStatus === "OPEN"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-amber-600 dark:text-amber-400"
                  }
                >
                  {settings.claimStatus}
                </span>
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Attendance verified: {attendedCount} of {participants.length}
              </p>
            </div>
            <Link
              href="/admin/access"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full sm:w-auto gap-1.5")}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Manage Access
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
