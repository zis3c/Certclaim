"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { Participant } from "@/types/participant";
import { canClaimCertificate, hasAttended, isCertificateEligible } from "@/types/participant";
import {
  Award,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  Filter,
  RefreshCw,
  Users,
  X,
  XCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

type AdminTableProps = {
  participants: Participant[];
};

type ParticipantsResponse = {
  participants?: Participant[];
  message?: string;
};

type AttendanceActionResponse = {
  message?: string;
  participant?: Participant;
};

type FilterOption = {
  value: string;
  label: string;
  icon: React.ElementType;
  color: string;
  count: number;
};

const REFRESH_INTERVAL_MS = 10000;

function formatSyncTime(date: Date | null) {
  if (!date) return "—";

  return date.toLocaleTimeString("en-MY", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

/**
 * Normalizes date strings to remove leading zeros (e.g. 04/05/2026 -> 4/5/2026)
 */
function normalizeDateDisplay(dateStr: string | null | undefined) {
  if (!dateStr) return null;
  // Handle "DD/MM/YYYY HH:MM:SS AM/PM" or similar
  return dateStr.replace(/\b0(\d)\//g, "$1/").replace(/\b0(\d):/g, "$1:");
}

export default function AdminTable({ participants: initialParticipants }: AdminTableProps) {
  const router = useRouter();
  const [participants, setParticipants] = useState(initialParticipants);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState("");
  const [attendanceMessage, setAttendanceMessage] = useState("");
  const [attendanceMessageType, setAttendanceMessageType] = useState<"success" | "error">("success");
  const [attendanceActionRow, setAttendanceActionRow] = useState<number | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const refreshInFlight = useRef(false);

  const refreshParticipants = useCallback(async () => {
    if (refreshInFlight.current) return;

    refreshInFlight.current = true;
    setIsRefreshing(true);
    setRefreshError("");

    try {
      const response = await fetch(`/api/admin/participants?t=${Date.now()}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache"
        }
      });
      const data = (await response.json()) as ParticipantsResponse;

      if (!response.ok || !Array.isArray(data.participants)) {
        throw new Error(data.message || "Unable to load participants.");
      }

      setParticipants(data.participants);
      setLastSyncedAt(new Date());
    } catch (error) {
      setRefreshError(error instanceof Error ? error.message : "Unable to refresh participants.");
    } finally {
      refreshInFlight.current = false;
      setIsRefreshing(false);
    }
  }, []);

  const updateAttendance = useCallback(
    async (participant: Participant, action: "mark" | "undo") => {
      setAttendanceActionRow(participant.rowNumber);
      setAttendanceMessage("");

      // Optimistic update for instant feedback
      const originalParticipants = [...participants];
      setParticipants((prev) =>
        prev.map((p) => {
          if (p.rowNumber === participant.rowNumber && p.source === participant.source) {
            return {
              ...p,
              attendance_status: action === "mark" ? "ATTENDED" : "ABSENT",
              attended_at: action === "mark" ? new Date().toLocaleString() : ""
            };
          }
          return p;
        })
      );

      try {
        const response = await fetch("/api/admin/attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            action === "undo"
              ? { action: "undo", rowNumber: participant.rowNumber, source: participant.source }
              : {
                  query: participant.matric_no || participant.student_name,
                  rowNumber: participant.rowNumber,
                  source: participant.source
                }
          )
        });
        const data = (await response.json()) as AttendanceActionResponse;

        setAttendanceMessage(data.message || "Attendance updated.");
        setAttendanceMessageType(response.ok ? "success" : "error");

        if (response.ok) {
          // Confirm with server sync
          await refreshParticipants();
          router.refresh();
        } else {
          // Rollback if server fails
          setParticipants(originalParticipants);
        }
      } catch {
        setAttendanceMessage("Unable to update attendance. Please try again.");
        setAttendanceMessageType("error");
        // Rollback
        setParticipants(originalParticipants);
      } finally {
        setAttendanceActionRow(null);
      }
    },
    [participants, refreshParticipants, router]
  );

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setParticipants(initialParticipants);
  }, [initialParticipants]);

  useEffect(() => {
    setLastSyncedAt(new Date());

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refreshParticipants();
      }
    }, REFRESH_INTERVAL_MS);

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void refreshParticipants();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshParticipants]);

  // Compute counts for each filter
  const counts = useMemo(() => {
    const eligible = participants.filter((p) => isCertificateEligible(p.certificate_status.trim().toUpperCase())).length;
    const canClaim = participants.filter(canClaimCertificate).length;
    const attended = participants.filter((p) => hasAttended(p.attendance_status)).length;
    const claimed = participants.filter((p) => p.claim_status.toUpperCase() === "CLAIMED").length;
    return {
      ALL: participants.length,
      ELIGIBLE: canClaim,
      SIJIL_APPROVED: eligible,
      ATTENDED: attended,
      ABSENT: participants.length - attended,
      NOT_ELIGIBLE: participants.length - canClaim,
      CLAIMED: claimed,
      UNCLAIMED: participants.length - claimed
    };
  }, [participants]);

  const filterOptions: FilterOption[] = [
    { value: "ALL", label: "All", icon: Users, color: "text-primary", count: counts.ALL },
    { value: "ELIGIBLE", label: "Can Claim", icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400", count: counts.ELIGIBLE },
    { value: "ATTENDED", label: "Attended", icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400", count: counts.ATTENDED },
    { value: "ABSENT", label: "Absent", icon: XCircle, color: "text-red-600 dark:text-red-400", count: counts.ABSENT },
    { value: "NOT_ELIGIBLE", label: "Cannot Claim", icon: XCircle, color: "text-red-600 dark:text-red-400", count: counts.NOT_ELIGIBLE },
    { value: "CLAIMED", label: "Claimed", icon: Award, color: "text-blue-600 dark:text-blue-400", count: counts.CLAIMED },
    { value: "UNCLAIMED", label: "Unclaimed", icon: CircleDot, color: "text-amber-600 dark:text-amber-400", count: counts.UNCLAIMED }
  ];

  const activeFilter = filterOptions.find((o) => o.value === filter) || filterOptions[0];

  const filteredParticipants = useMemo(() => {
    const query = search.trim().toUpperCase();

    return participants.filter((participant) => {
      const matchesSearch =
        !query ||
        participant.student_name.toUpperCase().includes(query) ||
        participant.matric_no.toUpperCase().includes(query);

      const matchesFilter =
        filter === "ALL" ||
        (filter === "ELIGIBLE" && canClaimCertificate(participant)) ||
        (filter === "ATTENDED" && hasAttended(participant.attendance_status)) ||
        (filter === "ABSENT" && !hasAttended(participant.attendance_status)) ||
        (filter === "NOT_ELIGIBLE" && !canClaimCertificate(participant)) ||
        (filter === "CLAIMED" && participant.claim_status.toUpperCase() === "CLAIMED") ||
        (filter === "UNCLAIMED" && participant.claim_status.toUpperCase() !== "CLAIMED");

      return matchesSearch && matchesFilter;
    });
  }, [filter, participants, search]);

  return (
    <div className="flex h-full flex-col">
      {/* Compact toolbar */}
      <div className="shrink-0 border-b border-border/40 px-5 py-3">
        {/* Row 1: Title + filters */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-foreground">Recipients</h1>
            <span className="text-xs text-muted-foreground tabular-nums">
              {filteredParticipants.length} of {participants.length}
            </span>
            <span className="hidden items-center gap-1.5 text-[10px] text-muted-foreground sm:inline-flex">
              <span className={`h-1.5 w-1.5 rounded-full ${refreshError ? "bg-red-500" : "bg-emerald-500"}`} />
              Synced {formatSyncTime(lastSyncedAt)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => void refreshParticipants()}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1 rounded-md border border-border/50 px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`} />
              Sync
            </button>
            {filterOptions.map((opt) => {
              const Icon = opt.icon;
              const isActive = filter === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFilter(opt.value)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-all",
                    !isActive && "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                  style={isActive ? {
                    backgroundColor: 'color-mix(in srgb, var(--primary), transparent 85%)',
                    color: 'color-mix(in srgb, var(--primary), var(--foreground) 20%)',
                    boxShadow: '0 0 0 1px color-mix(in srgb, var(--primary), transparent 75%)'
                  } : {}}
                >
                  <Icon className={cn("h-3 w-3", isActive ? opt.color : "")} />
                  <span className="hidden sm:inline">{opt.label}</span>
                  <span className={cn("tabular-nums text-[10px]", isActive ? "text-primary/70" : "text-muted-foreground/60")}>
                    {opt.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 2: Search + dropdown */}
        <div className="mt-2.5 flex gap-2">
          <div className="relative flex-1">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-8 pr-8 text-sm"
              placeholder="Search name or matric..."
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className={`flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-all sm:w-40 ${
                dropdownOpen
                  ? "border-primary/50 bg-card ring-1 ring-ring/20"
                  : "border-border/60 bg-card/60 hover:bg-muted/40"
              }`}
            >
              <Filter className={`h-3 w-3 ${filter !== "ALL" ? "text-primary" : "text-muted-foreground"}`} />
              <span className={`hidden sm:inline ${filter !== "ALL" ? "text-foreground" : "text-muted-foreground"}`}>
                {activeFilter.label}
              </span>
              <ChevronDown className={`ml-auto h-3 w-3 text-muted-foreground transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full z-50 mt-1 min-w-[180px] overflow-hidden rounded-lg border border-border bg-card p-0.5 shadow-lg animate-scale-in">
                {filterOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isActive = filter === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setFilter(opt.value);
                        setDropdownOpen(false);
                      }}
                      className={`flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-xs transition-colors ${
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-foreground hover:bg-muted/60"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Icon className={`h-3.5 w-3.5 ${isActive ? opt.color : "text-muted-foreground"}`} />
                        <span className={isActive ? "font-semibold" : "font-medium"}>{opt.label}</span>
                      </span>
                      <span className={`tabular-nums text-[10px] font-bold ${
                        isActive ? "text-primary/70" : "text-muted-foreground"
                      }`}>
                        {opt.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Attendance message */}
        {attendanceMessage ? (
          <div
            className={`mt-2 rounded-md px-2.5 py-1.5 text-xs font-medium ${
              attendanceMessageType === "success"
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "bg-red-500/10 text-red-700 dark:text-red-300"
            }`}
          >
            {attendanceMessage}
          </div>
        ) : null}
      </div>

      {/* Table — fills remaining space with internal scroll */}
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-max min-w-full table-auto border-collapse text-sm">
          <colgroup>
            <col className="w-[48px]" />
            <col className="w-auto" />
            <col className="w-auto" />
            <col className="w-auto" />
            <col className="w-auto" />
            <col className="w-auto" />
            <col className="w-auto" />
            <col className="w-auto" />
            <col className="w-auto" />
            <col className="w-auto" />
            <col className="w-auto" />
            <col className="w-auto" />
            <col className="w-auto" />
          </colgroup>
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-border/30 bg-muted/60 backdrop-blur-sm text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="px-3 py-2.5 text-center font-semibold">#</th>
              <th className="px-3 py-2.5 text-center font-semibold">Type</th>
              <th className="px-3 py-2.5 text-left font-semibold">Timestamp</th>
              <th className="px-3 py-2.5 text-left font-semibold">Name</th>
              <th className="px-3 py-2.5 text-center font-semibold">Matric</th>
              <th className="px-3 py-2.5 text-left font-semibold">Course</th>
              <th className="px-3 py-2.5 text-left font-semibold">Email</th>
              <th className="px-3 py-2.5 text-center font-semibold">Sijil</th>
              <th className="px-3 py-2.5 text-center font-semibold">Attendance</th>
              <th className="px-3 py-2.5 text-center font-semibold">Action</th>
              <th className="px-3 py-2.5 text-center font-semibold">Can Claim</th>
              <th className="px-3 py-2.5 text-center font-semibold">Status</th>
              <th className="px-3 py-2.5 text-center font-semibold">Claimed At</th>
            </tr>
          </thead>
          <tbody>
            {filteredParticipants.length === 0 ? (
              <tr>
                <td colSpan={13} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                      <Users className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground">No records found</p>
                    <p className="text-xs text-muted-foreground">
                      {search
                        ? "Try adjusting your search or filter."
                        : "No records available yet."}
                    </p>
                    {(search || filter !== "ALL") && (
                      <button
                        type="button"
                        onClick={() => { setSearch(""); setFilter("ALL"); }}
                        className="mt-1 inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                        Clear filters
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredParticipants.map((participant, index) => (
                <tr
                  id={`recipient-${participant.source}-${participant.rowNumber}`}
                  key={`${participant.source}-${participant.rowNumber}-${participant.matric_no}`}
                  className="group scroll-mt-6 border-b border-border/15 transition-colors target:bg-primary/10 hover:bg-primary/[0.03]"
                >
                  <td className="whitespace-nowrap px-3 py-3 text-center tabular-nums text-xs text-muted-foreground">{index + 1}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-center">
                    <Badge 
                      variant="outline"
                      className="text-[10px] font-bold px-2 py-0 border-0"
                      style={{
                        backgroundColor: participant.source === "committee" ? "color-mix(in srgb, var(--warning), transparent 75%)" : "var(--participant-bg)",
                        color: participant.source === "committee" ? "color-mix(in srgb, var(--warning), var(--foreground) 60%)" : "var(--participant-text)"
                      }}
                    >
                      {participant.sourceLabel.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">
                    <span className="text-[11px]" title={participant.timestamp}>
                      {participant.timestamp || "-"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-sm font-medium text-foreground">
                    <span title={participant.student_name}>
                      {participant.student_name || "-"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-center">
                    <code className="inline-flex truncate rounded bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-foreground">
                      {participant.matric_no || "-"}
                    </code>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground">
                    <span title={participant.student_course}>
                      {participant.student_course || "-"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">
                    <span className="text-[11px]" title={participant.student_email}>
                      {participant.student_email || "-"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-center">
                    <Badge
                      variant="outline"
                      className="text-[10px] border-0"
                      style={{
                        backgroundColor: `color-mix(in srgb, var(--${isCertificateEligible(participant.certificate_status) ? "success" : "muted-foreground"}), transparent 80%)`,
                        color: `color-mix(in srgb, var(--${isCertificateEligible(participant.certificate_status) ? "success" : "muted-foreground"}), var(--foreground) 50%)`
                      }}
                    >
                      {participant.certificate_status || "EMPTY"}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <Badge 
                        variant="outline" 
                        className="text-[10px] border-0"
                        style={{
                          backgroundColor: `color-mix(in srgb, var(--${hasAttended(participant.attendance_status) ? "success" : "muted-foreground"}), transparent 80%)`,
                          color: `color-mix(in srgb, var(--${hasAttended(participant.attendance_status) ? "success" : "muted-foreground"}), var(--foreground) 50%)`
                        }}
                      >
                        {participant.attendance_status || "ABSENT"}
                      </Badge>
                      {participant.attended_at ? (
                        <p className="max-w-[120px] truncate text-[9px] text-muted-foreground" title={participant.attended_at}>
                          {normalizeDateDisplay(participant.attended_at)}
                        </p>
                      ) : null}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-center">
                    {hasAttended(participant.attendance_status) ? (
                      <button
                        type="button"
                        onClick={() => void updateAttendance(participant, "undo")}
                        disabled={attendanceActionRow === participant.rowNumber}
                        className="inline-flex h-6 w-14 items-center justify-center rounded-md bg-red-500 text-[10px] font-bold text-white transition-colors hover:bg-red-600 disabled:opacity-50"
                      >
                        {attendanceActionRow === participant.rowNumber ? "..." : "UNDO"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void updateAttendance(participant, "mark")}
                        disabled={attendanceActionRow === participant.rowNumber}
                        className="inline-flex h-6 w-14 items-center justify-center rounded-md bg-emerald-500 text-[10px] font-bold text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
                      >
                        {attendanceActionRow === participant.rowNumber ? "..." : "MARK"}
                      </button>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-center">
                    <Badge 
                      variant="outline"
                      className="text-[10px] border-0"
                      style={{
                        backgroundColor: `color-mix(in srgb, var(--${canClaimCertificate(participant) ? "success" : "muted-foreground"}), transparent 80%)`,
                        color: `color-mix(in srgb, var(--${canClaimCertificate(participant) ? "success" : "muted-foreground"}), var(--foreground) 50%)`
                      }}
                    >
                      {canClaimCertificate(participant) ? "YES" : "NO"}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-center">
                    <Badge
                      variant="outline"
                      className="text-[10px] border-0"
                      style={{
                        backgroundColor: `color-mix(in srgb, var(--${participant.claim_status.toUpperCase() === "CLAIMED" ? "success" : "muted-foreground"}), transparent 80%)`,
                        color: `color-mix(in srgb, var(--${participant.claim_status.toUpperCase() === "CLAIMED" ? "success" : "muted-foreground"}), var(--foreground) 50%)`
                      }}
                    >
                      {participant.claim_status || "UNCLAIMED"}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-center text-muted-foreground">
                    <span className="text-[11px]" title={participant.claimed_at}>
                      {participant.claimed_at || "-"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
