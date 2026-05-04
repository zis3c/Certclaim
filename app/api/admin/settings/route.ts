import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { getClaimSettings } from "@/lib/googleSheets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const isAuthed = await getAdminSession();
  if (!isAuthed) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const settings = await getClaimSettings();
  return NextResponse.json(settings);
}
