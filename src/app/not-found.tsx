import { Compass } from 'lucide-react';
import Link from 'next/link';

// NOTE: this was pages/not-found.tsx, rendered by wouter as a fallback
// <Route component={NotFound} />. In App Router, src/app/not-found.tsx is a
// reserved filename Next renders automatically for unmatched routes (and
// wherever you call notFound() from next/navigation) — no manual route
// registration needed.
export default function NotFound() {
  return (
    <div className="flex min-h-[65dvh] items-center justify-center text-center">
      <div>
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent/50 text-primary"><Compass size={25} /></div>
        <p className="mt-6 font-mono-label text-[10px] uppercase tracking-[.2em] text-primary">No trail here</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-.06em]">This page wandered off.</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">The link you followed doesn&rsquo;t point to a current ScoutDeck route.</p>
        <Link href="/dashboard" className="focus-ring mt-6 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground" data-testid="link-not-found-home">Return to discover</Link>
      </div>
    </div>
  );
}
