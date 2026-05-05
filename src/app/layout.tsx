import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeScript } from "@/components/theme/theme-script";
import { Sidebar } from "@/components/workspace/sidebar";
import { StatusBar } from "@/components/workspace/status-bar";
import { StorageEventListener } from "@/components/workspace/storage-event-listener";

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
        <div className="flex h-screen flex-col">
          <div className="flex min-h-0 flex-1">
            <Sidebar />
            <main className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-[var(--bg-primary)]">
              {children}
            </main>
          </div>
          <StatusBar />
        </div>
        <StorageEventListener />
      </body>
    </html>
  );
}
