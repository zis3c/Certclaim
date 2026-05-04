import { NextRequest, NextResponse } from "next/server";
import { auditLog } from "@/lib/auditLog";
import { ADMIN_COOKIE_NAME, adminCookieOptions, createAdminToken, isAdminPassword } from "@/lib/auth";
import { getClientIp, rateLimit } from "@/lib/rateLimit";
import { requireSameOrigin } from "@/lib/requestSecurity";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const forbidden = requireSameOrigin(request);
  if (forbidden) return forbidden;

  const ip = getClientIp(request);
  const limited = await rateLimit({
    key: `admin-login:${ip}`,
    limit: 5,
    windowMs: 15 * 60 * 1000
  });
  if (limited) return limited;

  const formData = await request.formData();
  const password = formData.get("password");

  if (typeof password !== "string" || !isAdminPassword(password)) {
    await auditLog({ event: "ADMIN_LOGIN_FAILED", request });
    return NextResponse.redirect(new URL("/admin/login?error=1", request.url));
  }

  await auditLog({ event: "ADMIN_LOGIN_SUCCESS", request });
  const response = NextResponse.redirect(new URL("/admin", request.url));
  response.cookies.set(ADMIN_COOKIE_NAME, createAdminToken(), adminCookieOptions);
  return response;
}
