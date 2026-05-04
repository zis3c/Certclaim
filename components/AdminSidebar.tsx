"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ElementType } from "react";
import BrandLogo from "@/components/BrandLogo";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  LogOut,
  QrCode,
  Settings2,
  UserCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
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

export default function AdminSidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "shrink-0 border-b border-border bg-background/80 backdrop-blur-xl transition-all duration-300 md:border-b-0 md:border-r md:h-full",
        isCollapsed ? "md:w-[68px]" : "md:w-60"
      )}
    >
      <div className="flex h-full flex-col">
        {/* Brand header */}
        <div className="flex h-14 shrink-0 items-center border-b border-border/50 px-3">
          <div
            className={cn(
              "flex w-full items-center overflow-hidden rounded-md text-foreground",
              isCollapsed ? "justify-center p-2" : "justify-start gap-3 px-3 py-2"
            )}
          >
            <span 
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md ring-1"
              style={{ 
                backgroundColor: 'color-mix(in srgb, var(--primary), transparent 80%)',
                boxShadow: '0 0 0 1px color-mix(in srgb, var(--primary), transparent 65%)'
              }}
            >
              <BrandLogo className="h-full w-full p-1 text-primary" />
            </span>
            {!isCollapsed ? (
              <span className="min-w-0 space-y-0.5 whitespace-nowrap">
                <span className="block text-sm font-bold leading-tight tracking-tight">CertClaim</span>
                <span className="block text-[10px] leading-tight text-muted-foreground">Admin Panel</span>
              </span>
            ) : null}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-x-auto overflow-y-hidden px-2 py-3 md:overflow-x-hidden md:overflow-y-auto" aria-label="Admin sections">
          <div className="flex min-w-max gap-0.5 md:min-w-0 md:flex-col">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  title={isCollapsed ? item.label : undefined}
                  className={cn(
                    "flex h-9 items-center gap-3 rounded-lg px-3 text-[13px] transition-all duration-200",
                    isActive ? "font-bold" : "font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                    isCollapsed ? "md:justify-center md:px-0" : "md:justify-start"
                  )}
                  style={isActive ? {
                    backgroundColor: '#000000',
                    color: '#ffffff',
                    boxShadow: '0 0 0 1px color-mix(in srgb, #ffffff, transparent 82%), 0 10px 28px rgba(0, 0, 0, 0.28)'
                  } : {}}
                >
                  <Icon 
                    className={cn("h-4 w-4 shrink-0")} 
                    style={isActive ? { color: '#ffffff', strokeWidth: 3 } : {}}
                  />
                  <span className={cn("whitespace-nowrap", isCollapsed && "md:hidden")}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="hidden shrink-0 flex-col gap-1.5 border-t border-border/50 p-2 md:flex">
          <form action="/api/admin/logout" method="post">
            <Button
              type="submit"
              variant="ghost"
              size={isCollapsed ? "icon" : "default"}
              className={cn(
                "w-full text-muted-foreground hover:text-foreground h-9 text-[13px]",
                isCollapsed ? "px-0" : "justify-start gap-3"
              )}
              title={isCollapsed ? "Sign Out" : undefined}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {!isCollapsed ? <span>Sign Out</span> : null}
            </Button>
          </form>

          <div className={cn("flex border-t border-border/40 pt-1.5", isCollapsed ? "justify-center" : "justify-end")}>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setIsCollapsed((prev) => !prev)}
              className="h-8 w-8 shrink-0 rounded-md text-muted-foreground hover:text-foreground"
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
