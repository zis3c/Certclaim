"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { getClaimBrandStyle, type BrandMode, type Theme } from "@/lib/claimTheme";

type ClaimPageSurfaceProps = {
  initialTheme: Theme;
  brandMode: BrandMode;
  primaryColor: string;
  children: ReactNode;
};

function readThemeFromDom(fallback: Theme): Theme {
  const attr = document.documentElement.getAttribute("data-theme");
  return attr === "light" ? "light" : attr === "dark" ? "dark" : fallback;
}

export default function ClaimPageSurface({
  initialTheme,
  brandMode,
  primaryColor,
  children
}: ClaimPageSurfaceProps) {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    setTheme(readThemeFromDom(initialTheme));

    const observer = new MutationObserver(() => {
      setTheme(readThemeFromDom(initialTheme));
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"]
    });

    return () => observer.disconnect();
  }, [initialTheme]);

  const claimBrandStyle = useMemo(
    () => getClaimBrandStyle(theme, brandMode, primaryColor),
    [theme, brandMode, primaryColor]
  );

  return (
    <main
      className="relative flex h-screen w-full overflow-hidden bg-transparent text-foreground"
      style={claimBrandStyle}
    >
      {children}
    </main>
  );
}
