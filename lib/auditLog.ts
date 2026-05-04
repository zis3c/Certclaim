import { promises as fs } from "fs";
import path from "path";
import { NextRequest } from "next/server";
import { getClientIp } from "@/lib/rateLimit";

type AuditMetadata = Record<string, string | number | boolean | null | undefined>;

type AuditEvent = {
  event: string;
  request?: NextRequest;
  metadata?: AuditMetadata;
};

const AUDIT_DIR = path.join(process.cwd(), "logs");
const AUDIT_FILE = path.join(AUDIT_DIR, "audit.log");

function sanitizeMetadata(metadata: AuditMetadata = {}) {
  return Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => {
      return (
        value === null ||
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
      );
    })
  );
}

export async function auditLog({ event, request, metadata }: AuditEvent) {
  try {
    await fs.mkdir(AUDIT_DIR, { recursive: true });

    const entry = {
      timestamp: new Date().toISOString(),
      event,
      ip: request ? getClientIp(request) : undefined,
      route: request ? new URL(request.url).pathname : undefined,
      metadata: sanitizeMetadata(metadata)
    };

    await fs.appendFile(AUDIT_FILE, `${JSON.stringify(entry)}\n`, "utf8");
  } catch (error) {
    console.error("Unable to write audit log.", error);
  }
}
