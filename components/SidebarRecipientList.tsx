"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Participant } from "@/types/participant";
import { hasAttended } from "@/types/participant";

type SidebarRecipientListProps = {
  initialParticipants: Participant[];
};

type ParticipantsResponse = {
  participants?: Participant[];
  message?: string;
};

const REFRESH_INTERVAL_MS = 10000;

export default function SidebarRecipientList({ initialParticipants }: SidebarRecipientListProps) {
  const [participants, setParticipants] = useState(initialParticipants);
  const refreshInFlight = useRef(false);

  const refreshParticipants = useCallback(async () => {
    if (refreshInFlight.current) return;

    refreshInFlight.current = true;
    try {
      const response = await fetch(`/api/admin/participants?t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" }
      });
      const data = (await response.json()) as ParticipantsResponse;
      if (response.ok && Array.isArray(data.participants)) {
        setParticipants(data.participants);
      }
    } finally {
      refreshInFlight.current = false;
    }
  }, []);

  useEffect(() => {
    setParticipants(initialParticipants);
  }, [initialParticipants]);

  useEffect(() => {
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

  return (
    <nav className="min-h-0 p-3 md:flex-1" aria-label="Recipient quick list">
      <div className="mb-2 flex items-center justify-between px-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Records
        </p>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
          {participants.length}
        </span>
      </div>
      <div className="grid max-h-72 gap-1 overflow-y-auto pr-1 md:max-h-[calc(100dvh-11rem)]">
        {participants.length === 0 ? (
          <p className="rounded-lg border border-border/40 px-3 py-2 text-xs text-muted-foreground">
            No records yet
          </p>
        ) : (
          participants.map((participant) => {
            const attended = hasAttended(participant.attendance_status);
            const claimed = participant.claim_status.toUpperCase() === "CLAIMED";

            return (
              <a
                key={`${participant.source}-${participant.rowNumber}`}
                href={`#recipient-${participant.source}-${participant.rowNumber}`}
                className="block w-full rounded-lg border border-transparent px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/35 hover:bg-primary/10 hover:text-foreground focus-visible:border-primary/50 focus-visible:bg-primary/10 focus-visible:text-foreground focus-visible:outline-none"
              >
                <span className="block truncate font-medium">
                  {participant.student_name || participant.matric_no || "Unnamed record"}
                </span>
                <span className="mt-1 flex items-center gap-1.5 text-[10px]">
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-muted-foreground">
                    {participant.sourceLabel}
                  </span>
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      attended ? "bg-emerald-500 dark:bg-emerald-400" : "bg-red-500 dark:bg-red-400"
                    }`}
                    title={attended ? "Attendance verified" : "Attendance pending"}
                  />
                  <span className={attended ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"}>
                    {attended ? "Attended" : "Pending"}
                  </span>
                  <span className="text-muted-foreground/50">/</span>
                  <span className={claimed ? "text-blue-700 dark:text-blue-300" : "text-amber-700 dark:text-amber-300"}>
                    {claimed ? "Claimed" : "Unclaimed"}
                  </span>
                </span>
              </a>
            );
          })
        )}
      </div>
    </nav>
  );
}
