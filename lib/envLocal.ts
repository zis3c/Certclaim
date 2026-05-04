import { promises as fs } from "fs";
import path from "path";

const ENV_FILE_NAME = ".env.local";
const ENV_FILE_PATH = path.join(process.cwd(), ENV_FILE_NAME);

const PRIVATE_KEY_KEYS = new Set([
  "PARTICIPANT_GOOGLE_PRIVATE_KEY",
  "COMMITTEE_GOOGLE_PRIVATE_KEY"
]);

export const MANAGED_ENV_KEYS = [
  "PARTICIPANT_GOOGLE_SHEETS_ID",
  "PARTICIPANT_GOOGLE_SHEET_NAME",
  "PARTICIPANT_GOOGLE_SERVICE_ACCOUNT_EMAIL",
  "PARTICIPANT_GOOGLE_PRIVATE_KEY",
  "COMMITTEE_GOOGLE_SHEETS_ID",
  "COMMITTEE_GOOGLE_SHEET_NAME",
  "COMMITTEE_GOOGLE_SERVICE_ACCOUNT_EMAIL",
  "COMMITTEE_GOOGLE_PRIVATE_KEY",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_BRAND_MODE",
  "NEXT_PUBLIC_PRIMARY_COLOR",
  "NEXT_PUBLIC_CLAIM_TITLE",
  "ADMIN_PASSWORD",
  "ADMIN_PASSWORD_HASH",
  "ADMIN_SESSION_SECRET"
] as const;

export type ManagedEnvKey = (typeof MANAGED_ENV_KEYS)[number];

function decodeEnvValue(rawValue: string) {
  const trimmed = rawValue.trim();
  if (
    trimmed.length >= 2 &&
    trimmed.startsWith("\"") &&
    trimmed.endsWith("\"")
  ) {
    const inner = trimmed.slice(1, -1);
    return inner
      .replace(/\\\\/g, "\\")
      .replace(/\\"/g, "\"")
      .replace(/\\n/g, "\n");
  }

  return trimmed;
}

function encodeEnvValue(key: string, value: string) {
  const normalized = value.replace(/\r\n/g, "\n");
  const escaped = normalized
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/"/g, '\\"');

  if (PRIVATE_KEY_KEYS.has(key)) {
    return `"${escaped}"`;
  }

  if (normalized === "") {
    return "";
  }

  if (/[\s#"'`]/.test(normalized)) {
    return `"${escaped}"`;
  }

  return normalized;
}

async function readEnvLines() {
  try {
    const content = await fs.readFile(ENV_FILE_PATH, "utf8");
    return content.split(/\r?\n/);
  } catch {
    return [];
  }
}

export async function readManagedEnvValues() {
  const lines = await readEnvLines();
  const fileMap = new Map<string, string>();

  for (const line of lines) {
    if (!line || line.trim().startsWith("#")) continue;
    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) continue;
    const key = line.slice(0, separatorIndex).trim();
    const value = decodeEnvValue(line.slice(separatorIndex + 1));
    fileMap.set(key, value);
  }

  const values: Record<string, string> = {};
  for (const key of MANAGED_ENV_KEYS) {
    if (fileMap.has(key)) {
      values[key] = fileMap.get(key) || "";
      continue;
    }
    values[key] = process.env[key] || "";
  }

  return values as Record<ManagedEnvKey, string>;
}

export async function updateManagedEnvValues(
  updates: Partial<Record<ManagedEnvKey, string>>
) {
  const lines = await readEnvLines();
  const nextLines = [...lines];

  for (const [key, value] of Object.entries(updates)) {
    if (typeof value !== "string") continue;
    const encoded = encodeEnvValue(key, value);
    const envLine = `${key}=${encoded}`;
    const lineIndex = nextLines.findIndex((line) =>
      line.startsWith(`${key}=`)
    );

    if (lineIndex >= 0) {
      nextLines[lineIndex] = envLine;
    } else {
      nextLines.push(envLine);
    }

    const normalized = value.replace(/\r\n/g, "\n");
    process.env[key] = PRIVATE_KEY_KEYS.has(key)
      ? normalized.replace(/\n/g, "\\n")
      : normalized;
  }

  const output = `${nextLines.join("\n").replace(/\n*$/, "")}\n`;
  await fs.writeFile(ENV_FILE_PATH, output, "utf8");
}

export function isPrivateKeyKey(key: string) {
  return PRIVATE_KEY_KEYS.has(key);
}
