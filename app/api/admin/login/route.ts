import { NextRequest, NextResponse } from "next/server";
import { auditLog } from "@/lib/auditLog";
import {
  applyRateLimit,
  clearLoginFailures,
  isLoginTemporarilyLocked,
  registerLoginFailure
} from "@/lib/apiSecurity";
import { ADMIN_COOKIE_NAME, adminCookieOptions, createAdminToken, isAdminPassword } from "@/lib/auth";
import { getClientIp } from "@/lib/rateLimit";
import { requireSameOrigin } from "@/lib/requestSecurity";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const forbidden = requireSameOrigin(request);
  if (forbidden) return forbidden;

  const ip = getClientIp(request);
  const limited = await applyRateLimit(`admin-login:${ip}`, 10, 15 * 60 * 1000);
  if (limited) return limited;
  if (isLoginTemporarilyLocked(`admin-login-fail:${ip}`)) {
    return NextResponse.json(
      { message: "Too many failed login attempts. Please try again in 15 minutes." },
      { status: 429, headers: { "Retry-After": "900" } }
    );
  }

  const formData = await request.formData();
  const password = formData.get("password");

  if (typeof password !== "string" || !isAdminPassword(password)) {
    registerLoginFailure(`admin-login-fail:${ip}`);
    await auditLog({ event: "ADMIN_LOGIN_FAILED", request });
    return NextResponse.redirect(new URL("/admin/login?error=1", request.url), 303);
  }

  clearLoginFailures(`admin-login-fail:${ip}`);
  await auditLog({ event: "ADMIN_LOGIN_SUCCESS", request });
  const response = NextResponse.redirect(new URL("/admin", request.url), 303);
  response.cookies.set(ADMIN_COOKIE_NAME, createAdminToken(), adminCookieOptions);
  return response;
}
