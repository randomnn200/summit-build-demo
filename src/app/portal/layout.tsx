import { PortalThemeProvider } from "../../lib/contexts/ThemeContext";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PortalThemeProvider>{children}</PortalThemeProvider>;
}
