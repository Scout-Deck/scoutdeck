'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { X, ArrowUpRight, Link2, FileText } from 'lucide-react';
import { useSubmitOpportunity, getListOpportunitiesQueryKey } from '@/lib/api-client';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

type SubmitValues = { url: string; type: 'fellowship' | 'builder_program' | 'ambassador_program' | 'hackathon' | 'scholarship' | 'grant'; notes: string };
type Props = { open: boolean; onOpenChange: (open: boolean) => void };

export function SubmitOpportunityModal({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const [submittedTitle, setSubmittedTitle] = useState('');
  const form = useForm<SubmitValues>({ defaultValues: { url: '', type: 'fellowship', notes: '' } });
  const submit = useSubmitOpportunity();

  if (!open) return null;
  const onSubmit = (values: SubmitValues) => {
    submit.mutate({ data: { url: values.url, type: values.type, notes: values.notes || undefined } }, {
      onSuccess: (opportunity) => {
        setSubmittedTitle(opportunity.title);
        queryClient.invalidateQueries({ queryKey: getListOpportunitiesQueryKey() });
        form.reset();
      },
    });
  };
  const close = () => { if (!submit.isPending) { onOpenChange(false); setSubmittedTitle(''); } };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30 p-0 backdrop-blur-sm sm:items-center sm:p-5" role="dialog" aria-modal="true" data-testid="dialog-submit-opportunity">
      <button type="button" aria-label="Close dialog" onClick={close} className="absolute inset-0 cursor-default" data-testid="button-close-submit-backdrop" />
      <div className="relative z-10 w-full max-w-[510px] rounded-t-[28px] border border-border bg-card p-6 shadow-2xl sm:rounded-[28px] sm:p-8">
        <button type="button" onClick={close} className="focus-ring absolute right-5 top-5 rounded-full p-2 text-muted-foreground hover:bg-muted" data-testid="button-close-submit"><X size={18} /></button>
        {submittedTitle ? (
          <div className="py-8 text-center">
            <div className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-accent text-accent-foreground"><ArrowUpRight size={26} /></div>
            <p className="font-mono-label mb-2 text-[10px] uppercase tracking-[0.18em] text-primary">In the scout queue</p>
            <h2 className="text-balance text-2xl font-semibold tracking-[-0.04em]">Thanks for the lead.</h2>
            <p className="mx-auto mt-3 max-w-[320px] text-sm leading-relaxed text-muted-foreground"><strong className="font-medium text-foreground">{submittedTitle}</strong> is being checked for the next signal refresh.</p>
            <button type="button" onClick={close} className="focus-ring mt-7 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground" data-testid="button-done-submit">Done</button>
          </div>
        ) : (
          <>
            <p className="font-mono-label mb-2 text-[10px] uppercase tracking-[0.18em] text-primary">Open a new trail</p>
            <h2 className="text-2xl font-semibold tracking-[-0.04em]">Share an opportunity</h2>
            <p className="mt-2 max-w-[390px] text-sm leading-relaxed text-muted-foreground">Found something worth a closer look? We’ll add it to the deck after a quick check.</p>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="mt-7 space-y-5">
                <FormField control={form.control} name="url" rules={{ required: 'Add a link so we can find it.' }} render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2 text-xs font-semibold"><Link2 size={14} /> Opportunity link</FormLabel>
                    <FormControl><Input {...field} type="url" placeholder="https://..." className="mt-2 h-11 rounded-xl bg-background" data-testid="input-opportunity-url" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold">Opportunity type</FormLabel>
                    <FormControl><select {...field} className="focus-ring mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none"><option value="fellowship">Fellowship</option><option value="builder_program">Builder program</option><option value="ambassador_program">Ambassador program</option><option value="hackathon">Hackathon</option><option value="scholarship">Scholarship</option><option value="grant">Grant</option></select></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2 text-xs font-semibold"><FileText size={14} /> A note for the scout <span className="font-normal text-muted-foreground">(optional)</span></FormLabel>
                    <FormControl><Textarea {...field} placeholder="What made you save this?" className="mt-2 min-h-[92px] resize-none rounded-xl bg-background" data-testid="input-opportunity-notes" /></FormControl>
                  </FormItem>
                )} />
                {submit.isError && <p className="text-sm text-destructive" data-testid="status-submit-error">That link could not be added. Try again.</p>}
                <button type="submit" disabled={submit.isPending} className="focus-ring flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-60" data-testid="button-submit-opportunity">
                  {submit.isPending ? 'Checking the lead…' : 'Add to the scout queue'} <ArrowUpRight size={16} />
                </button>
              </form>
            </Form>
          </>
        )}
      </div>
    </div>
  );
}
