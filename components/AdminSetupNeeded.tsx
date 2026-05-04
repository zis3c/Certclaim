import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AlertTriangle, Settings2 } from "lucide-react";

type AdminSetupNeededProps = {
  message: string;
};

export default function AdminSetupNeeded({ message }: AdminSetupNeededProps) {
  return (
    <section className="surface-card border-amber-500/35 bg-amber-500/10 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-700 dark:text-amber-300" />
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">
              Setup Needed
            </p>
          </div>
          <h2 className="mt-2 text-xl font-bold text-amber-900 dark:text-amber-100">
            Google Sheets is not connected yet
          </h2>
          <p className="mt-2 text-sm leading-6 text-amber-800 dark:text-amber-200/85">
            {message}
          </p>
        </div>
        <Link
          href="/admin/settings"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "border-amber-500/40 bg-amber-500/8 text-amber-800 hover:bg-amber-500/15 dark:text-amber-200"
          )}
        >
          <Settings2 className="h-4 w-4" />
          Open Settings
        </Link>
      </div>
    </section>
  );
}
