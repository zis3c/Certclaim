"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, AlertTriangle, Info } from "lucide-react";

export function Toast({ message }: { message: string }) {
  const [visible, setVisible] = useState("");
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (!message) {
      setIsExiting(true);
      const timer = setTimeout(() => {
        setVisible("");
        setIsExiting(false);
      }, 250);
      return () => clearTimeout(timer);
    }

    const [text] = message.split("|");
    setVisible(text);
    setIsExiting(false);

    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => {
        setVisible("");
        setIsExiting(false);
      }, 250);
    }, 2800);

    return () => clearTimeout(timer);
  }, [message]);

  if (!visible && !isExiting) return null;

  const normalized = visible.trim();
  const isErr = normalized.startsWith("[err]");
  const isOk = normalized.startsWith("[ok]");
  const isWarn = normalized.startsWith("[warn]");
  const text = normalized.replace(/^\[(err|ok|warn)\]\s*/i, "");

  const Icon = isErr ? AlertCircle : isOk ? CheckCircle2 : isWarn ? AlertTriangle : Info;

  return (
    <div
      className={cn(
        "fixed right-4 top-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm items-start gap-3 overflow-hidden rounded-xl border p-4 shadow-lg backdrop-blur-md sm:w-full",
        isExiting ? "animate-slide-out" : "animate-slide-in",
        isErr && "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-200",
        isOk && "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200",
        isWarn && "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200",
        !isErr && !isOk && !isWarn && "border-border bg-card/90 text-foreground"
      )}
    >
      <Icon
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0",
          isErr && "text-red-700 dark:text-red-300",
          isOk && "text-emerald-700 dark:text-emerald-300",
          isWarn && "text-amber-700 dark:text-amber-300",
          !isErr && !isOk && !isWarn && "text-primary"
        )}
      />
      <p className="text-sm font-medium leading-relaxed">{text}</p>

      {/* Auto-dismiss progress bar */}
      <div className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden">
        <div
          className={cn(
            "h-full animate-progress-shrink",
            isErr && "bg-red-500/55 dark:bg-red-400/55",
            isOk && "bg-emerald-500/55 dark:bg-emerald-400/55",
            isWarn && "bg-amber-500/55 dark:bg-amber-400/55",
            !isErr && !isOk && !isWarn && "bg-primary/50"
          )}
        />
      </div>
    </div>
  );
}
