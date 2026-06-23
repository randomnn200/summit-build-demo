import "./globals.css";
import type { Metadata } from "next";
import { AuthProvider } from "../lib/contexts/AuthContext";
import SiteThemeManager from "../components/SiteThemeManager";

export const metadata: Metadata = {
  title: "Summit Build Co. | Quality construction, delivered on time.",
  description:
    "Professional construction services for residential and commercial projects. Request a quote, track your project, and connect with our team.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <SiteThemeManager />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
