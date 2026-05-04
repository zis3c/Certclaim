import crypto from "crypto";
import { normalizeMatric } from "@/types/participant";

const claimTokenMaxAgeMs = 5 * 60 * 1000;

function getClaimTokenSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD_HASH || process.env.ADMIN_PASSWORD;
  if (secret) return secret;

  if (process.env.NODE_ENV === "production") {
    throw new Error("Missing ADMIN_SESSION_SECRET.");
  }

  return "development-secret";
}

function sign(payload: string) {
  return crypto
    .createHmac("sha256", getClaimTokenSecret())
    .update(payload)
    .digest("base64url");
}

function timingSafeEqual(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

export function createClaimToken(matricNo: string) {
  const value = `${normalizeMatric(matricNo)}.${Date.now()}`;
  return `${value}.${sign(value)}`;
}

export function verifyClaimToken(matricNo: string, token?: unknown) {
  if (typeof token !== "string") return false;

  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const normalizedMatric = normalizeMatric(matricNo);
  const tokenMatric = parts[0];
  const createdAt = Number(parts[1]);
  const signature = parts[2];
  const value = `${tokenMatric}.${parts[1]}`;

  if (tokenMatric !== normalizedMatric) return false;
  if (!Number.isFinite(createdAt)) return false;
  if (Date.now() - createdAt > claimTokenMaxAgeMs) return false;

  return timingSafeEqual(signature, sign(value));
}
