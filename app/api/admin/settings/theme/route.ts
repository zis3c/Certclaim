import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit, parseJsonBody, publicServerError } from "@/lib/apiSecurity";
import { auditLog } from "@/lib/auditLog";
import { getAdminSession } from "@/lib/auth";
import { DEFAULT_CLAIM_TITLE, normalizeClaimTitle } from "@/lib/claimTheme";
import { getClaimSettings, updateClaimThemeSettings } from "@/lib/googleSheets";
import { getClientIp } from "@/lib/rateLimit";
import { requireSameOrigin } from "@/lib/requestSecurity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_PRIMARY_COLOR = "#2563eb";
const CUSTOM_PRIMARY_COLOR = "#0ea5a4";
const BRAND_MODES = ["default", "custom"] as const;
type BrandMode = (typeof BRAND_MODES)[number];

function normalizeColor(input: string) {
  const value = input.trim();
  return /^#([0-9a-fA-F]{6})$/.test(value) ? value.toLowerCase() : null;
}

function normalizeBrandMode(input: string | undefined): BrandMode {
  return input === "custom" ? "custom" : "default";
}

export async function GET() {
  const isAuthed = await getAdminSession();
  if (!isAuthed) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const settings = await getClaimSettings();
  const brandMode = normalizeBrandMode(settings.brandMode);
  const primaryColor = normalizeColor(settings.primaryColor);

  return NextResponse.json({
    brandMode,
    primaryColor: brandMode === "default" ? DEFAULT_PRIMARY_COLOR : primaryColor || CUSTOM_PRIMARY_COLOR,
    defaultPrimaryColor: DEFAULT_PRIMARY_COLOR,
    claimTitle: normalizeClaimTitle(settings.claimTitle),
    defaultClaimTitle: DEFAULT_CLAIM_TITLE
  });
}

type ThemeBody = {
  brandMode?: string;
  primaryColor?: string;
  claimTitle?: string;
};

export async function POST(request: NextRequest) {
  const forbidden = requireSameOrigin(request);
  if (forbidden) return forbidden;

  const isAuthed = await getAdminSession();
  if (!isAuthed) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const ip = getClientIp(request);
  const limited = await applyRateLimit(`admin-settings-theme:${ip}`, 20, 60 * 1000);
  if (limited) return limited;

  const parsed = await parseJsonBody<ThemeBody>(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;
  const brandMode = normalizeBrandMode(body.brandMode);
  if (brandMode === "custom" && typeof body.primaryColor !== "string") {
    return NextResponse.json(
      { message: "Invalid color payload." },
      { status: 400 }
    );
  }

  const color = brandMode === "default"
    ? DEFAULT_PRIMARY_COLOR
    : normalizeColor(body.primaryColor || "");
  if (brandMode === "custom" && !color) {
    return NextResponse.json(
      { message: "Color must be 6-digit HEX (example: #0ea5a4)." },
      { status: 400 }
    );
  }
  const claimTitle = normalizeClaimTitle(body.claimTitle);

  try {
    await updateClaimThemeSettings({
      brandMode,
      primaryColor: color || DEFAULT_PRIMARY_COLOR,
      claimTitle
    });
    await auditLog({
      event: "THEME_UPDATED",
      request,
      metadata: {
        brandMode,
        primaryColor: color || DEFAULT_PRIMARY_COLOR,
        claimTitle
      }
    });
    return NextResponse.json({
      message: "Claim page theme updated.",
      brandMode,
      primaryColor: color || DEFAULT_PRIMARY_COLOR,
      defaultPrimaryColor: DEFAULT_PRIMARY_COLOR,
      claimTitle,
      defaultClaimTitle: DEFAULT_CLAIM_TITLE,
      restartRequired: false
    });
  } catch (error) {
    console.error("admin settings theme failed", error);
    return publicServerError();
  }
}
