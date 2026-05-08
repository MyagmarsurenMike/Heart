import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeScript } from "@/components/theme/theme-script";
import { Sidebar } from "@/components/workspace/sidebar";
import { StatusBar } from "@/components/workspace/status-bar";
import { StorageEventListener } from "@/components/workspace/storage-event-listener";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hearth",
  description: "A local-first personal OS.",
};

// Storage is read at request time, not build time — opting out of prerender.
export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={geistMono.variable} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body>
        <WorkspaceShell sidebar={<Sidebar />} status={<StatusBar />}>
          {children}
        </WorkspaceShell>
        <StorageEventListener />
      </body>
    </html>
  );
}
