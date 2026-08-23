'use client';

import { Bookmark, CalendarClock, Compass, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useListSavedOpportunities } from '@/lib/api-client';
import { OpportunityCard } from '@/components/opportunity-card';

// NOTE: this was pages/saved.tsx, mounted at "/saved". Now src/app/saved/page.tsx.
export default function Saved() {
  const query = useListSavedOpportunities();
  const saved = [...(query.data ?? [])].sort((a, b) => {
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });
  return <div><div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="font-mono-label text-[10px] uppercase tracking-[.2em] text-primary">Your deck</p><h1 className="mt-2 text-[2.6rem] font-semibold leading-none tracking-[-.065em]">Saved for later.</h1><p className="mt-4 max-w-[480px] text-sm leading-relaxed text-muted-foreground">A calmer place to compare the things that caught your eye. Closest deadlines rise to the top.</p></div><div className="flex items-center gap-2 rounded-full bg-secondary px-3.5 py-2 font-mono-label text-[10px] uppercase tracking-[.12em] text-secondary-foreground"><Bookmark size={14} /> {saved.length} {saved.length === 1 ? 'lead' : 'leads'}</div></div>
    {query.isLoading ? <div className="mt-9 grid gap-5 md:grid-cols-2">{[1, 2, 3].map((item) => <div key={item} className="h-64 animate-pulse rounded-[22px] bg-muted" />)}</div> : query.isError ? <div className="mt-8 rounded-[22px] border border-destructive/30 bg-destructive/5 p-8 text-center"><h2 className="font-semibold">Your deck is out of reach.</h2><button type="button" onClick={() => query.refetch()} className="focus-ring mt-4 inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background" data-testid="button-retry-saved"><RefreshCw size={14} /> Try again</button></div> : saved.length === 0 ? <div className="mt-9 rounded-[24px] border border-dashed border-border bg-card px-6 py-16 text-center" data-testid="empty-saved"><div className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent/40 text-primary"><CalendarClock size={23} /></div><h2 className="mt-5 text-xl font-semibold tracking-[-.04em]">Nothing saved yet.</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">When something feels worth a second look, tap the bookmark. It&rsquo;ll wait here, ordered by urgency.</p><Link href="/" className="focus-ring mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground" data-testid="link-explore-from-saved"><Compass size={16} /> Explore the shortlist</Link></div> : <div className="mt-9 grid gap-5 md:grid-cols-2">{saved.map((opportunity, index) => <OpportunityCard key={opportunity.id} opportunity={opportunity} index={index} />)}</div>}
  </div>;
}
