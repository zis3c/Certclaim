"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ElementType } from "react";
import {
  BarChart3,
  FileSpreadsheet,
  QrCode,
  Settings2,
  UserCheck
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: ElementType;
};

const navItems: NavItem[] = [
  { href: "/admin/overview", label: "Overview", icon: BarChart3 },
  { href: "/admin/recipients", label: "Recipients", icon: FileSpreadsheet },
  { href: "/admin/attendance", label: "Attendance", icon: UserCheck },
  { href: "/admin/access", label: "Claim Access", icon: QrCode },
  { href: "/admin/settings", label: "Settings", icon: Settings2 }
];

type AdminTopNavProps = {
  compact?: boolean;
};

export default function AdminTopNav({ compact = false }: AdminTopNavProps) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "md:overflow-visible",
        compact ? "overflow-x-auto pb-1 md:pb-0" : "overflow-visible"
      )}
      aria-label="Admin sections"
    >
      <div
        className={cn(
          "flex gap-1",
          compact
            ? "min-w-max items-center md:min-w-0 md:flex-col md:items-stretch"
            : "flex-col"
        )}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition-colors sm:text-sm",
                compact ? "md:w-full" : "w-full",
                isActive
                  ? "border-primary/45 bg-primary text-primary-foreground"
                  : "border-border/70 bg-card/60 text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
