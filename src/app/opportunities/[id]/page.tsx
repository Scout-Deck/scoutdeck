'use client';

import { ArrowLeft, ArrowUpRight, Bookmark, CalendarDays, CheckCircle2, ExternalLink, MapPin, Sparkles, Wallet } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetOpportunityQueryKey,
  getListOpportunitiesQueryKey,
  getListSavedOpportunitiesQueryKey,
  useGetOpportunity,
  useSaveOpportunity,
  useUnsaveOpportunity,
} from '@/lib/api-client';
import { deadlineLabel, typeLabels } from '@/components/opportunity-card';

// NOTE: this was pages/opportunity-detail.tsx, mounted at
// "/opportunities/:id" via wouter's <Route path="/opportunities/:id" .../>.
// It's now src/app/opportunities/[id]/page.tsx.
// wouter's useRoute()/useLocation() -> next/navigation's useParams()/useRouter().
export default function OpportunityDetail() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id ?? '';
  const queryClient = useQueryClient();
  const query = useGetOpportunity(id, { query: { queryKey: getGetOpportunityQueryKey(id), enabled: Boolean(id) } });
  const opportunity = query.data;
  const [savedOverride, setSavedOverride] = useState<{ id: string; value: boolean } | null>(null);
  const save = useSaveOpportunity();
  const unsave = useUnsaveOpportunity();
  const isSaved = savedOverride?.id === id
    ? savedOverride.value
    : opportunity?.isSaved ?? false;

  const toggleSave = () => {
    if (!opportunity) return;
    const next = !isSaved;
    setSavedOverride({ id, value: next });
    const mutation = next ? save : unsave;
    mutation.mutate({ id: opportunity.id }, { onError: () => setSavedOverride(null), onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getGetOpportunityQueryKey(opportunity.id) });
      queryClient.invalidateQueries({ queryKey: getListOpportunitiesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListSavedOpportunitiesQueryKey() });
    } });
  };
  if (query.isLoading) return <DetailSkeleton />;
  if (query.isError || !opportunity) return <div className="py-20 text-center"><p className="font-mono-label text-[10px] uppercase tracking-[.18em] text-destructive">Signal unavailable</p><h1 className="mt-3 text-2xl font-semibold">This trail has gone cold.</h1><Link href="/dashboard" className="focus-ring mt-6 inline-flex rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" data-testid="link-back-discover">Back to discover</Link></div>;
  return (
    <article>
      <button type="button" onClick={() => router.push('/dashboard')} className="focus-ring mb-8 inline-flex items-center gap-2 rounded-full text-xs font-semibold text-muted-foreground hover:text-foreground" data-testid="button-back-opportunities"><ArrowLeft size={15} /> Back to shortlist</button>
      <div className="grid gap-8 lg:grid-cols-[1fr_340px] lg:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-secondary px-3 py-1.5 font-mono-label text-[10px] uppercase tracking-[.1em]">{typeLabels[opportunity.type] ?? opportunity.type}</span><span className="font-mono-label text-[10px] text-muted-foreground">{opportunity.sourceType === 'user_submitted' ? 'Community lead' : 'Scouted'}</span></div>
          <h1 className="mt-5 max-w-[760px] text-balance text-[2.6rem] font-semibold leading-[.98] tracking-[-.065em] md:text-[4.6rem]">{opportunity.title}</h1>
          <p className="mt-5 text-lg font-medium text-muted-foreground">{opportunity.organization}</p>
          <p className="mt-8 max-w-[700px] text-base leading-[1.75] text-muted-foreground">{opportunity.summary}</p>
          <div className="mt-9 rounded-[22px] border border-accent/50 bg-accent/20 p-5 md:p-6"><div className="flex items-start gap-3"><Sparkles className="mt-0.5 shrink-0 text-primary" size={18} /><div><p className="font-mono-label text-[10px] uppercase tracking-[.18em] text-primary">Why this made your deck</p><p className="mt-2 text-sm font-medium leading-relaxed">{opportunity.why}</p></div></div></div>
          <section className="mt-10 border-t border-border pt-8"><p className="font-mono-label text-[10px] uppercase tracking-[.18em] text-primary">The details</p><div className="mt-5 grid gap-5 sm:grid-cols-2">{[
            { icon: CalendarDays, label: 'Deadline', value: deadlineLabel(opportunity.deadline) },
            { icon: MapPin, label: 'Location', value: opportunity.eligibility.remoteOk ? 'Remote friendly' : opportunity.eligibility.location },
            { icon: Wallet, label: 'Compensation', value: opportunity.compensation ?? 'Not listed' },
            { icon: CheckCircle2, label: 'Experience', value: opportunity.eligibility.experience || 'Open to early career' },
          ].map(({ icon: Icon, label, value }) => <div key={label} className="flex gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted text-primary"><Icon size={16} /></span><div><p className="font-mono-label text-[10px] uppercase tracking-[.12em] text-muted-foreground">{label}</p><p className="mt-1 text-sm font-medium">{value}</p></div></div>)}</div></section>
          <section className="mt-10 border-t border-border pt-8"><p className="font-mono-label text-[10px] uppercase tracking-[.18em] text-primary">What you&rsquo;ll bring</p><div className="mt-4 flex flex-wrap gap-2">{opportunity.requiredSkills.map((skill) => <span key={skill} className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium">{skill}</span>)}</div><p className="mt-5 text-sm leading-relaxed text-muted-foreground"><strong className="font-medium text-foreground">Eligibility:</strong> {opportunity.eligibility.educationLevel}. {opportunity.eligibility.otherCriteria}</p></section>
        </div>
        <aside className="lg:sticky lg:top-28"><div className="rounded-[24px] border border-card-border bg-card p-5 shadow-[0_8px_0_hsl(var(--foreground)/.045)] md:p-6"><div className="flex items-end justify-between"><div><p className="font-mono-label text-[10px] uppercase tracking-[.18em] text-muted-foreground">Your match</p><p className="mt-2 text-5xl font-semibold tracking-[-.08em] text-primary">{Math.round(opportunity.score)}<span className="text-2xl">%</span></p></div><div className="size-16 rounded-full" style={{ background: `conic-gradient(hsl(var(--primary)) ${opportunity.score}%, hsl(var(--secondary)) 0)` }}><div className="m-2 grid size-12 place-items-center rounded-full bg-card font-mono-label text-[10px]">fit</div></div></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${opportunity.score}%` }} /></div><a href={opportunity.sourceUrl} target="_blank" rel="noreferrer" className="focus-ring mt-6 flex h-12 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5" data-testid="link-apply-opportunity">View opportunity <ExternalLink size={16} /></a><button type="button" onClick={toggleSave} disabled={save.isPending || unsave.isPending} className="focus-ring mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border text-sm font-semibold transition-colors hover:bg-muted disabled:opacity-60" data-testid="button-detail-save">{isSaved ? <><Bookmark size={16} fill="currentColor" /> Saved to your deck</> : <><Bookmark size={16} /> Save for later</>}</button></div><p className="mt-4 flex items-center justify-center gap-1.5 text-center font-mono-label text-[10px] uppercase tracking-[.12em] text-muted-foreground"><ArrowUpRight size={12} /> Apply through the original source</p></aside>
      </div>
    </article>
  );
}

function DetailSkeleton() {
  return <div className="animate-pulse"><div className="h-4 w-28 rounded bg-muted" /><div className="mt-10 h-20 max-w-3xl rounded bg-muted" /><div className="mt-5 h-5 w-48 rounded bg-muted" /><div className="mt-8 h-28 max-w-2xl rounded bg-muted" /><div className="mt-10 h-40 max-w-2xl rounded-[22px] bg-muted" /></div>;
}
