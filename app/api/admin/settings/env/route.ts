import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit, parseJsonBody, publicServerError } from "@/lib/apiSecurity";
import { auditLog } from "@/lib/auditLog";
import { getAdminSession } from "@/lib/auth";
import {
  isPrivateKeyKey,
  readManagedEnvValues,
  updateManagedEnvValues,
  type ManagedEnvKey
} from "@/lib/envLocal";
import { getClientIp } from "@/lib/rateLimit";
import { requireSameOrigin } from "@/lib/requestSecurity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ENV_EDITABLE_KEYS: ManagedEnvKey[] = [
  "PARTICIPANT_GOOGLE_SHEETS_ID",
  "PARTICIPANT_GOOGLE_SHEET_NAME",
  "PARTICIPANT_GOOGLE_SERVICE_ACCOUNT_EMAIL",
  "PARTICIPANT_GOOGLE_PRIVATE_KEY",
  "COMMITTEE_GOOGLE_SHEETS_ID",
  "COMMITTEE_GOOGLE_SHEET_NAME",
  "COMMITTEE_GOOGLE_SERVICE_ACCOUNT_EMAIL",
  "COMMITTEE_GOOGLE_PRIVATE_KEY",
  "NEXT_PUBLIC_APP_URL"
];

function toResponseEnv(values: Record<ManagedEnvKey, string>) {
  return {
    PARTICIPANT_GOOGLE_SHEETS_ID: values.PARTICIPANT_GOOGLE_SHEETS_ID,
    PARTICIPANT_GOOGLE_SHEET_NAME: values.PARTICIPANT_GOOGLE_SHEET_NAME,
    PARTICIPANT_GOOGLE_SERVICE_ACCOUNT_EMAIL:
      values.PARTICIPANT_GOOGLE_SERVICE_ACCOUNT_EMAIL,
    PARTICIPANT_GOOGLE_PRIVATE_KEY_SET:
      values.PARTICIPANT_GOOGLE_PRIVATE_KEY.trim().length > 0,
    COMMITTEE_GOOGLE_SHEETS_ID: values.COMMITTEE_GOOGLE_SHEETS_ID,
    COMMITTEE_GOOGLE_SHEET_NAME: values.COMMITTEE_GOOGLE_SHEET_NAME,
    COMMITTEE_GOOGLE_SERVICE_ACCOUNT_EMAIL:
      values.COMMITTEE_GOOGLE_SERVICE_ACCOUNT_EMAIL,
    COMMITTEE_GOOGLE_PRIVATE_KEY_SET:
      values.COMMITTEE_GOOGLE_PRIVATE_KEY.trim().length > 0,
    NEXT_PUBLIC_APP_URL: values.NEXT_PUBLIC_APP_URL
  };
}

export async function GET() {
  const isAuthed = await getAdminSession();
  if (!isAuthed) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const envValues = await readManagedEnvValues();
  return NextResponse.json({
    env: toResponseEnv(envValues)
  });
}

type UpdateEnvBody = {
  updates?: Partial<Record<ManagedEnvKey, string>>;
};

export async function POST(request: NextRequest) {
  const forbidden = requireSameOrigin(request);
  if (forbidden) return forbidden;

  const isAuthed = await getAdminSession();
  if (!isAuthed) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const ip = getClientIp(request);
  const limited = await applyRateLimit(`admin-settings-env:${ip}`, 10, 60 * 1000);
  if (limited) return limited;

  const parsed = await parseJsonBody<UpdateEnvBody>(request, 32 * 1024);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;
  const updates = body.updates || {};
  const validUpdates: Partial<Record<ManagedEnvKey, string>> = {};

  for (const [key, value] of Object.entries(updates)) {
    if (!ENV_EDITABLE_KEYS.includes(key as ManagedEnvKey)) continue;
    if (typeof value !== "string") continue;

    if (isPrivateKeyKey(key) && value.trim() === "") {
      continue;
    }

    validUpdates[key as ManagedEnvKey] = value.trim().slice(0, 4096);
  }

  if (Object.keys(validUpdates).length === 0) {
    return NextResponse.json(
      { message: "No valid env updates provided." },
      { status: 400 }
    );
  }

  try {
    await updateManagedEnvValues(validUpdates);
    await auditLog({
      event: "ENV_UPDATED",
      request,
      metadata: {
        keys: Object.keys(validUpdates).sort().join(",")
      }
    });
    const envValues = await readManagedEnvValues();

    return NextResponse.json({
      message: "Environment config updated.",
      env: toResponseEnv(envValues),
      restartRequired: true
    });
  } catch (error) {
    console.error("admin settings env failed", error);
    return publicServerError();
  }
}
