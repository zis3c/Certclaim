"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Participant } from "@/types/participant";
import { CheckCircle2, Loader2, RotateCcw, SearchCheck, UserCheck } from "lucide-react";

type AttendanceCheckProps = {
  attendedCount: number;
  participants: Participant[];
  totalCount: number;
};

type AttendanceResponse = {
  message: string;
  attendedAt?: string;
  participant?: Participant;
};

export default function AttendanceCheck({ attendedCount, participants, totalCount }: AttendanceCheckProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [lastMarked, setLastMarked] = useState<Participant | null>(null);

  const suggestions = useMemo(() => {
    const value = query.trim().toUpperCase();
    if (value.length < 2) return [];

    return participants
      .filter((participant) => {
        const name = participant.student_name.toUpperCase();
        const matric = participant.matric_no.toUpperCase();
        return name.includes(value) || matric.includes(value);
      })
      .slice(0, 6);
  }, [participants, query]);

  function selectParticipant(participant: Participant) {
    setQuery(participant.student_name);
    setSelectedParticipant(participant);
    setShowSuggestions(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSuccess(false);

    const attendanceQuery = query.trim();
    if (!attendanceQuery) {
      setMessage("Please enter name or matric number.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: attendanceQuery,
          rowNumber: selectedParticipant?.rowNumber,
          source: selectedParticipant?.source
        })
      });
      const data = (await response.json()) as AttendanceResponse;

      setMessage(data.message || "Attendance updated.");
      setIsSuccess(response.ok);

      if (response.ok) {
        if (data.participant && data.participant.attendance_status === "ATTENDED") {
          setLastMarked(data.participant);
        }
        setQuery("");
        setSelectedParticipant(null);
        setShowSuggestions(false);
        router.refresh();
      }
    } catch {
      setMessage("Unable to mark attendance. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUndo() {
    if (!lastMarked) return;

    setMessage("");
    setIsSuccess(false);
    setIsUndoing(true);

    try {
      const response = await fetch("/api/admin/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "undo",
          rowNumber: lastMarked.rowNumber,
          source: lastMarked.source
        })
      });
      const data = (await response.json()) as AttendanceResponse;

      setMessage(data.message || "Attendance mark removed.");
      setIsSuccess(response.ok);

      if (response.ok) {
        setLastMarked(null);
        router.refresh();
      }
    } catch {
      setMessage("Unable to undo attendance. Please try again.");
    } finally {
      setIsUndoing(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Attendance</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Verify and mark physical attendance at counter
            </p>
          </div>
          <Badge variant="outline" className="gap-1.5 tabular-nums">
            <CheckCircle2 className="h-3 w-3 shrink-0" />
            {attendedCount}/{totalCount}
          </Badge>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="attendanceMatric" className="text-xs font-medium">
              Name or Matric Number
            </Label>
            <div className="relative">
              <Input
                id="attendanceMatric"
                value={query}
                onBlur={() => window.setTimeout(() => setShowSuggestions(false), 120)}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSelectedParticipant(null);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                className="h-10 font-medium"
                placeholder="Type to search..."
                disabled={isSubmitting}
                autoComplete="off"
              />
              {showSuggestions && suggestions.length > 0 ? (
                <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-border bg-card p-0.5 shadow-lg">
                  {suggestions.map((participant) => (
                    <button
                      key={`${participant.source}-${participant.rowNumber}-${participant.matric_no}`}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => selectParticipant(participant)}
                      className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted/60"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-foreground">
                          {participant.student_name || "Unnamed"}
                        </span>
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {participant.sourceLabel}
                        </span>
                      </span>
                      <code className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-foreground">
                        {participant.matric_no || "—"}
                      </code>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <Button type="submit" className="w-full h-10" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <SearchCheck />
                Mark Attended
              </>
            )}
          </Button>
        </form>

        {/* Last marked */}
        {lastMarked ? (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-emerald-500/8 px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300 truncate">
                {lastMarked.student_name}
              </p>
              <p className="text-[11px] text-emerald-700/70 dark:text-emerald-300/70">
                {lastMarked.matric_no || "—"} · {lastMarked.sourceLabel}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 shrink-0 border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300"
              disabled={isUndoing || isSubmitting}
              onClick={handleUndo}
            >
              {isUndoing ? <Loader2 className="animate-spin" /> : <RotateCcw />}
              Undo
            </Button>
          </div>
        ) : null}

        {/* Message */}
        {message ? (
          <div
            className={`mt-3 rounded-md px-3 py-2 text-xs font-medium ${
              isSuccess
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "bg-red-500/10 text-red-700 dark:text-red-300"
            }`}
          >
            {message}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
