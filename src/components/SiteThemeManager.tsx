"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { applyThemeToDocument, DEFAULT_THEME } from "../lib/theme";

/** Keeps the public site on the default theme; portal manages its own theme separately. */
export default function SiteThemeManager() {
  const pathname = usePathname();
  const isPortal = pathname?.startsWith("/portal");

  useEffect(() => {
    if (!isPortal) {
      applyThemeToDocument(DEFAULT_THEME);
    }
  }, [isPortal, pathname]);

  return null;
}
