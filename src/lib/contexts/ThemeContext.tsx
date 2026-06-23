"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_THEME,
  applyThemeToDocument,
  type ThemeConfig as Theme,
} from "../theme";

const STORAGE_KEY = "portal-theme";
const LEGACY_STORAGE_KEY = "site-theme";

function loadStoredPortalTheme(): Theme {
  if (typeof window === "undefined") return DEFAULT_THEME;
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      raw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (raw) {
        localStorage.setItem(STORAGE_KEY, raw);
        localStorage.removeItem(LEGACY_STORAGE_KEY);
      }
    }
    if (raw) return { ...DEFAULT_THEME, ...JSON.parse(raw) };
  } catch {
    /* ignore corrupt storage */
  }
  return DEFAULT_THEME;
}

interface PortalThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  loading: boolean;
}

const PortalThemeContext = createContext<PortalThemeContextValue>({
  theme: DEFAULT_THEME,
  setTheme: () => {},
  loading: true,
});

/** Portal-only theme — does not affect the public marketing site. */
export function PortalThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = loadStoredPortalTheme();
    setThemeState(stored);
    applyThemeToDocument(stored);
    setLoading(false);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    applyThemeToDocument(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  return (
    <PortalThemeContext.Provider value={{ theme, setTheme, loading }}>
      {children}
    </PortalThemeContext.Provider>
  );
}

export function usePortalTheme() {
  return useContext(PortalThemeContext);
}

/** @deprecated Use usePortalTheme in portal code. Public site uses DEFAULT_THEME. */
export function useTheme() {
  return useContext(PortalThemeContext);
}

/** @deprecated Use PortalThemeProvider in app/portal/layout.tsx only. */
export const ThemeProvider = PortalThemeProvider;
