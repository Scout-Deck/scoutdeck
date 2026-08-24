'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { Check, CircleHelp, Save, UserRound } from 'lucide-react';
import { getGetProfileQueryKey, useGetProfile, useUpdateProfile, type ProfileInput } from '@/lib/api-client';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

type ProfileForm = {
  name: string;
  educationLevel: string;
  fieldOfStudy: string;
  skills: string;
  interests: string;
  location: string;
  remoteOk: boolean;
  opportunityTypes: string[];
  experienceLevel: string;
};

const opportunityTypes = [
  { value: 'internship', label: 'Internships' }, { value: 'fellowship', label: 'Fellowships' }, { value: 'hackathon', label: 'Hackathons' },
  { value: 'scholarship', label: 'Scholarships' }, { value: 'grant', label: 'Grants' }, { value: 'job', label: 'Early-career jobs' },
];

// NOTE: this was pages/profile.tsx, mounted at "/profile". Now src/app/profile/page.tsx.
export default function Profile() {
  const profileQuery = useGetProfile();
  const update = useUpdateProfile();
  const queryClient = useQueryClient();
  const [savedNotice, setSavedNotice] = useState(false);
  const form = useForm<ProfileForm>({ defaultValues: { name: '', educationLevel: '', fieldOfStudy: '', skills: '', interests: '', location: '', remoteOk: true, opportunityTypes: ['internship', 'fellowship', 'job'], experienceLevel: 'student' } });
  const values = useWatch({ control: form.control });
  const completion = useMemo(() => {
    const checks = [values.name, values.educationLevel, values.fieldOfStudy, values.skills, values.interests, values.location, values.opportunityTypes?.length, values.experienceLevel];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [values]);

  useEffect(() => {
    if (profileQuery.data) {
      form.reset({ ...profileQuery.data, skills: profileQuery.data.skills.join(', '), opportunityTypes: profileQuery.data.opportunityTypes });
    }
  }, [profileQuery.data, form]);

  const onSubmit = (data: ProfileForm) => {
    const payload: ProfileInput = { ...data, skills: data.skills.split(',').map((skill) => skill.trim()).filter(Boolean), opportunityTypes: data.opportunityTypes as ProfileInput['opportunityTypes'], experienceLevel: data.experienceLevel as ProfileInput['experienceLevel'] };
    update.mutate({ data: payload }, { onSuccess: (profile) => {
      queryClient.setQueryData(getGetProfileQueryKey(), profile);
      setSavedNotice(true);
      window.setTimeout(() => setSavedNotice(false), 2200);
    } });
  };
  const toggleType = (type: string) => {
    const current = form.getValues('opportunityTypes') ?? [];
    form.setValue('opportunityTypes', current.includes(type) ? current.filter((item) => item !== type) : [...current, type], { shouldDirty: true });
  };

  if (profileQuery.isLoading) return <div className="animate-pulse"><div className="h-4 w-24 rounded bg-muted" /><div className="mt-5 h-14 w-72 rounded bg-muted" /><div className="mt-9 h-96 max-w-3xl rounded-[24px] bg-muted" /></div>;
  return <div className="max-w-[850px]"><div className="flex flex-col justify-between gap-6 md:flex-row md:items-end"><div><p className="font-mono-label text-[10px] uppercase tracking-[.2em] text-primary">Your starting point</p><h1 className="mt-2 text-[2.65rem] font-semibold leading-none tracking-[-.065em]">Your profile.</h1><p className="mt-4 max-w-[500px] text-sm leading-relaxed text-muted-foreground">Tell ScoutDeck what a good next step looks like. You can change this anytime as your direction sharpens.</p></div><div className="flex items-center gap-3"><div className="relative size-14"><svg viewBox="0 0 36 36" className="size-14 -rotate-90"><circle cx="18" cy="18" r="15.5" fill="none" stroke="hsl(var(--secondary))" strokeWidth="3" /><circle cx="18" cy="18" r="15.5" fill="none" stroke="hsl(var(--primary))" strokeWidth="3" strokeDasharray={`${completion} 100`} strokeLinecap="round" /></svg><span className="absolute inset-0 grid place-items-center font-mono-label text-[10px]">{completion}%</span></div><div><p className="text-xs font-semibold">Signal strength</p><p className="mt-0.5 text-xs text-muted-foreground">{completion >= 80 ? 'Looking clear.' : 'A little more context helps.'}</p></div></div></div>
    <Form {...form}><form onSubmit={form.handleSubmit(onSubmit)} className="mt-9 space-y-6">
      <section className="rounded-[24px] border border-card-border bg-card p-5 shadow-[0_7px_0_hsl(var(--foreground)/.04)] md:p-7"><div className="flex items-start gap-3 border-b border-border pb-5"><span className="grid size-10 place-items-center rounded-xl bg-accent/60 text-accent-foreground"><UserRound size={19} /></span><div><h2 className="font-semibold tracking-[-.03em]">The basics</h2><p className="mt-1 text-xs text-muted-foreground">The human behind the search.</p></div></div><div className="mt-6 grid gap-5 md:grid-cols-2">
        <FormField control={form.control} name="name" rules={{ required: 'Add your name.' }} render={({ field }) => <FormItem><FormLabel className="text-xs font-semibold">Name</FormLabel><FormControl><Input {...field} placeholder="What should we call you?" className="mt-2 h-11 rounded-xl bg-background" data-testid="input-profile-name" /></FormControl><FormMessage /></FormItem>} />
        <FormField control={form.control} name="location" render={({ field }) => <FormItem><FormLabel className="text-xs font-semibold">Based in</FormLabel><FormControl><Input {...field} placeholder="City, country or region" className="mt-2 h-11 rounded-xl bg-background" data-testid="input-profile-location" /></FormControl></FormItem>} />
        <FormField control={form.control} name="educationLevel" render={({ field }) => <FormItem><FormLabel className="text-xs font-semibold">Education level</FormLabel><FormControl><select {...field} className="focus-ring mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none" data-testid="select-profile-education"><option value="">Choose one</option><option value="High school">High school</option><option value="Undergraduate">Undergraduate</option><option value="Graduate">Graduate</option><option value="Bootcamp or self-taught">Bootcamp or self-taught</option></select></FormControl></FormItem>} />
        <FormField control={form.control} name="fieldOfStudy" render={({ field }) => <FormItem><FormLabel className="text-xs font-semibold">Field of study</FormLabel><FormControl><Input {...field} placeholder="What are you learning?" className="mt-2 h-11 rounded-xl bg-background" data-testid="input-profile-field" /></FormControl></FormItem>} />
      </div></section>
      <section className="rounded-[24px] border border-card-border bg-card p-5 shadow-[0_7px_0_hsl(var(--foreground)/.04)] md:p-7"><div className="border-b border-border pb-5"><h2 className="font-semibold tracking-[-.03em]">Your direction</h2><p className="mt-1 text-xs text-muted-foreground">Useful signals, not a permanent label.</p></div><div className="mt-6 space-y-5">
        <FormField control={form.control} name="skills" render={({ field }) => <FormItem><FormLabel className="text-xs font-semibold">Skills</FormLabel><FormControl><Input {...field} placeholder="Research, Python, writing…" className="mt-2 h-11 rounded-xl bg-background" data-testid="input-profile-skills" /></FormControl><p className="text-[11px] text-muted-foreground">Separate each skill with a comma.</p></FormItem>} />
        <FormField control={form.control} name="interests" render={({ field }) => <FormItem><FormLabel className="text-xs font-semibold">What are you curious about?</FormLabel><FormControl><Textarea {...field} placeholder="The questions, communities or problems that keep pulling you in." className="mt-2 min-h-[96px] resize-none rounded-xl bg-background" data-testid="input-profile-interests" /></FormControl></FormItem>} />
        <FormField control={form.control} name="experienceLevel" render={({ field }) => <FormItem><FormLabel className="text-xs font-semibold">Where are you in the journey?</FormLabel><FormControl><div className="mt-2 grid gap-2 sm:grid-cols-3">{[{ value: 'student', label: 'Student' }, { value: 'recent_grad', label: 'Recent graduate' }, { value: 'early_career', label: 'Early career' }].map((item) => <button type="button" key={item.value} onClick={() => field.onChange(item.value)} className={`focus-ring rounded-xl border px-3 py-3 text-left text-xs font-medium transition-colors ${field.value === item.value ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted'}`} data-testid={`button-experience-${item.value}`}>{field.value === item.value && <Check size={14} className="mb-1" />}{item.label}</button>)}</div></FormControl></FormItem>} />
      </div></section>
      <section className="rounded-[24px] border border-card-border bg-card p-5 shadow-[0_7px_0_hsl(var(--foreground)/.04)] md:p-7"><div className="border-b border-border pb-5"><h2 className="font-semibold tracking-[-.03em]">What should we scout?</h2><p className="mt-1 text-xs text-muted-foreground">Pick every door you&rsquo;d be happy to open.</p></div><div className="mt-6 grid gap-2 sm:grid-cols-2">{opportunityTypes.map((item) => { const active = values.opportunityTypes?.includes(item.value); return <button type="button" key={item.value} onClick={() => toggleType(item.value)} className={`focus-ring flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors ${active ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted'}`} data-testid={`button-type-${item.value}`}>{item.label}{active && <Check size={16} />}</button>; })}</div><div className="mt-6 flex items-center justify-between gap-4 rounded-xl bg-muted/70 px-4 py-3"><div><p className="text-sm font-medium">Include remote opportunities</p><p className="mt-0.5 text-xs text-muted-foreground">We&rsquo;ll still show local matches when they&rsquo;re strong.</p></div><FormField control={form.control} name="remoteOk" render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-profile-remote" />} /></div></section>
      {profileQuery.isError && <p className="flex items-center gap-2 text-sm text-destructive" data-testid="status-profile-error"><CircleHelp size={15} /> We couldn&rsquo;t load your existing profile. You can still start fresh.</p>}
      <div className="sticky bottom-20 z-10 flex items-center justify-end gap-4 rounded-2xl border border-border/70 bg-background/90 p-3 backdrop-blur-xl md:bottom-4"><span className={`text-xs text-primary transition-opacity ${savedNotice ? 'opacity-100' : 'opacity-0'}`} data-testid="status-profile-saved"><Check size={14} className="mr-1 inline" /> Profile updated</span><button type="submit" disabled={update.isPending} className="focus-ring inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60" data-testid="button-save-profile"><Save size={16} /> {update.isPending ? 'Saving…' : 'Save profile'}</button></div>
    </form></Form>
  </div>;
}
