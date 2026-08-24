'use client';

import { useMemo, useState } from 'react';
import { Filter, RefreshCw, Search, Sparkles } from 'lucide-react';
import { useGetProfile, useListOpportunities } from '@/lib/api-client';
import { OpportunityCard, typeLabels } from '@/components/opportunity-card';

const filters = ['All', 'Internship', 'Fellowship', 'Hackathon', 'Scholarship', 'Grant', 'Early career job'];

function SkeletonCard() {
  return <div className="animate-pulse rounded-[22px] border border-card-border bg-card p-6"><div className="flex gap-3"><div className="size-10 rounded-xl bg-muted" /><div className="flex-1 space-y-2"><div className="h-3 w-24 rounded bg-muted" /><div className="h-5 w-3/4 rounded bg-muted" /></div></div><div className="mt-5 h-3 w-1/3 rounded bg-muted" /><div className="mt-4 h-10 rounded bg-muted" /><div className="mt-5 h-3 rounded bg-muted" /></div>;
}

// NOTE: this was pages/home.tsx, mounted at "/" via <Route path="/" component={Home} />.
// It's now the App Router root route: src/app/page.tsx.
// Marked 'use client' because it uses useState/useMemo and TanStack Query hooks.
export default function Home() {
  const [filter, setFilter] = useState('All');
  const [query, setQuery] = useState('');
  const opportunitiesQuery = useListOpportunities();
  const profileQuery = useGetProfile();
  const opportunities = opportunitiesQuery.data;
  const filtered = useMemo(() => (opportunities ?? []).filter((item) => {
    const matchesFilter = filter === 'All' || typeLabels[item.type] === filter;
    const haystack = `${item.title} ${item.organization} ${item.summary} ${item.requiredSkills.join(' ')}`.toLowerCase();
    return matchesFilter && haystack.includes(query.toLowerCase());
  }), [filter, opportunities, query]);
  const firstName = profileQuery.data?.name?.split(' ')[0] || 'there';

  return (
    <div>
      <section className="relative overflow-hidden rounded-[28px] bg-primary px-6 py-8 text-primary-foreground shadow-[0_10px_0_hsl(var(--foreground)/.08)] md:px-10 md:py-10">
        <div className="pointer-events-none absolute -right-12 -top-20 size-64 rounded-full border-[28px] border-accent/25" />
        <div className="pointer-events-none absolute -bottom-28 right-24 size-52 rounded-full border border-primary-foreground/15" />
        <div className="relative max-w-[620px]">
          <p className="scout-rise font-mono-label text-[10px] uppercase tracking-[0.2em] text-primary-foreground/65">Your weekly scout report</p>
          <h1 className="scout-rise scout-rise-1 mt-4 text-balance text-[2.35rem] font-semibold leading-[.98] tracking-[-0.065em] md:text-[4rem]">A few good <span className="text-accent">directions</span>, {firstName}.</h1>
          <p className="scout-rise scout-rise-2 mt-5 max-w-[460px] text-sm leading-relaxed text-primary-foreground/75 md:text-base">We sorted the noise against what you told us. Start with the one that makes you a little curious.</p>
        </div>
        <div className="relative mt-8 flex items-center gap-3 border-t border-primary-foreground/15 pt-5 text-xs text-primary-foreground/70">
          <Sparkles size={15} className="text-accent" />
          <span>{opportunities?.length ? `${opportunities.length} signals in your orbit` : 'Your first signals are on their way'}</span>
          <span className="ml-auto font-mono-label text-[10px] uppercase tracking-[0.12em]">Updated just now</span>
        </div>
      </section>

      <section className="mt-9 md:mt-12">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="font-mono-label text-[10px] uppercase tracking-[0.2em] text-primary">The short list</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.05em] md:text-[2rem]">Worth your next hour</h2>
          </div>
          <div className="relative w-full md:w-[270px]">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-3.5 text-muted-foreground" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your shortlist" className="focus-ring h-11 w-full rounded-xl border border-border bg-card pl-10 pr-4 text-sm outline-none placeholder:text-muted-foreground" data-testid="input-search-opportunities" />
          </div>
        </div>
        <div className="mt-6 flex items-center gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter opportunities">
          <Filter size={15} className="mr-1 shrink-0 text-muted-foreground" />
          {filters.map((item) => (
            <button key={item} type="button" onClick={() => setFilter(item)} className={`focus-ring shrink-0 rounded-full px-3.5 py-2 text-xs font-medium transition-colors ${filter === item ? 'bg-foreground text-background' : 'bg-card text-muted-foreground hover:bg-secondary hover:text-foreground'}`} data-testid={`button-filter-${item.toLowerCase().replaceAll(' ', '-')}`}>{item}</button>
          ))}
        </div>
      </section>

      {opportunitiesQuery.isLoading ? (
        <div className="mt-6 grid gap-5 md:grid-cols-2"><SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      ) : opportunitiesQuery.isError ? (
        <div className="mt-6 rounded-[22px] border border-destructive/30 bg-destructive/5 p-8 text-center" data-testid="status-opportunities-error">
          <h3 className="font-semibold">The signal went quiet.</h3><p className="mt-2 text-sm text-muted-foreground">We couldn&rsquo;t load your shortlist right now.</p>
          <button type="button" onClick={() => opportunitiesQuery.refetch()} className="focus-ring mt-5 inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-xs font-semibold text-background" data-testid="button-retry-opportunities"><RefreshCw size={14} /> Try again</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-6 rounded-[22px] border border-dashed border-border bg-card/60 px-6 py-14 text-center" data-testid="empty-opportunities">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-accent/40 text-accent-foreground"><Search size={20} /></div>
          <h3 className="mt-5 text-lg font-semibold tracking-[-0.03em]">{query || filter !== 'All' ? 'Nothing in this slice yet.' : 'Your scout deck is still warming up.'}</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{query || filter !== 'All' ? 'Try another filter or clear your search. The best fit may be just outside this view.' : 'Complete your profile and we&rsquo;ll start looking for a strong first match.'}</p>
          {(query || filter !== 'All') && <button type="button" onClick={() => { setQuery(''); setFilter('All'); }} className="focus-ring mt-5 text-xs font-semibold text-primary underline underline-offset-4" data-testid="button-clear-filters">Clear filters</button>}
        </div>
      ) : (
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {filtered.map((opportunity, index) => <OpportunityCard key={opportunity.id} opportunity={opportunity} index={index} />)}
        </div>
      )}
    </div>
  );
}
