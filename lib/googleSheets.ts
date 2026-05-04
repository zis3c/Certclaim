// import { google } from "googleapis"; // Removed static import for performance
import { unstable_noStore as noStore } from "next/cache";
import type { ClaimStatus, Participant, RecipientSource } from "@/types/participant";
import { normalizeMatric, recipientSourceLabel } from "@/types/participant";

// Fix for DEP0108: zlib.bytesRead is deprecated
if (typeof process !== "undefined" && typeof process.on === "function") {
  process.on("warning", (warning) => {
    if (warning.name === "DeprecationWarning" && (warning as any).code === "DEP0108") {
      return;
    }
  });
}

const SETTINGS_SHEET_NAME = "SETTINGS";
const CLAIM_STATUS_KEY = "CLAIM_STATUS";

// Performance Cache (60 seconds)
const CACHE_TTL = 60 * 1000;
let cachedParticipants: { data: Participant[]; timestamp: number } | null = null;
let cachedSettings: { data: { claimStatus: ClaimStatus }; timestamp: number } | null = null;
const ensuredSystemColumns = new Set<string>();

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

type SheetConfig = {
  source: RecipientSource;
  spreadsheetId: string;
  sheetName: string;
};

function getParticipantSheetConfig(): SheetConfig {
  return {
    source: "participant",
    spreadsheetId: getRequiredEnv("PARTICIPANT_GOOGLE_SHEETS_ID"),
    sheetName: process.env.PARTICIPANT_GOOGLE_SHEET_NAME || "Sheet1"
  };
}

function getCommitteeSheetConfig(): SheetConfig | null {
  const spreadsheetId = process.env.COMMITTEE_GOOGLE_SHEETS_ID;
  if (!spreadsheetId) return null;

  return {
    source: "committee",
    spreadsheetId,
    sheetName: process.env.COMMITTEE_GOOGLE_SHEET_NAME || "Sheet1"
  };
}

function getRecipientSheetConfigs() {
  return [getParticipantSheetConfig(), getCommitteeSheetConfig()].filter(
    (config): config is SheetConfig => Boolean(config)
  );
}

function getSheetConfig(source: RecipientSource) {
  const config = getRecipientSheetConfigs().find((item) => item.source === source);
  if (!config) {
    throw new Error(`Missing Google Sheet configuration for ${recipientSourceLabel(source)} records.`);
  }
  return config;
}

function getPrivateKey(source: RecipientSource = "participant") {
  const envName = source === "committee" ? "COMMITTEE_GOOGLE_PRIVATE_KEY" : "PARTICIPANT_GOOGLE_PRIVATE_KEY";
  return getRequiredEnv(envName).replace(/\\n/g, "\n");
}

function a1(sheetName: string, range: string) {
  return `'${sheetName.replace(/'/g, "''")}'!${range}`;
}

function rowValue(row: string[] | undefined, index: number) {
  return row?.[index]?.toString().trim() || "";
}

async function createSheetsClient(source: RecipientSource = "participant") {
  const emailEnv = source === "committee" ? "COMMITTEE_GOOGLE_SERVICE_ACCOUNT_EMAIL" : "PARTICIPANT_GOOGLE_SERVICE_ACCOUNT_EMAIL";
  
  // Dynamic import to speed up initial dev server startup
  const { google } = await import("googleapis");
  
  const auth = new google.auth.JWT({
    email: getRequiredEnv(emailEnv),
    key: getPrivateKey(source),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
  });

  return google.sheets({ version: "v4", auth });
}

type SheetsClient = Awaited<ReturnType<typeof createSheetsClient>>;
const sheetsClients = new Map<RecipientSource, Promise<SheetsClient>>();

function getSheetsClient(source: RecipientSource = "participant") {
  const cachedClient = sheetsClients.get(source);
  if (cachedClient) return cachedClient;

  const client = createSheetsClient(source);
  sheetsClients.set(source, client);
  return client;
}

export function invalidateParticipantsCache() {
  cachedParticipants = null;
}

async function ensureSystemColumns(config: SheetConfig) {
  const cacheKey = `${config.source}:${config.spreadsheetId}:${config.sheetName}`;
  if (ensuredSystemColumns.has(cacheKey)) {
    return;
  }

  const sheets = await getSheetsClient(config.source);

  const headerRes = await sheets.spreadsheets.values.get({
    spreadsheetId: config.spreadsheetId,
    range: a1(config.sheetName, "1:1")
  });

  const headers = headerRes.data.values?.[0] || [];
  const claimStatusColumn = config.source === "committee" ? "H" : "J";
  const claimedAtColumn = config.source === "committee" ? "I" : "K";
  const attendanceStatusColumn = config.source === "committee" ? "J" : "L";
  const attendedAtColumn = config.source === "committee" ? "K" : "M";
  const claimStatusIndex = config.source === "committee" ? 7 : 9;
  const claimedAtIndex = config.source === "committee" ? 8 : 10;
  const attendanceStatusIndex = config.source === "committee" ? 9 : 11;
  const attendedAtIndex = config.source === "committee" ? 10 : 12;

  if (!headers[claimStatusIndex]) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: config.spreadsheetId,
      range: a1(config.sheetName, `${claimStatusColumn}1`),
      valueInputOption: "RAW",
      requestBody: { values: [["CLAIM STATUS"]] }
    });
  }

  if (!headers[claimedAtIndex]) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: config.spreadsheetId,
      range: a1(config.sheetName, `${claimedAtColumn}1`),
      valueInputOption: "RAW",
      requestBody: { values: [["CLAIMED AT"]] }
    });
  }

  if (!headers[attendanceStatusIndex]) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: config.spreadsheetId,
      range: a1(config.sheetName, `${attendanceStatusColumn}1`),
      valueInputOption: "RAW",
      requestBody: { values: [["ATTENDANCE STATUS"]] }
    });
  }

  if (!headers[attendedAtIndex]) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: config.spreadsheetId,
      range: a1(config.sheetName, `${attendedAtColumn}1`),
      valueInputOption: "RAW",
      requestBody: { values: [["ATTENDED AT"]] }
    });
  }

  ensuredSystemColumns.add(cacheKey);
}

function mapParticipant(row: string[] | undefined, index: number, source: RecipientSource): Participant {
  return {
    source,
    sourceLabel: recipientSourceLabel(source),
    rowNumber: index + 2,
    email_address: rowValue(row, 0),
    timestamp: rowValue(row, 1),
    student_email: rowValue(row, 2),
    student_name: rowValue(row, 3),
    matric_no: rowValue(row, 4),
    student_course: rowValue(row, 5),
    payment_receipt: source === "committee" ? "" : rowValue(row, 6),
    certificate_status: source === "committee" ? rowValue(row, 6) : rowValue(row, 7),
    invoice_email: source === "committee" ? "" : rowValue(row, 8),
    claim_status: source === "committee" ? rowValue(row, 7) : rowValue(row, 9),
    claimed_at: source === "committee" ? rowValue(row, 8) : rowValue(row, 10),
    attendance_status: source === "committee" ? rowValue(row, 9) : rowValue(row, 11),
    attended_at: source === "committee" ? rowValue(row, 10) : rowValue(row, 12)
  };
}

export async function getParticipants() {
  noStore();
  
  // Return cached data if fresh
  if (cachedParticipants && Date.now() - cachedParticipants.timestamp < CACHE_TTL) {
    return cachedParticipants.data;
  }

  const configs = getRecipientSheetConfigs();

  const allRecipients = await Promise.all(
    configs.map(async (config) => {
      const sheets = await getSheetsClient(config.source);
      await ensureSystemColumns(config);

      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: config.spreadsheetId,
        range: a1(config.sheetName, "A:M")
      });

      const rows = (res.data.values || []) as string[][];
      return rows
        .slice(1)
        .map((row, index) => mapParticipant(row, index, config.source))
        .filter((participant) => participant.student_name || participant.matric_no);
    })
  );

  const results = allRecipients.flat();
  
  // Update cache
  cachedParticipants = { data: results, timestamp: Date.now() };
  
  return results;
}

export async function findParticipantByMatric(matricNo: string) {
  const normalizedMatric = normalizeMatric(matricNo);
  const participants = await getParticipants();

  const matches = participants.filter(
    (participant) => normalizeMatric(participant.matric_no) === normalizedMatric
  );

  if (matches.length > 1) {
    throw new Error("Multiple records use this matric number. Please contact the organizer.");
  }

  return matches[0] || null;
}

export async function findParticipantForAttendance(
  query: string,
  rowNumber?: number,
  source?: RecipientSource
) {
  const normalizedQuery = query.trim().toUpperCase();
  const participants = await getParticipants();

  if (rowNumber && source) {
    const participant = participants.find((item) => item.rowNumber === rowNumber && item.source === source);
    if (participant) return participant;
  }

  if (!normalizedQuery) return null;

  const matricMatch = participants.find(
    (participant) => normalizeMatric(participant.matric_no) === normalizedQuery
  );
  if (matricMatch) return matricMatch;

  const nameMatches = participants.filter(
    (participant) => participant.student_name.trim().toUpperCase() === normalizedQuery
  );

  if (nameMatches.length === 1) return nameMatches[0];
  if (nameMatches.length > 1) {
    throw new Error("Multiple students use this name. Please choose a suggested record or use matric number.");
  }

  const partialMatches = participants.filter((participant) => {
    const name = participant.student_name.trim().toUpperCase();
    const matric = normalizeMatric(participant.matric_no);
    return name.includes(normalizedQuery) || matric.includes(normalizedQuery);
  });

  if (partialMatches.length > 1) {
    throw new Error("Multiple students match this search. Please choose a suggested record.");
  }
  if (partialMatches.length === 1) {
    throw new Error("Please choose the suggested student before marking attendance.");
  }

  return null;
}

export async function markCertificateClaimed(participant: Pick<Participant, "rowNumber" | "source">) {
  noStore();
  const sheets = await getSheetsClient(participant.source);
  const config = getSheetConfig(participant.source);
  const claimedAt = new Date().toLocaleString("en-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId: config.spreadsheetId,
    range: a1(
      config.sheetName,
      config.source === "committee"
        ? `H${participant.rowNumber}:I${participant.rowNumber}`
        : `J${participant.rowNumber}:K${participant.rowNumber}`
    ),
    valueInputOption: "RAW",
    requestBody: { values: [["CLAIMED", claimedAt]] }
  });

  invalidateParticipantsCache();
  return claimedAt;
}

export async function markParticipantAttended(participant: Pick<Participant, "rowNumber" | "source">) {
  noStore();
  const sheets = await getSheetsClient(participant.source);
  const config = getSheetConfig(participant.source);
  const attendedAt = new Date().toLocaleString("en-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId: config.spreadsheetId,
    range: a1(
      config.sheetName,
      config.source === "committee"
        ? `J${participant.rowNumber}:K${participant.rowNumber}`
        : `L${participant.rowNumber}:M${participant.rowNumber}`
    ),
    valueInputOption: "RAW",
    requestBody: { values: [["ATTENDED", attendedAt]] }
  });

  invalidateParticipantsCache();
  return attendedAt;
}

export async function clearParticipantAttendance(participant: Pick<Participant, "rowNumber" | "source">) {
  noStore();
  const sheets = await getSheetsClient(participant.source);
  const config = getSheetConfig(participant.source);

  await sheets.spreadsheets.values.update({
    spreadsheetId: config.spreadsheetId,
    range: a1(
      config.sheetName,
      config.source === "committee"
        ? `J${participant.rowNumber}:K${participant.rowNumber}`
        : `L${participant.rowNumber}:M${participant.rowNumber}`
    ),
    valueInputOption: "RAW",
    requestBody: { values: [["", ""]] }
  });

  invalidateParticipantsCache();
}

export async function checkGoogleSheetsHealth() {
  noStore();
  const result: {
    participant: {
      ok: boolean;
      message: string;
      spreadsheetTitle?: string;
      targetSheet?: string;
      targetSheetExists?: boolean;
    };
    committee: {
      enabled: boolean;
      ok: boolean;
      message: string;
      spreadsheetTitle?: string;
      targetSheet?: string;
      targetSheetExists?: boolean;
    };
  } = {
    participant: {
      ok: false,
      message: "Not checked."
    },
    committee: {
      enabled: Boolean(process.env.COMMITTEE_GOOGLE_SHEETS_ID),
      ok: false,
      message: "Not checked."
    }
  };

  try {
    const participantConfig = getParticipantSheetConfig();
    const participantSheets = await getSheetsClient("participant");
    const participantMeta = await participantSheets.spreadsheets.get({
      spreadsheetId: participantConfig.spreadsheetId,
      fields: "properties.title,sheets(properties(title))"
    });
    const participantSheetTitles = (
      participantMeta.data.sheets || []
    ).map((sheet) => sheet.properties?.title || "");
    const participantSheetExists = participantSheetTitles.includes(
      participantConfig.sheetName
    );

    result.participant = {
      ok: true,
      message: participantSheetExists
        ? "Connected."
        : `Spreadsheet connected, but sheet '${participantConfig.sheetName}' not found.`,
      spreadsheetTitle: participantMeta.data.properties?.title || "",
      targetSheet: participantConfig.sheetName,
      targetSheetExists: participantSheetExists
    };
  } catch (error) {
    result.participant = {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to connect participant sheet."
    };
  }

  const committeeConfig = getCommitteeSheetConfig();
  if (!committeeConfig) {
    result.committee = {
      enabled: false,
      ok: false,
      message: "Disabled (COMMITTEE_GOOGLE_SHEETS_ID not set)."
    };
    return result;
  }

  try {
    const committeeSheets = await getSheetsClient("committee");
    const committeeMeta = await committeeSheets.spreadsheets.get({
      spreadsheetId: committeeConfig.spreadsheetId,
      fields: "properties.title,sheets(properties(title))"
    });
    const committeeSheetTitles = (
      committeeMeta.data.sheets || []
    ).map((sheet) => sheet.properties?.title || "");
    const committeeSheetExists = committeeSheetTitles.includes(
      committeeConfig.sheetName
    );

    result.committee = {
      enabled: true,
      ok: true,
      message: committeeSheetExists
        ? "Connected."
        : `Spreadsheet connected, but sheet '${committeeConfig.sheetName}' not found.`,
      spreadsheetTitle: committeeMeta.data.properties?.title || "",
      targetSheet: committeeConfig.sheetName,
      targetSheetExists: committeeSheetExists
    };
  } catch (error) {
    result.committee = {
      enabled: true,
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to connect committee sheet."
    };
  }

  return result;
}

async function ensureSettingsSheet() {
  const sheets = await getSheetsClient();
  const spreadsheetId = getRequiredEnv("PARTICIPANT_GOOGLE_SHEETS_ID");

  const metadata = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets(properties(title))"
  });

  const exists = metadata.data.sheets?.some(
    (sheet) => sheet.properties?.title === SETTINGS_SHEET_NAME
  );

  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: { title: SETTINGS_SHEET_NAME }
            }
          }
        ]
      }
    });
  }

  const settingsRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: a1(SETTINGS_SHEET_NAME, "A:B")
  });

  const rows = (settingsRes.data.values || []) as string[][];
  const hasClaimSetting = rows.some((row) => rowValue(row, 0) === CLAIM_STATUS_KEY);

  if (!rows.length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: a1(SETTINGS_SHEET_NAME, "A1:B2"),
      valueInputOption: "RAW",
      requestBody: {
        values: [
          ["SETTING", "VALUE"],
          [CLAIM_STATUS_KEY, "OPEN"]
        ]
      }
    });
  } else if (!hasClaimSetting) {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: a1(SETTINGS_SHEET_NAME, "A:B"),
      valueInputOption: "RAW",
      requestBody: { values: [[CLAIM_STATUS_KEY, "OPEN"]] }
    });
  }
}

export async function getClaimSettings(): Promise<{ claimStatus: ClaimStatus }> {
  noStore();

  // Return cached data if fresh
  if (cachedSettings && Date.now() - cachedSettings.timestamp < CACHE_TTL) {
    return cachedSettings.data;
  }

  await ensureSettingsSheet();

  const sheets = await getSheetsClient();
  const spreadsheetId = getRequiredEnv("PARTICIPANT_GOOGLE_SHEETS_ID");

  const settingsRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: a1(SETTINGS_SHEET_NAME, "A:B")
  });

  const rows = (settingsRes.data.values || []) as string[][];
  const settingRow = rows.find((row) => rowValue(row, 0) === CLAIM_STATUS_KEY);
  const value = rowValue(settingRow, 1).toUpperCase();

  const result = { claimStatus: (value === "CLOSED" ? "CLOSED" : "OPEN") as ClaimStatus };
  
  // Update cache
  cachedSettings = { data: result, timestamp: Date.now() };

  return result;
}

export async function updateClaimSettings(claimStatus: ClaimStatus) {
  noStore();
  await ensureSettingsSheet();

  const sheets = await getSheetsClient();
  const spreadsheetId = getRequiredEnv("PARTICIPANT_GOOGLE_SHEETS_ID");

  const settingsRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: a1(SETTINGS_SHEET_NAME, "A:B")
  });

  const rows = (settingsRes.data.values || []) as string[][];
  const rowIndex = rows.findIndex((row) => rowValue(row, 0) === CLAIM_STATUS_KEY);
  const rowNumber = rowIndex >= 0 ? rowIndex + 1 : rows.length + 1;

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: a1(SETTINGS_SHEET_NAME, `A${rowNumber}:B${rowNumber}`),
    valueInputOption: "RAW",
    requestBody: { values: [[CLAIM_STATUS_KEY, claimStatus]] }
  });

  // Invalidate cache on update
  cachedSettings = null;

  return { claimStatus };
}
