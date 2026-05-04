import { NextRequest, NextResponse } from "next/server";
import { auditLog } from "@/lib/auditLog";
import { getAdminSession } from "@/lib/auth";
import { updateClaimSettings } from "@/lib/googleSheets";
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

  const body = (await request.json()) as { claimStatus?: string };
  const claimStatus = body.claimStatus?.toUpperCase();

  if (claimStatus !== "OPEN" && claimStatus !== "CLOSED") {
    return NextResponse.json({ message: "Invalid claim status." }, { status: 400 });
  }

  const settings = await updateClaimSettings(claimStatus as ClaimStatus);
  await auditLog({
    event: "CLAIM_STATUS_UPDATED",
    request,
    metadata: { claimStatus }
  });
  return NextResponse.json(settings);
}
