import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { AppShell } from "@/components/app-shell";
import { ErrorBoundary } from "@/components/error-boundary";
import { DM_Mono, Outfit } from "next/font/google";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "ScoutDeck — Find your direction",
  description: "Opportunity intelligence for people in motion.",
  icons: {
    icon: "/icon.jpg",
  },
};

// NOTE: In the original CRA/Vite app, <ErrorBoundary> wrapped everything in
// main.tsx, and a second, route-keyed <ErrorBoundary resetKey={location}>
// wrapped <AppShell><Switch>...</Switch></AppShell> inside App.tsx so a
// per-page crash didn't take out the shared shell (sidebar/navbar).
//
// In App Router, per-route reset-on-navigation is idiomatic via
// src/app/error.tsx (Next re-mounts it per segment automatically), so the
// inner ErrorBoundary there has been replaced by that convention. This root
// ErrorBoundary is the outer safety net equivalent to the one in main.tsx.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`grain min-h-dvh ${outfit.variable} ${dmMono.variable}`}>
        <ErrorBoundary>
          <Providers>
            <AppShell>{children}</AppShell>
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
