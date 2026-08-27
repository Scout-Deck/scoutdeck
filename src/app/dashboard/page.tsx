'use client';

import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Filter, RefreshCw, Search, Sparkles } from 'lucide-react';
import { getListOpportunitiesQueryKey, useGetProfile, useListOpportunities } from '@/lib/api-client';
import { OpportunityCard, typeLabels } from '@/components/opportunity-card';
import Profile from '@/app/profile/page';
import { useScout } from '@/lib/scout/use-scout';
import type { Opportunity } from '@/lib/api-client';

const filters = ['All', 'Fellowship', 'Builder program', 'Ambassador program', 'Hackathon', 'Scholarship', 'Grant'];

function SkeletonCard() {
  return <div className="animate-pulse rounded-[22px] border border-card-border bg-card p-6"><div className="flex gap-3"><div className="size-10 rounded-xl bg-muted" /><div className="flex-1 space-y-2"><div className="h-3 w-24 rounded bg-muted" /><div className="h-5 w-3/4 rounded bg-muted" /></div></div><div className="mt-5 h-3 w-1/3 rounded bg-muted" /><div className="mt-4 h-10 rounded bg-muted" /></div>;
}

export default function DashboardPage() {
  const [filter, setFilter] = useState('All');
  const [query, setQuery] = useState('');
  const queryClient = useQueryClient();
  const opportunitiesQuery = useListOpportunities();
  const profileQuery = useGetProfile();
  const scout = useScout({ onComplete: async () => queryClient.invalidateQueries({ queryKey: getListOpportunitiesQueryKey() }) });
  const opportunityCount = opportunitiesQuery.data?.length ?? 0;
  const streamed: Opportunity[] = scout.matches.map((match) => ({
    id: match.opportunity.databaseId ?? match.candidateId,
    title: match.opportunity.title,
    organization: match.opportunity.organization ?? 'Unknown organisation',
    summary: match.opportunity.description ?? 'No description was available from the source.',
    sourceUrl: match.opportunity.sourceUrl,
    type: match.opportunity.type,
    score: match.score,
    why: match.matchReason,
    deadline: match.opportunity.deadline,
    compensation: match.opportunity.stipend,
    sourceType: 'scraped',
    requiredSkills: match.opportunity.requiredSkills,
    eligibility: { educationLevel: match.opportunity.eligibility.educationLevel ?? '', experience: match.opportunity.eligibility.experience ?? '', location: match.opportunity.eligibility.location ?? match.opportunity.location ?? '', remoteOk: match.opportunity.eligibility.remoteOk ?? match.opportunity.isRemote ?? false, otherCriteria: match.opportunity.eligibility.otherCriteria ?? '' },
    isSaved: false,
  }));
  // Prefer the just-streamed shortlist so users see it even while its optional
  // database persistence and query-cache refresh are still catching up.
  const visible = scout.matches.length ? streamed : opportunitiesQuery.data;
  const filtered = useMemo(() => (visible ?? []).filter((item) => {
    const matchesFilter = filter === 'All' || typeLabels[item.type] === filter;
    const haystack = `${item.title} ${item.organization} ${item.summary} ${item.requiredSkills.join(' ')}`.toLowerCase();
    return matchesFilter && haystack.includes(query.toLowerCase());
  }), [filter, query, visible]);
  const firstName = profileQuery.data?.name?.split(' ')[0] || 'there';
  const profileReady = Boolean(
    profileQuery.data?.name.trim()
    && profileQuery.data.educationLevel.trim()
    && profileQuery.data.fieldOfStudy.trim()
    && profileQuery.data.skills.length
    && profileQuery.data.interests.trim()
    && profileQuery.data.opportunityTypes.length,
  );

  if (!profileQuery.isLoading && !profileQuery.isError && !profileReady) return <Profile />;

  return <div>
    <section className="atlas-frame overflow-hidden px-6 py-8 text-sidebar-foreground md:px-10 md:py-10"><div className="atlas-route -right-20 -top-36 size-[390px]" /><div className="relative max-w-[720px]"><p className="signal-label text-primary">Live field / your scout report</p><h1 className="mt-5 text-balance text-[clamp(3rem,5vw,5.4rem)] font-medium leading-[.9] tracking-[-.06em]">A few good <span className="signal-display text-primary">directions</span>, {firstName}.</h1><p className="mt-5 max-w-[500px] text-sm leading-relaxed text-sidebar-foreground/70 md:text-base">We sorted the noise against what you told us. Start with the one that makes you a little curious.</p></div><div className="relative mt-8 flex items-center gap-3 border-t border-sidebar-border pt-5 text-xs text-sidebar-foreground/70"><Sparkles size={15} className="text-primary" /><span>{opportunityCount ? `${opportunityCount} signals in your orbit` : 'Your first signals are on their way'}</span></div></section>
    <section className="mt-12"><div className="flex flex-col justify-between gap-5 border-b border-border pb-6 md:flex-row md:items-end"><div><p className="signal-label text-[#486257]">The short list</p><h2 className="mt-3 text-3xl font-medium tracking-[-.055em]">Worth your next hour</h2></div><div className="relative w-full md:w-[270px]"><Search size={16} className="pointer-events-none absolute left-3.5 top-3.5 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your shortlist" className="focus-ring h-11 w-full border-b border-foreground bg-transparent pl-10 pr-1 text-sm outline-none placeholder:text-muted-foreground" /></div></div><div className="mt-5 flex flex-wrap items-center gap-3 border-y border-border py-3"><button type="button" onClick={() => scout.scout()} disabled={scout.pending || profileQuery.isLoading} className="focus-ring inline-flex h-11 items-center gap-3 bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"><Sparkles size={16} /> {scout.pending ? 'Scouting…' : 'Run a fresh scout'}</button><p className={`text-xs ${scout.error ? 'text-destructive' : 'text-muted-foreground'}`}>{scout.error ?? scout.progress?.message ?? 'Searches and ranks opportunities using your saved profile.'}</p></div><div className="mt-6 flex items-center gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter opportunities"><Filter size={15} className="mr-1 shrink-0 text-muted-foreground" />{filters.map((item) => <button key={item} type="button" onClick={() => setFilter(item)} className={`focus-ring shrink-0 border-b px-3 py-2 signal-label transition-colors ${filter === item ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>{item}</button>)}</div></section>
    {opportunitiesQuery.isLoading ? <div className="mt-6 grid gap-5 md:grid-cols-2"><SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard /></div> : opportunitiesQuery.isError ? <div className="mt-6 rounded-[22px] border border-destructive/30 bg-destructive/5 p-8 text-center"><h3 className="font-semibold">The signal went quiet.</h3><p className="mt-2 text-sm text-muted-foreground">We couldn&rsquo;t load your shortlist right now.</p><button type="button" onClick={() => opportunitiesQuery.refetch()} className="focus-ring mt-5 inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-xs font-semibold text-background"><RefreshCw size={14} /> Try again</button></div> : filtered.length === 0 ? <div className="mt-6 rounded-[22px] border border-dashed border-border bg-card/60 px-6 py-14 text-center"><div className="mx-auto grid size-12 place-items-center rounded-2xl bg-accent/40 text-accent-foreground"><Search size={20} /></div><h3 className="mt-5 text-lg font-semibold tracking-[-.03em]">{query || filter !== 'All' ? 'Nothing in this slice yet.' : 'Your scout deck is still warming up.'}</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{query || filter !== 'All' ? 'Try another filter or clear your search.' : 'Complete your profile and we’ll start looking for a strong first match.'}</p>{(query || filter !== 'All') && <button type="button" onClick={() => { setQuery(''); setFilter('All'); }} className="focus-ring mt-5 text-xs font-semibold text-primary underline underline-offset-4">Clear filters</button>}</div> : <div className="mt-6 grid gap-5 md:grid-cols-2">{filtered.map((opportunity, index) => <OpportunityCard key={opportunity.id} opportunity={opportunity} index={index} />)}</div>}
  </div>;
}
