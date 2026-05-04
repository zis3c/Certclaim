"use client";

import ReactDOM from "react-dom";

import QRCode from "qrcode";
import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ClaimStatus } from "@/types/participant";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Loader2,
  Power,
  PowerOff,
  X
} from "lucide-react";

type QRCardProps = {
  initialStatus: ClaimStatus;
  claimUrl: string;
};

export default function QRCard({ initialStatus, claimUrl }: QRCardProps) {
  const [status, setStatus] = useState<ClaimStatus>(initialStatus);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const effectiveClaimUrl = useMemo(() => {
    if (claimUrl) return claimUrl;
    if (typeof window === "undefined") return "/claim";
    return `${window.location.origin}/claim`;
  }, [claimUrl]);

  useEffect(() => {
    QRCode.toDataURL(effectiveClaimUrl, {
      width: 400,
      margin: 1,
      color: {
        dark: "#000000",
        light: "#FFFFFF"
      }
    }).then(setQrDataUrl);
  }, [effectiveClaimUrl]);

  useEffect(() => {
    return () => {
      if (copyResetTimer.current) {
        clearTimeout(copyResetTimer.current);
      }
    };
  }, []);

  async function updateStatus(nextStatus: ClaimStatus) {
    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/update-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimStatus: nextStatus })
      });

      if (!response.ok) {
        setMessage("Unable to update claim setting.");
        return;
      }

      setStatus(nextStatus);
      setMessage("");
    } catch {
      setMessage("Unable to update claim setting.");
    } finally {
      setIsSaving(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(effectiveClaimUrl);
      setCopied(true);

      if (copyResetTimer.current) {
        clearTimeout(copyResetTimer.current);
      }

      copyResetTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setMessage("Unable to copy claim link.");
    }
  }

  function downloadQr() {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = "certificate-claim-qr.png";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  const nextStatus: ClaimStatus = status === "OPEN" ? "CLOSED" : "OPEN";
  const isOpening = nextStatus === "OPEN";

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          {/* Left: Controls */}
          <div className="flex-1 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-semibold text-foreground">Claim Access</h1>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Share QR code and control claim status
                </p>
              </div>
              <Badge variant={status === "OPEN" ? "success" : "warning"}>
                {status}
              </Badge>
            </div>

            {/* Status indicator */}
            <div className="flex items-center gap-2.5 rounded-lg bg-primary/5 px-3 py-2.5">
              <span className="relative flex h-2 w-2">
                <span
                  className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                    status === "OPEN" ? "bg-emerald-500" : "bg-amber-500"
                  }`}
                />
                <span
                  className={`relative inline-flex h-2 w-2 rounded-full ${
                    status === "OPEN" ? "bg-emerald-500" : "bg-amber-500"
                  }`}
                />
              </span>
              <span className="text-xs font-medium text-foreground">
                Certificate claim is {status.toLowerCase()}
              </span>
            </div>

            {/* Action buttons */}
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => updateStatus(nextStatus)}
                  disabled={isSaving}
                  variant={isOpening ? "success" : "destructive"}
                  size="sm"
                >
                  {isSaving ? (
                    <Loader2 className="animate-spin" />
                  ) : isOpening ? (
                    <Power />
                  ) : (
                    <PowerOff />
                  )}
                  {isSaving ? "Updating..." : isOpening ? "Open Claim" : "Close Claim"}
                </Button>
                <Button type="button" onClick={copyLink} variant="outline" size="sm">
                  {copied ? <Check className="text-emerald-600 dark:text-emerald-400" /> : <Copy />}
                  {copied ? "Copied!" : "Copy Link"}
                </Button>
                <Button type="button" onClick={downloadQr} variant="outline" size="sm">
                  <Download />
                  Download QR
                </Button>
              </div>

              {/* URL display */}
              <div className="flex items-center gap-2 rounded-md bg-muted/50 px-2.5 py-2">
                <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                <code className="min-w-0 truncate text-[11px] text-muted-foreground">
                  {effectiveClaimUrl}
                </code>
              </div>
            </div>

            {/* Message */}
            {message ? (
              <p className="text-xs text-amber-600 dark:text-amber-400">{message}</p>
            ) : null}
          </div>

          {/* Right: QR Code */}
          <div className="flex flex-col items-center gap-2 lg:pt-2">
            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              className="group w-full max-w-[180px] overflow-hidden rounded-2xl bg-white p-3 shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
            >
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrDataUrl}
                  alt="Certificate claim QR code"
                  className="h-auto w-full transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="aspect-square animate-pulse rounded-md bg-primary/80" />
              )}
            </button>
            <p className="text-[10px] text-muted-foreground">Click to enlarge</p>
          </div>
        </div>
      </CardContent>

      {/* QR Fullscreen Preview Modal — rendered via portal */}
      {isPreviewOpen ? (
        ReactDOM.createPortal(
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center animate-fade-in"
            onClick={() => setIsPreviewOpen(false)}
          >
            <div className="absolute inset-0 bg-black/85 backdrop-blur-md" />

            <button
              type="button"
              className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:bg-primary/90 hover:scale-110 active:scale-95 sm:right-6 sm:top-6"
              onClick={() => setIsPreviewOpen(false)}
              aria-label="Close QR preview"
            >
              <X className="h-5 w-5" />
            </button>

            <div
              className="relative z-10 mx-4 w-full max-w-lg animate-scale-in sm:mx-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="overflow-hidden rounded-2xl bg-white p-6 shadow-2xl sm:rounded-3xl sm:p-10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrDataUrl}
                  alt="Certificate claim QR code fullscreen preview"
                  className="h-auto w-full"
                />
              </div>
              <p className="mt-4 text-center text-sm font-semibold text-white">
                Scan to claim certificate
              </p>
              <p className="mt-1.5 break-all text-center text-xs text-white/60">
                {effectiveClaimUrl}
              </p>
            </div>
          </div>,
          document.body
        )
      ) : null}
    </Card>
  );
}
