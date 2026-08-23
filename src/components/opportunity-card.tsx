import { useState, type MouseEvent } from 'react';
import { Link } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowUpRight, Bookmark, CalendarDays, Check, MapPin } from 'lucide-react';
import type { Opportunity } from '@workspace/api-client-react';
import { getListOpportunitiesQueryKey, getListSavedOpportunitiesQueryKey, useSaveOpportunity, useUnsaveOpportunity } from '@workspace/api-client-react';
import { cn } from '@/lib/utils';

const typeLabels: Record<string, string> = { internship: 'Internship', fellowship: 'Fellowship', hackathon: 'Hackathon', scholarship: 'Scholarship', grant: 'Grant', job: 'Early career job' };

function deadlineLabel(deadline: string | null) {
  if (!deadline) return 'No deadline listed';
  const date = new Date(deadline);
  if (Number.isNaN(date.getTime())) return deadline;
  return `Due ${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date)}`;
}

export function OpportunityCard({ opportunity, index = 0 }: { opportunity: Opportunity; index?: number }) {
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(opportunity.isSaved);
  const [justSaved, setJustSaved] = useState(false);
  const save = useSaveOpportunity();
  const unsave = useUnsaveOpportunity();
  const busy = save.isPending || unsave.isPending;

  const toggleSave = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const next = !saved;
    setSaved(next);
    setJustSaved(next);
    window.setTimeout(() => setJustSaved(false), 900);
    const mutation = next ? save : unsave;
    mutation.mutate({ id: opportunity.id }, {
      onError: () => setSaved(!next),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListOpportunitiesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListSavedOpportunitiesQueryKey() });
      },
    });
  };
  return (
    <div className={cn('scout-rise group relative rounded-[22px] border border-card-border bg-card shadow-[0_8px_0_hsl(var(--foreground)/.045)] transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_12px_0_hsl(var(--foreground)/.07)]', `scout-rise-${Math.min(index + 1, 4)}`)} data-testid={`card-opportunity-${opportunity.id}`}>
      <Link href={`/opportunities/${opportunity.id}`} className="focus-ring block rounded-[22px] p-5 md:p-6" data-testid={`link-opportunity-${opportunity.id}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 font-mono-label text-[11px] font-medium text-primary">{opportunity.organization.slice(0, 2).toUpperCase()}</span>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-muted-foreground">{opportunity.organization}</p>
            <h3 className="mt-1 text-[17px] font-semibold leading-tight tracking-[-0.025em] text-foreground md:text-lg">{opportunity.title}</h3>
          </div>
        </div>
        <span className="size-9 shrink-0" aria-hidden="true" />
      </div>
      <div className="mt-5 flex items-center gap-2">
        <span className="rounded-full bg-secondary px-2.5 py-1 font-mono-label text-[10px] uppercase tracking-[0.08em] text-secondary-foreground">{typeLabels[opportunity.type] ?? opportunity.type}</span>
        <span className="font-mono-label text-[10px] text-muted-foreground">{opportunity.sourceType === 'user_submitted' ? 'Community lead' : 'Scouted'}</span>
      </div>
      <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{opportunity.summary}</p>
      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border/70 pt-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><CalendarDays size={14} /> {deadlineLabel(opportunity.deadline)}</span>
        <span className="flex items-center gap-1.5"><MapPin size={14} /> {opportunity.eligibility.remoteOk ? 'Remote friendly' : opportunity.eligibility.location}</span>
      </div>
      <div className="mt-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono-label text-[11px] font-medium text-primary">{Math.round(opportunity.score)} match</span>
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, opportunity.score)}%` }} /></div>
        </div>
        <span className="flex items-center gap-1 text-xs font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">See why <ArrowUpRight size={14} /></span>
      </div>
      </Link>
      <button type="button" aria-label={saved ? 'Remove from saved' : 'Save opportunity'} onClick={toggleSave} disabled={busy} className={cn('focus-ring absolute right-5 top-5 grid size-9 place-items-center rounded-full border transition-colors md:right-6 md:top-6', saved ? 'border-accent bg-accent text-accent-foreground' : 'border-border bg-card text-muted-foreground hover:border-primary hover:text-primary')} data-testid={`button-save-opportunity-${opportunity.id}`}>
        {justSaved ? <Check size={16} className="scout-rise" /> : <Bookmark size={16} fill={saved ? 'currentColor' : 'none'} />}
      </button>
    </div>
  );
}

export { deadlineLabel, typeLabels };