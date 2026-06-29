import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

export const metadata: Metadata = {
  title: "Sync Master CRM — Foundation Mecca",
  description:
    "Admin dashboard for the Sync Master music coaching business by Foundation Mecca.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <Sidebar />
        <div className="lg:pl-60">
          <Topbar />
          <main className="px-5 py-6 lg:px-8 lg:py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
