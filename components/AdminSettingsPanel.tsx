"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Eye, EyeOff, KeyRound, Palette, RefreshCw, Save,
  ShieldCheck, Unplug
} from "lucide-react";
import { cn } from "@/lib/utils";

type EnvPayload = {
  env: {
    PARTICIPANT_GOOGLE_SHEETS_ID: string;
    PARTICIPANT_GOOGLE_SHEET_NAME: string;
    PARTICIPANT_GOOGLE_SERVICE_ACCOUNT_EMAIL: string;
    PARTICIPANT_GOOGLE_PRIVATE_KEY_SET: boolean;
    COMMITTEE_GOOGLE_SHEETS_ID: string;
    COMMITTEE_GOOGLE_SHEET_NAME: string;
    COMMITTEE_GOOGLE_SERVICE_ACCOUNT_EMAIL: string;
    COMMITTEE_GOOGLE_PRIVATE_KEY_SET: boolean;
    NEXT_PUBLIC_APP_URL: string;
  };
};

type ThemePayload = {
  brandMode: "default" | "custom";
  primaryColor: string;
  defaultPrimaryColor: string;
  claimTitle: string;
  defaultClaimTitle: string;
};

type HealthPayload = {
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
};

type EnvFormState = {
  PARTICIPANT_GOOGLE_SHEETS_ID: string;
  PARTICIPANT_GOOGLE_SHEET_NAME: string;
  PARTICIPANT_GOOGLE_SERVICE_ACCOUNT_EMAIL: string;
  PARTICIPANT_GOOGLE_PRIVATE_KEY: string;
  COMMITTEE_GOOGLE_SHEETS_ID: string;
  COMMITTEE_GOOGLE_SHEET_NAME: string;
  COMMITTEE_GOOGLE_SERVICE_ACCOUNT_EMAIL: string;
  COMMITTEE_GOOGLE_PRIVATE_KEY: string;
  NEXT_PUBLIC_APP_URL: string;
};

type TabId = "password" | "theme" | "health" | "env";

const HEALTH_REFRESH_MS = 30000;

const initialEnvForm: EnvFormState = {
  PARTICIPANT_GOOGLE_SHEETS_ID: "",
  PARTICIPANT_GOOGLE_SHEET_NAME: "",
  PARTICIPANT_GOOGLE_SERVICE_ACCOUNT_EMAIL: "",
  PARTICIPANT_GOOGLE_PRIVATE_KEY: "",
  COMMITTEE_GOOGLE_SHEETS_ID: "",
  COMMITTEE_GOOGLE_SHEET_NAME: "",
  COMMITTEE_GOOGLE_SERVICE_ACCOUNT_EMAIL: "",
  COMMITTEE_GOOGLE_PRIVATE_KEY: "",
  NEXT_PUBLIC_APP_URL: ""
};

const tabs: { id: TabId; label: string }[] = [
  { id: "password", label: "Password" },
  { id: "theme", label: "Claim Theme" },
  { id: "health", label: "API Health" },
  { id: "env", label: "Environment" }
];

function maskedEnvValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "Missing";
  // Return black circles matching the length of the string like a password mask
  return "●".repeat(trimmed.length);
}

function MaskedEnvField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex h-9 items-center rounded-lg border border-border/50 bg-card/40 px-3 font-mono text-xs text-foreground">
        {maskedEnvValue(value)}
      </div>
    </div>
  );
}

export default function AdminSettingsPanel() {
  const [activeTab, setActiveTab] = useState<TabId>("password");
  const [envForm, setEnvForm] = useState<EnvFormState>(initialEnvForm);
  const [brandMode, setBrandMode] = useState<"default" | "custom">("default");
  const [themeColor, setThemeColor] = useState("#0ea5a4");
  const [claimTitle, setClaimTitle] = useState("Front End Web Design Essential");
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [participantKeyConfigured, setParticipantKeyConfigured] = useState(false);
  const [committeeKeyConfigured, setCommitteeKeyConfigured] = useState(false);
  const [showSecretInputs, setShowSecretInputs] = useState(false);
  const [autoHealthCheck, setAutoHealthCheck] = useState(true);
  const [lastHealthCheckedAt, setLastHealthCheckedAt] = useState<Date | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingEnv, setIsSavingEnv] = useState(false);
  const [isSavingTheme, setIsSavingTheme] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [restartHint, setRestartHint] = useState(false);

  function pushMessage(text: string, error = false) {
    setMessage(text);
    setIsError(error);
  }

  const loadEnvAndTheme = useCallback(async () => {
    const [envRes, themeRes] = await Promise.all([
      fetch("/api/admin/settings/env", { cache: "no-store" }),
      fetch("/api/admin/settings/theme", { cache: "no-store" })
    ]);
    if (!envRes.ok) throw new Error("Unable to load env config.");
    if (!themeRes.ok) throw new Error("Unable to load claim page theme config.");

    const envPayload = (await envRes.json()) as EnvPayload;
    const themePayload = (await themeRes.json()) as ThemePayload;

    setEnvForm((prev) => ({
      ...prev,
      PARTICIPANT_GOOGLE_SHEETS_ID: envPayload.env.PARTICIPANT_GOOGLE_SHEETS_ID || "",
      PARTICIPANT_GOOGLE_SHEET_NAME: envPayload.env.PARTICIPANT_GOOGLE_SHEET_NAME || "",
      PARTICIPANT_GOOGLE_SERVICE_ACCOUNT_EMAIL: envPayload.env.PARTICIPANT_GOOGLE_SERVICE_ACCOUNT_EMAIL || "",
      COMMITTEE_GOOGLE_SHEETS_ID: envPayload.env.COMMITTEE_GOOGLE_SHEETS_ID || "",
      COMMITTEE_GOOGLE_SHEET_NAME: envPayload.env.COMMITTEE_GOOGLE_SHEET_NAME || "",
      COMMITTEE_GOOGLE_SERVICE_ACCOUNT_EMAIL: envPayload.env.COMMITTEE_GOOGLE_SERVICE_ACCOUNT_EMAIL || "",
      NEXT_PUBLIC_APP_URL: envPayload.env.NEXT_PUBLIC_APP_URL || ""
    }));
    setParticipantKeyConfigured(envPayload.env.PARTICIPANT_GOOGLE_PRIVATE_KEY_SET);
    setCommitteeKeyConfigured(envPayload.env.COMMITTEE_GOOGLE_PRIVATE_KEY_SET);
    setBrandMode(themePayload.brandMode === "custom" ? "custom" : "default");
    setThemeColor(themePayload.primaryColor || themePayload.defaultPrimaryColor || "#2563eb");
    setClaimTitle(themePayload.claimTitle || themePayload.defaultClaimTitle || "Front End Web Design Essential");
  }, []);

  const runHealthCheck = useCallback(async () => {
    const response = await fetch("/api/admin/settings/health", { cache: "no-store" });
    if (!response.ok) throw new Error("Unable to check Google Sheets health.");
    const payload = (await response.json()) as HealthPayload;
    setHealth(payload);
    setLastHealthCheckedAt(new Date());
    return payload;
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await loadEnvAndTheme();
        await runHealthCheck();
      } catch (error) {
        if (!alive) return;
        pushMessage(error instanceof Error ? error.message : "Unable to load admin settings.", true);
      } finally {
        if (alive) setIsLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [loadEnvAndTheme, runHealthCheck]);

  useEffect(() => {
    if (!autoHealthCheck) return;
    const interval = window.setInterval(() => {
      void runHealthCheck().catch(() => {});
    }, HEALTH_REFRESH_MS);
    return () => window.clearInterval(interval);
  }, [autoHealthCheck, runHealthCheck]);

  const statusBadge = useMemo(() => {
    if (!health) return null;
    const allGood = health.participant.ok && (!health.committee.enabled || health.committee.ok);
    return allGood ? <Badge variant="success">Healthy</Badge> : <Badge variant="warning">Issue</Badge>;
  }, [health]);

  async function saveEnvSettings() {
    setIsSavingEnv(true);
    try {
      const response = await fetch("/api/admin/settings/env", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updates: {
            PARTICIPANT_GOOGLE_SHEETS_ID: envForm.PARTICIPANT_GOOGLE_SHEETS_ID,
            PARTICIPANT_GOOGLE_SHEET_NAME: envForm.PARTICIPANT_GOOGLE_SHEET_NAME,
            PARTICIPANT_GOOGLE_SERVICE_ACCOUNT_EMAIL: envForm.PARTICIPANT_GOOGLE_SERVICE_ACCOUNT_EMAIL,
            PARTICIPANT_GOOGLE_PRIVATE_KEY: envForm.PARTICIPANT_GOOGLE_PRIVATE_KEY,
            COMMITTEE_GOOGLE_SHEETS_ID: envForm.COMMITTEE_GOOGLE_SHEETS_ID,
            COMMITTEE_GOOGLE_SHEET_NAME: envForm.COMMITTEE_GOOGLE_SHEET_NAME,
            COMMITTEE_GOOGLE_SERVICE_ACCOUNT_EMAIL: envForm.COMMITTEE_GOOGLE_SERVICE_ACCOUNT_EMAIL,
            COMMITTEE_GOOGLE_PRIVATE_KEY: envForm.COMMITTEE_GOOGLE_PRIVATE_KEY,
            NEXT_PUBLIC_APP_URL: envForm.NEXT_PUBLIC_APP_URL
          }
        })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Unable to save env settings.");
      setRestartHint(Boolean(payload.restartRequired));
      setEnvForm((prev) => ({ ...prev, PARTICIPANT_GOOGLE_PRIVATE_KEY: "", COMMITTEE_GOOGLE_PRIVATE_KEY: "" }));
      await loadEnvAndTheme();
      await runHealthCheck();
      pushMessage("Environment settings updated.");
    } catch (error) {
      pushMessage(error instanceof Error ? error.message : "Unable to save env settings.", true);
    } finally {
      setIsSavingEnv(false);
    }
  }

  async function saveTheme() {
    setIsSavingTheme(true);
    try {
      const response = await fetch("/api/admin/settings/theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandMode, primaryColor: themeColor, claimTitle })
      });
      const payload = (await response.json()) as ThemePayload & { message?: string };
      if (!response.ok) throw new Error(payload.message || "Unable to save claim page config.");
      
      const newMode = payload.brandMode === "custom" ? "custom" : "default";
      const newColor = payload.primaryColor || "#2563eb";
      
      setBrandMode(newMode);
      setThemeColor(newColor);
      setClaimTitle(payload.claimTitle || "Front End Web Design Essential");

      pushMessage(payload.message || "Claim page config updated.");
    } catch (error) {
      pushMessage(error instanceof Error ? error.message : "Unable to save claim page config.", true);
    } finally {
      setIsSavingTheme(false);
    }
  }

  async function changePassword() {
    setIsSavingPassword(true);
    try {
      const response = await fetch("/api/admin/settings/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Unable to update password.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      pushMessage("Admin password updated.");
    } catch (error) {
      pushMessage(error instanceof Error ? error.message : "Unable to update password.", true);
    } finally {
      setIsSavingPassword(false);
    }
  }

  return (
    <div className="flex h-full flex-col p-6">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Settings</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Manage credentials, claim page theme, and API config</p>
        </div>
        {statusBadge}
      </div>

      {/* Message */}
      {message ? (
        <div className={`mt-3 shrink-0 rounded-md px-3 py-2 text-xs font-medium ${
          isError ? "bg-red-500/10 text-red-700 dark:text-red-300" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
        }`}>
          {message}
        </div>
      ) : null}

      {/* Tab bar */}
      <div className="mt-4 shrink-0 flex gap-0.5 border-b border-border/40">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 py-2 text-xs transition-all duration-200 rounded-t-lg border-b-2 -mb-px",
              activeTab === tab.id
                ? "admin-tab-active font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30 font-medium"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content — scrollable */}
      <div className="mt-4 flex-1 min-h-0 overflow-y-auto">
        {/* PASSWORD TAB */}
        {activeTab === "password" && (
          <div className="max-w-md space-y-4 p-1">
            <div className="flex items-center gap-2 mb-2">
              <KeyRound className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">Change Password</p>
            </div>
            <div className="space-y-2">
              <div className="space-y-1.5">
                <Label htmlFor="current-password" className="text-xs">Current Password</Label>
                <Input id="current-password" name="current-password" type="password" className="h-9" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-password" className="text-xs">New Password</Label>
                <Input id="new-password" name="new-password" type="password" className="h-9" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password" className="text-xs">Confirm New Password</Label>
                <Input id="confirm-password" name="confirm-password" type="password" className="h-9" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>
            </div>
            <Button size="sm" className="w-full sm:w-auto" onClick={() => void changePassword()} disabled={isSavingPassword}>
              {isSavingPassword ? <RefreshCw className="animate-spin" /> : <ShieldCheck />}
              Update Password
            </Button>
          </div>
        )}

        {/* THEME TAB */}
        {activeTab === "theme" && (
          <div className="max-w-md space-y-3 p-1">
            <div className="flex items-center gap-2 mb-3">
              <Palette className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">Claim Page Config</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="claim-title" className="text-xs">Claim Page Title</Label>
              <Input
                id="claim-title"
                className="h-9"
                value={claimTitle}
                onChange={(event) => setClaimTitle(event.target.value)}
                placeholder="Front End Web Design Essential"
                maxLength={80}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" size="sm" variant={brandMode === "default" ? "default" : "outline"} onClick={() => { setBrandMode("default"); setThemeColor("#2563eb"); }}>
                Default
              </Button>
              <Button type="button" size="sm" variant={brandMode === "custom" ? "default" : "outline"} onClick={() => setBrandMode("custom")}>
                Custom
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <input type="color" value={themeColor} onChange={(e) => setThemeColor(e.target.value)} className="h-9 w-10 cursor-pointer rounded border border-border bg-transparent p-0.5" disabled={brandMode === "default"} />
              <Input className="h-9" value={themeColor} onChange={(e) => setThemeColor(e.target.value)} placeholder="#2563eb" disabled={brandMode === "default"} />
            </div>
            <Button size="sm" onClick={() => void saveTheme()} disabled={isSavingTheme}>
              {isSavingTheme ? <RefreshCw className="animate-spin" /> : <Save />}
              Save Config
            </Button>
            <p className="text-[11px] text-muted-foreground">
              Title and custom color affect only the public claim page.
            </p>
          </div>
        )}

        {/* HEALTH TAB */}
        {activeTab === "health" && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">Google Sheets API Health</p>
              <div className="flex items-center gap-2">
                <Button variant={autoHealthCheck ? "success" : "outline"} size="sm" onClick={() => setAutoHealthCheck((p) => !p)}>
                  {autoHealthCheck ? "Auto: ON" : "Auto: OFF"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => void runHealthCheck()}>
                  <RefreshCw /> Check
                </Button>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Card className="border-border/50">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Participant API</p>
                    <Badge variant={health?.participant.ok ? "success" : "warning"}>{health?.participant.ok ? "OK" : "Issue"}</Badge>
                  </div>
                  <p className="mt-2 text-xs text-foreground">{health?.participant.message || "..."}</p>
                  {health?.participant.spreadsheetTitle ? <p className="mt-1 text-[11px] text-muted-foreground">Sheet: {health.participant.spreadsheetTitle}</p> : null}
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Committee API</p>
                    <Badge variant={!health?.committee.enabled ? "outline" : health?.committee.ok ? "success" : "warning"}>
                      {!health?.committee.enabled ? "Disabled" : health?.committee.ok ? "OK" : "Issue"}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-foreground">{health?.committee.message || "..."}</p>
                  {health?.committee.spreadsheetTitle ? <p className="mt-1 text-[11px] text-muted-foreground">Sheet: {health.committee.spreadsheetTitle}</p> : null}
                </CardContent>
              </Card>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Last checked: {lastHealthCheckedAt ? lastHealthCheckedAt.toLocaleTimeString("en-MY") : "Not yet"}
            </p>
          </div>
        )}

        {/* ENVIRONMENT TAB */}
        {activeTab === "env" && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">Google API Environment</p>
              <Button variant="outline" size="sm" onClick={() => setShowSecretInputs((p) => !p)}>
                {showSecretInputs ? <EyeOff /> : <Eye />}
                {showSecretInputs ? "Hide" : "Edit"}
              </Button>
            </div>

            {showSecretInputs ? (
              <>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Participant Spreadsheet ID</Label>
                    <Input className="h-9 text-xs" value={envForm.PARTICIPANT_GOOGLE_SHEETS_ID} onChange={(e) => setEnvForm((p) => ({ ...p, PARTICIPANT_GOOGLE_SHEETS_ID: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Participant Sheet Name</Label>
                    <Input className="h-9 text-xs" value={envForm.PARTICIPANT_GOOGLE_SHEET_NAME} onChange={(e) => setEnvForm((p) => ({ ...p, PARTICIPANT_GOOGLE_SHEET_NAME: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Participant Service Email</Label>
                    <Input className="h-9 text-xs" value={envForm.PARTICIPANT_GOOGLE_SERVICE_ACCOUNT_EMAIL} onChange={(e) => setEnvForm((p) => ({ ...p, PARTICIPANT_GOOGLE_SERVICE_ACCOUNT_EMAIL: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Committee Spreadsheet ID</Label>
                    <Input className="h-9 text-xs" value={envForm.COMMITTEE_GOOGLE_SHEETS_ID} onChange={(e) => setEnvForm((p) => ({ ...p, COMMITTEE_GOOGLE_SHEETS_ID: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Committee Sheet Name</Label>
                    <Input className="h-9 text-xs" value={envForm.COMMITTEE_GOOGLE_SHEET_NAME} onChange={(e) => setEnvForm((p) => ({ ...p, COMMITTEE_GOOGLE_SHEET_NAME: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Committee Service Email</Label>
                    <Input className="h-9 text-xs" value={envForm.COMMITTEE_GOOGLE_SERVICE_ACCOUNT_EMAIL} onChange={(e) => setEnvForm((p) => ({ ...p, COMMITTEE_GOOGLE_SERVICE_ACCOUNT_EMAIL: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label className="text-xs">App URL</Label>
                    <Input className="h-9 text-xs" value={envForm.NEXT_PUBLIC_APP_URL} onChange={(e) => setEnvForm((p) => ({ ...p, NEXT_PUBLIC_APP_URL: e.target.value }))} />
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Participant Private Key <span className="text-muted-foreground">({participantKeyConfigured ? "configured" : "missing"})</span></Label>
                    <textarea className="h-24 w-full rounded-lg border border-border bg-card/60 px-3 py-2 text-xs text-foreground" placeholder="Paste key to update" value={envForm.PARTICIPANT_GOOGLE_PRIVATE_KEY} onChange={(e) => setEnvForm((p) => ({ ...p, PARTICIPANT_GOOGLE_PRIVATE_KEY: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Committee Private Key <span className="text-muted-foreground">({committeeKeyConfigured ? "configured" : "missing"})</span></Label>
                    <textarea className="h-24 w-full rounded-lg border border-border bg-card/60 px-3 py-2 text-xs text-foreground" placeholder="Paste key to update" value={envForm.COMMITTEE_GOOGLE_PRIVATE_KEY} onChange={(e) => setEnvForm((p) => ({ ...p, COMMITTEE_GOOGLE_PRIVATE_KEY: e.target.value }))} />
                  </div>
                </div>
              </>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                <MaskedEnvField label="Participant Spreadsheet ID" value={envForm.PARTICIPANT_GOOGLE_SHEETS_ID} />
                <MaskedEnvField label="Participant Sheet Name" value={envForm.PARTICIPANT_GOOGLE_SHEET_NAME} />
                <MaskedEnvField label="Participant Service Email" value={envForm.PARTICIPANT_GOOGLE_SERVICE_ACCOUNT_EMAIL} />
                <MaskedEnvField label="Committee Spreadsheet ID" value={envForm.COMMITTEE_GOOGLE_SHEETS_ID} />
                <MaskedEnvField label="Committee Sheet Name" value={envForm.COMMITTEE_GOOGLE_SHEET_NAME} />
                <MaskedEnvField label="Committee Service Email" value={envForm.COMMITTEE_GOOGLE_SERVICE_ACCOUNT_EMAIL} />
                <div className="md:col-span-2">
                  <MaskedEnvField label="App URL" value={envForm.NEXT_PUBLIC_APP_URL} />
                </div>
                <MaskedEnvField label="Participant Private Key" value={participantKeyConfigured ? "configured" : ""} />
                <MaskedEnvField label="Committee Private Key" value={committeeKeyConfigured ? "configured" : ""} />
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={() => void saveEnvSettings()} disabled={isSavingEnv || isLoading}>
                {isSavingEnv ? <RefreshCw className="animate-spin" /> : <Save />}
                Save Env Config
              </Button>
              {restartHint ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                  <Unplug className="h-3 w-3" /> Restart dev server to apply.
                </span>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
