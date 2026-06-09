import "./globals.css";
import type { Metadata } from "next";
import { AuthProvider } from "../lib/contexts/AuthContext";

export const metadata: Metadata = {
  title: "Illegal Construction Co. | We Build First, Ask Permits Later",
  description:
    "Illegal Construction Co. — bold builds, faster timelines, and absolutely no red tape. Residential, commercial, and 'don't ask' projects.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
