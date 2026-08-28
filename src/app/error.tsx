'use client';

import Link from 'next/link';
import { Compass, RefreshCw } from 'lucide-react';
import { useEffect } from 'react';

export default function RouteError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error('ScoutDeck route error:', error);
  }, [error]);

  return (
    <section className="flex min-h-[65dvh] items-center justify-center py-8 text-center" role="alert">
      <div className="w-full max-w-lg rounded-[28px] border border-card-border bg-card p-6 shadow-[0_10px_0_hsl(var(--foreground)/.06)] sm:p-9">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent/60 text-accent-foreground"><Compass size={26} aria-hidden="true" /></div>
        <p className="mt-6 font-mono-label text-[10px] uppercase tracking-[.2em] text-primary">Signal interrupted</p>
        <h1 className="mt-2 text-balance text-2xl font-semibold tracking-[-.04em]">We lost the trail for a moment.</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">Nothing has been lost. Try loading this view again, or return to your shortlist and keep exploring.</p>
        <div className="mt-6 flex flex-col-reverse justify-center gap-3 sm:flex-row">
          <Link href="/dashboard" className="focus-ring inline-flex min-h-11 items-center justify-center rounded-full border border-border px-5 text-sm font-semibold hover:bg-muted">Back to shortlist</Link>
          <button type="button" onClick={retry} className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground"><RefreshCw size={16} aria-hidden="true" /> Try again</button>
        </div>
      </div>
    </section>
  );
}
