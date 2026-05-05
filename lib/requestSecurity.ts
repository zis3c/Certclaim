import { NextRequest, NextResponse } from "next/server";

export function requireSameOrigin(request: NextRequest) {
  const secFetchSite = request.headers.get("sec-fetch-site");
  if (secFetchSite === "cross-site") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const origin = request.headers.get("origin");
  if (!origin) {
    return null;
  }

  const host = request.headers.get("host");
  if (!host) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const originUrl = new URL(origin);
    const requestOrigin = request.nextUrl.origin;
    if (originUrl.origin !== requestOrigin && originUrl.host !== host) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  return null;
}
