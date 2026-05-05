import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit, parseJsonBody, publicServerError } from "@/lib/apiSecurity";
import { auditLog } from "@/lib/auditLog";
import {
  ADMIN_COOKIE_NAME,
  adminCookieOptions,
  createAdminPasswordHash,
  createAdminToken,
  getAdminSession,
  isAdminPassword
} from "@/lib/auth";
import { updateManagedEnvValues } from "@/lib/envLocal";
import { getClientIp } from "@/lib/rateLimit";
import { requireSameOrigin } from "@/lib/requestSecurity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChangePasswordBody = {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
};

export async function POST(request: NextRequest) {
  const forbidden = requireSameOrigin(request);
  if (forbidden) return forbidden;

  const isAuthed = await getAdminSession();
  if (!isAuthed) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const ip = getClientIp(request);
  const limited = await applyRateLimit(`admin-settings-password:${ip}`, 10, 60 * 1000);
  if (limited) return limited;

  const parsed = await parseJsonBody<ChangePasswordBody>(request, 6 * 1024);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;
  const currentPassword = body.currentPassword || "";
  const newPassword = body.newPassword || "";
  const confirmPassword = body.confirmPassword || "";

  if (!isAdminPassword(currentPassword)) {
    return NextResponse.json(
      { message: "Current password is incorrect." },
      { status: 400 }
    );
  }

  if (newPassword.length < 12) {
    return NextResponse.json(
      { message: "New password must be at least 12 characters." },
      { status: 400 }
    );
  }

  if (newPassword !== confirmPassword) {
    return NextResponse.json(
      { message: "New password and confirmation do not match." },
      { status: 400 }
    );
  }

  try {
    await updateManagedEnvValues({
      ADMIN_PASSWORD_HASH: createAdminPasswordHash(newPassword),
      ADMIN_PASSWORD: ""
    });
    await auditLog({ event: "ADMIN_PASSWORD_CHANGED", request });

    const response = NextResponse.json({
      message: "Admin password updated."
    });
    response.cookies.set(ADMIN_COOKIE_NAME, createAdminToken(), adminCookieOptions);
    return response;
  } catch (error) {
    console.error("admin settings password failed", error);
    return publicServerError();
  }
}
