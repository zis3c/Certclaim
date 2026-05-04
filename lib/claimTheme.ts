import type { CSSProperties } from "react";

const DEFAULT_PRIMARY_COLOR = "#2563eb";
const CUSTOM_PRIMARY_COLOR = "#0ea5a4";

export type Theme = "dark" | "light";
export type BrandMode = "default" | "custom";

export function getClaimBrandConfig() {
  const brandMode: BrandMode =
    process.env.NEXT_PUBLIC_BRAND_MODE === "custom" ? "custom" : "default";
  const primaryColor = normalizeHex(
    process.env.NEXT_PUBLIC_PRIMARY_COLOR,
    brandMode === "custom" ? CUSTOM_PRIMARY_COLOR : DEFAULT_PRIMARY_COLOR
  );

  return { brandMode, primaryColor };
}

function normalizeHex(input: string | undefined, fallback: string) {
  const value = input?.trim();
  return value && /^#([0-9a-fA-F]{6})$/.test(value) ? value : fallback;
}

function hexToRgb(hex: string) {
  const value = hex.replace("#", "");
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16)
  };
}

function mixHex(a: string, b: string, amount: number) {
  const first = hexToRgb(a);
  const second = hexToRgb(b);
  const mix = (x: number, y: number) => Math.round(x * (1 - amount) + y * amount);
  const toHex = (value: number) => value.toString(16).padStart(2, "0");
  return `#${toHex(mix(first.r, second.r))}${toHex(mix(first.g, second.g))}${toHex(mix(first.b, second.b))}`;
}

export function getClaimBrandStyle(
  theme: Theme,
  mode: BrandMode,
  primary: string
): CSSProperties {
  if (mode === "default") {
    return {
      "--brand-mode": "default",
      "--primary": DEFAULT_PRIMARY_COLOR,
      "--ring": "#3b82f6",
      "--primary-foreground": "#ffffff",
      "--background": theme === "light" ? "#f8fafc" : "#09090b",
      "--foreground": theme === "light" ? "#111827" : "#f9fafb",
      "--card": theme === "light" ? "#ffffff" : "#18181b",
      "--card-foreground": theme === "light" ? "#111827" : "#f9fafb",
      "--secondary": theme === "light" ? "#e5e7eb" : "#27272a",
      "--secondary-foreground": theme === "light" ? "#111827" : "#f4f4f5",
      "--muted": theme === "light" ? "#f3f4f6" : "#27272a",
      "--muted-foreground": theme === "light" ? "#6b7280" : "#a1a1aa",
      "--accent": theme === "light" ? "#e5e7eb" : "#3f3f46",
      "--accent-foreground": theme === "light" ? "#111827" : "#ffffff",
      "--border": theme === "light" ? "#d1d5db" : "#3f3f46",
      "--input": theme === "light" ? "#d1d5db" : "#52525b",
      "--logo-paper": theme === "light" ? "#ffffff" : "#f8fafc",
      "--logo-fold": theme === "light" ? "#e5e7eb" : "#d1d5db"
    } as CSSProperties;
  }

  const isDarkColor = (hex: string) => {
    const { r, g, b } = hexToRgb(hex);
    return r * 0.299 + g * 0.587 + b * 0.114 < 70;
  };

  const isLightColor = (hex: string) => {
    const { r, g, b } = hexToRgb(hex);
    return r * 0.299 + g * 0.587 + b * 0.114 > 190;
  };

  let safePrimary = primary;
  if (theme === "dark" && isDarkColor(primary)) {
    safePrimary = mixHex(primary, "#ffffff", 0.28);
  } else if (theme === "light" && isLightColor(primary)) {
    safePrimary = mixHex(primary, "#000000", 0.22);
  }

  const { r, g, b } = hexToRgb(safePrimary);
  const primaryLuminance = r * 0.299 + g * 0.587 + b * 0.114;
  const threshold = theme === "light" ? 140 : 160;
  const primaryForeground = primaryLuminance > threshold ? "#000000" : "#ffffff";

  return {
    "--brand-mode": "custom",
    "--primary": safePrimary,
    "--primary-rgb": `${r}, ${g}, ${b}`,
    "--ring": mixHex(safePrimary, "#ffffff", theme === "light" ? 0.18 : 0.45),
    "--primary-foreground": primaryForeground,
    "--background":
      theme === "light"
        ? mixHex("#ffffff", safePrimary, 0.06)
        : mixHex("#050507", safePrimary, 0.08),
    "--foreground": theme === "light" ? mixHex("#111827", safePrimary, 0.08) : "#f4f2f9",
    "--card": theme === "light" ? mixHex("#ffffff", safePrimary, 0.035) : mixHex("#0c0c12", safePrimary, 0.08),
    "--card-foreground": theme === "light" ? mixHex("#111827", safePrimary, 0.08) : "#f4f2f9",
    "--secondary": theme === "light" ? mixHex("#f3f4f6", safePrimary, 0.16) : mixHex("#111827", safePrimary, 0.18),
    "--secondary-foreground": theme === "light" ? mixHex("#111827", safePrimary, 0.12) : "#eef7f7",
    "--muted": theme === "light" ? mixHex("#f3f4f6", safePrimary, 0.12) : mixHex("#111827", safePrimary, 0.14),
    "--muted-foreground": theme === "light" ? mixHex("#6b7280", safePrimary, 0.12) : mixHex("#a1a1aa", safePrimary, 0.12),
    "--accent": theme === "light" ? mixHex("#e5e7eb", safePrimary, 0.18) : mixHex("#18181b", safePrimary, 0.22),
    "--accent-foreground": theme === "light" ? "#111827" : "#ffffff",
    "--border": theme === "light" ? mixHex("#d1d5db", safePrimary, 0.24) : mixHex("#3f3f46", safePrimary, 0.28),
    "--input": theme === "light" ? mixHex("#d1d5db", safePrimary, 0.22) : mixHex("#52525b", safePrimary, 0.24),
    "--logo-paper": theme === "light" ? "#ffffff" : "#f8fafc",
    "--logo-fold": mixHex("#ffffff", safePrimary, 0.18)
  } as CSSProperties;
}
