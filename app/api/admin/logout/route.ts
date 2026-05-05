import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit } from "@/lib/apiSecurity";
import { auditLog } from "@/lib/auditLog";
import { ADMIN_COOKIE_NAME, getAdminSession } from "@/lib/auth";
import { getClientIp } from "@/lib/rateLimit";
import { requireSameOrigin } from "@/lib/requestSecurity";

export async function POST(request: NextRequest) {
  const forbidden = requireSameOrigin(request);
  if (forbidden) return forbidden;

  const isAuthed = await getAdminSession();
  if (!isAuthed) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const ip = getClientIp(request);
  const limited = await applyRateLimit(`admin-logout:${ip}`, 30, 60 * 1000);
  if (limited) return limited;

  await auditLog({ event: "ADMIN_LOGOUT", request });
  const response = NextResponse.redirect(new URL("/admin/login", request.url), 303);
  response.cookies.delete(ADMIN_COOKIE_NAME);
  return response;
}
