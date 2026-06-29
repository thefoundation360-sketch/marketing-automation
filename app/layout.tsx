import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sync Master CRM — Foundation Mecca",
  description:
    "Business CRM and client management system for the Sync Master music coaching program.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
