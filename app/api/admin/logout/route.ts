import { NextRequest, NextResponse } from "next/server";
import { auditLog } from "@/lib/auditLog";
import { ADMIN_COOKIE_NAME } from "@/lib/auth";
import { requireSameOrigin } from "@/lib/requestSecurity";

export async function POST(request: NextRequest) {
  const forbidden = requireSameOrigin(request);
  if (forbidden) return forbidden;

  await auditLog({ event: "ADMIN_LOGOUT", request });
  const response = NextResponse.redirect(new URL("/admin/login", request.url));
  response.cookies.delete(ADMIN_COOKIE_NAME);
  return response;
}
