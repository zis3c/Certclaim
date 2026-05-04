import crypto from "crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE_NAME = "cert_admin_session";

const maxAgeSeconds = 60 * 60 * 12;

function getSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD_HASH || process.env.ADMIN_PASSWORD;
  if (secret) return secret;

  if (process.env.NODE_ENV === "production") {
    throw new Error("Missing ADMIN_SESSION_SECRET.");
  }

  return "development-secret";
}

function sign(value: string) {
  return crypto.createHmac("sha256", getSecret()).update(value).digest("hex");
}

function timingSafeEqual(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

const passwordHashPrefix = "pbkdf2_sha256";
const passwordHashIterations = 310000;

export function createAdminPasswordHash(password: string) {
  const salt = crypto.randomBytes(16).toString("base64url");
  const hash = crypto
    .pbkdf2Sync(password, salt, passwordHashIterations, 32, "sha256")
    .toString("base64url");

  return `${passwordHashPrefix}$${passwordHashIterations}$${salt}$${hash}`;
}

function verifyAdminPasswordHash(password: string, encodedHash: string) {
  const [algorithm, iterationsValue, salt, expectedHash] = encodedHash.split("$");
  const iterations = Number(iterationsValue);

  if (
    algorithm !== passwordHashPrefix ||
    !Number.isSafeInteger(iterations) ||
    iterations < 100000 ||
    !salt ||
    !expectedHash
  ) {
    return false;
  }

  const actualHash = crypto
    .pbkdf2Sync(password, salt, iterations, 32, "sha256")
    .toString("base64url");

  return timingSafeEqual(actualHash, expectedHash);
}

export function createAdminToken() {
  const value = `admin.${Date.now()}`;
  return `${value}.${sign(value)}`;
}

export function verifyAdminToken(token?: string) {
  if (!token) return false;

  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const value = `${parts[0]}.${parts[1]}`;
  const signature = parts[2];
  const createdAt = Number(parts[1]);

  if (!Number.isFinite(createdAt)) return false;
  if (Date.now() - createdAt > maxAgeSeconds * 1000) return false;

  return timingSafeEqual(signature, sign(value));
}

export async function getAdminSession() {
  const cookieStore = await cookies();
  return verifyAdminToken(cookieStore.get(ADMIN_COOKIE_NAME)?.value);
}

export function isAdminPassword(password: string) {
  const configuredHash = process.env.ADMIN_PASSWORD_HASH;
  if (configuredHash) {
    return verifyAdminPasswordHash(password, configuredHash);
  }

  const configuredPassword = process.env.ADMIN_PASSWORD;
  if (!configuredPassword) {
    return false;
  }

  return timingSafeEqual(password, configuredPassword);
}

export const adminCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: maxAgeSeconds
};
