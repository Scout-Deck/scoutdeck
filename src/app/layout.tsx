import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';
import { AppShell } from '@/components/app-shell';
import { ErrorBoundary } from '@/components/error-boundary';

export const metadata: Metadata = {
  title: 'ScoutDeck',
  description: 'Your weekly scout report of opportunities worth your time.',
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
      <body className="grain min-h-dvh">
        <ErrorBoundary>
          <Providers>
            <AppShell>{children}</AppShell>
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
