import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";

const DEFAULT_JSON_LIMIT_BYTES = 8 * 1024;
const loginFailures = new Map<string, { count: number; firstFailureAt: number; lockUntil: number }>();

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ message }, { status });
}

export function publicServerError() {
  return jsonError("Unable to process request right now.", 500);
}

export async function parseJsonBody<T>(
  request: NextRequest,
  limitBytes = DEFAULT_JSON_LIMIT_BYTES
) {
  const lengthHeader = request.headers.get("content-length");
  if (lengthHeader) {
    const contentLength = Number(lengthHeader);
    if (!Number.isFinite(contentLength) || contentLength > limitBytes) {
      return { ok: false as const, response: jsonError("Payload too large.", 413) };
    }
  }

  try {
    const body = (await request.json()) as T;
    return { ok: true as const, body };
  } catch {
    return { ok: false as const, response: jsonError("Invalid JSON payload.", 400) };
  }
}

export async function applyRateLimit(
  key: string,
  limit: number,
  windowMs: number
) {
  return rateLimit({ key, limit, windowMs });
}

export function isLoginTemporarilyLocked(key: string, now = Date.now()) {
  const state = loginFailures.get(key);
  if (!state) return false;
  if (state.lockUntil > now) return true;
  if (now - state.firstFailureAt > 15 * 60 * 1000) {
    loginFailures.delete(key);
    return false;
  }
  return false;
}

export function registerLoginFailure(key: string, now = Date.now()) {
  const current = loginFailures.get(key);
  if (!current || now - current.firstFailureAt > 15 * 60 * 1000) {
    loginFailures.set(key, { count: 1, firstFailureAt: now, lockUntil: 0 });
    return;
  }

  const count = current.count + 1;
  const shouldLock = count >= 5;
  loginFailures.set(key, {
    count,
    firstFailureAt: current.firstFailureAt,
    lockUntil: shouldLock ? now + 15 * 60 * 1000 : current.lockUntil
  });
}

export function clearLoginFailures(key: string) {
  loginFailures.delete(key);
}
