import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import ThemeToggle from "@/components/ThemeToggle";

// Fix for DEP0108: zlib.bytesRead is deprecated
if (typeof process !== "undefined" && typeof process.on === "function") {
  process.on("warning", (warning) => {
    if (warning.name === "DeprecationWarning" && (warning as any).code === "DEP0108") {
      return;
    }
  });
}

export const metadata: Metadata = {
  title: "CertClaim",
  description: "Secure certificate claim system for Front End Web Design Essential workshop participants. Verify eligibility and download your participation certificate.",
  keywords: ["certificate", "claim", "front end", "web design", "USAS"],
  icons: {
    icon: "/logo.svg",
    shortcut: "/logo.svg",
    apple: "/logo.svg"
  },
  openGraph: {
    title: "CertClaim",
    description: "Claim your participation certificate for Front End Web Design Essential."
  }
};

type Theme = "dark" | "light";

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const savedTheme = cookieStore.get("theme")?.value;
  const initialTheme: Theme = savedTheme === "light" ? "light" : "dark";

  return (
    <html
      lang="en"
      className="min-h-full"
      data-theme={initialTheme}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full font-sans antialiased">
        <ThemeToggle initialTheme={initialTheme} />
        {children}
      </body>
    </html>
  );
}
