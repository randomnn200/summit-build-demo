export interface ThemeConfig {
  primaryColor: string;
  accentColor: string;
  companyName: string;
  tagline: string;
}

export const DEFAULT_THEME: ThemeConfig = {
  primaryColor: "#2563EB",
  accentColor: "#94A3B8",
  companyName: "Summit Build Co.",
  tagline: "Quality construction, delivered on time.",
};

export const THEME_PRESETS: { name: string; primaryColor: string; accentColor: string }[] = [
  { name: "Blue & White", primaryColor: "#2563EB", accentColor: "#94A3B8" },
  { name: "Forest Green", primaryColor: "#059669", accentColor: "#0D9488" },
  { name: "Warm Coral", primaryColor: "#EA580C", accentColor: "#F59E0B" },
  { name: "Royal Purple", primaryColor: "#7C3AED", accentColor: "#A78BFA" },
  { name: "Slate Minimal", primaryColor: "#334155", accentColor: "#94A3B8" },
  { name: "Navy Classic", primaryColor: "#1E40AF", accentColor: "#3B82F6" },
];

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function companyInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "SB";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function applyThemeToDocument(theme: ThemeConfig) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const [pr, pg, pb] = hexToRgb(theme.primaryColor);
  const [ar, ag, ab] = hexToRgb(theme.accentColor);
  root.style.setProperty("--brand-primary", theme.primaryColor);
  root.style.setProperty("--brand-accent", theme.accentColor);
  root.style.setProperty("--brand-primary-rgb", `${pr} ${pg} ${pb}`);
  root.style.setProperty("--brand-accent-rgb", `${ar} ${ag} ${ab}`);
  document.title = `${theme.companyName} | ${theme.tagline}`;
}
