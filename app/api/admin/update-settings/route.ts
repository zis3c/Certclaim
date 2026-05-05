import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit, parseJsonBody, publicServerError } from "@/lib/apiSecurity";
import { auditLog } from "@/lib/auditLog";
import { getAdminSession } from "@/lib/auth";
import { updateClaimSettings } from "@/lib/googleSheets";
import { getClientIp } from "@/lib/rateLimit";
import { requireSameOrigin } from "@/lib/requestSecurity";
import type { ClaimStatus } from "@/types/participant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const forbidden = requireSameOrigin(request);
  if (forbidden) return forbidden;

  const isAuthed = await getAdminSession();
  if (!isAuthed) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const ip = getClientIp(request);
  const limited = await applyRateLimit(`admin-update-settings:${ip}`, 20, 60 * 1000);
  if (limited) return limited;

  const parsed = await parseJsonBody<{ claimStatus?: string }>(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;
  const claimStatus = body.claimStatus?.toUpperCase();

  if (claimStatus !== "OPEN" && claimStatus !== "CLOSED") {
    return NextResponse.json({ message: "Invalid claim status." }, { status: 400 });
  }

  try {
    const settings = await updateClaimSettings(claimStatus as ClaimStatus);
    await auditLog({
      event: "CLAIM_STATUS_UPDATED",
      request,
      metadata: { claimStatus }
    });
    return NextResponse.json(settings);
  } catch (error) {
    console.error("admin update-settings failed", error);
    return publicServerError();
  }
}
