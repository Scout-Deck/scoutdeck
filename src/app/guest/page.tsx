'use client';

import Link from 'next/link';
import Image from 'next/image';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Check, Compass, Sparkles } from 'lucide-react';
import { useScout } from '@/lib/scout/use-scout';
import type { OpportunityType, RankedScoutMatch, ScoutProfile } from '@/lib/scout/types';

const storageKey = 'scoutdeck:guest:v1';
const opportunityTypes: Array<{ value: OpportunityType; label: string }> = [
  { value: 'fellowship', label: 'Fellowships' },
  { value: 'builder_program', label: 'Builder programs' },
  { value: 'ambassador_program', label: 'Ambassador programs' },
  { value: 'hackathon', label: 'Hackathons' },
  { value: 'scholarship', label: 'Scholarships' },
  { value: 'grant', label: 'Grants' },
];

type GuestForm = Omit<ScoutProfile, 'id' | 'skills'> & { skills: string };
type GuestStore = { sessionId: string; profile: GuestForm; results: RankedScoutMatch[]; updatedAt: string };

const emptyProfile: GuestForm = {
  name: '',
  educationLevel: '',
  fieldOfStudy: '',
  skills: '',
  experience: '',
  interests: '',
  location: '',
  remoteOk: true,
  opportunityTypes: ['fellowship', 'builder_program'],
  experienceLevel: 'student',
};

function sessionId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `guest-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function readGuestStore(): GuestStore | null {
  try {
    const value = window.localStorage.getItem(storageKey);
    if (!value) return null;
    const parsed = JSON.parse(value) as Partial<GuestStore>;
    if (!parsed.sessionId || !parsed.profile || !Array.isArray(parsed.results)) return null;
    return { sessionId: parsed.sessionId, profile: { ...emptyProfile, ...parsed.profile }, results: parsed.results, updatedAt: parsed.updatedAt ?? '' };
  } catch {
    return null;
  }
}

export default function GuestPage() {
  const [profile, setProfile] = useState<GuestForm>(emptyProfile);
  const [guestSessionId, setGuestSessionId] = useState('');
  const [savedMatches, setSavedMatches] = useState<RankedScoutMatch[]>([]);
  const [formError, setFormError] = useState('');
  const [ready, setReady] = useState(false);
  const scout = useScout({
    endpoint: '/api/guest/scout',
    onComplete(matches) {
      if (!guestSessionId) return;
      const next = { sessionId: guestSessionId, profile, results: matches, updatedAt: new Date().toISOString() };
      window.localStorage.setItem(storageKey, JSON.stringify(next));
      setSavedMatches(matches);
    },
  });

  useEffect(() => {
    const saved = readGuestStore();
    const timer = window.setTimeout(() => {
      setGuestSessionId(saved?.sessionId ?? sessionId());
      if (saved) {
        setProfile(saved.profile);
        setSavedMatches(saved.results);
      }
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const matches = scout.matches.length ? scout.matches : savedMatches;
  const context = useMemo(() => `${profile.fieldOfStudy || 'your field'} · ${profile.experienceLevel.replace('_', ' ')}`, [profile]);
  const update = <K extends keyof GuestForm>(key: K, value: GuestForm[K]) => setProfile((current) => ({ ...current, [key]: value }));
  const toggleType = (type: OpportunityType) => setProfile((current) => ({
    ...current,
    opportunityTypes: current.opportunityTypes.includes(type)
      ? current.opportunityTypes.filter((item) => item !== type)
      : [...current.opportunityTypes, type],
  }));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const skills = profile.skills.split(',').map((skill) => skill.trim()).filter(Boolean);
    if (!profile.name.trim() || !profile.fieldOfStudy.trim() || !profile.interests.trim() || !skills.length || !profile.opportunityTypes.length) {
      setFormError('Add your name, field, skills, interests, and at least one opportunity type.');
      return;
    }
    setFormError('');
    const payload: ScoutProfile = {
      ...profile,
      id: guestSessionId || sessionId(),
      name: profile.name.trim(),
      fieldOfStudy: profile.fieldOfStudy.trim(),
      interests: profile.interests.trim(),
      location: profile.location.trim(),
      skills,
    };
    const guestId = guestSessionId || payload.id;
    if (!guestSessionId) setGuestSessionId(guestId);
    window.localStorage.setItem(storageKey, JSON.stringify({
      sessionId: guestId,
      profile,
      results: savedMatches,
      updatedAt: new Date().toISOString(),
    }));
    await scout.scout(payload);
  };

  return <main className="grain min-h-dvh bg-background px-4 py-5 sm:px-5 sm:py-8 md:px-8 md:py-12">
    <div className="mx-auto max-w-[1040px]">
      <header className="flex min-h-11 items-center justify-between gap-4"><Link href="/login" className="focus-ring flex min-h-11 min-w-0 items-center gap-2.5 rounded-lg"><Image src="/icon.jpg" alt="" width={40} height={40} className="size-9 shrink-0 sm:size-10" priority /><span className="truncate text-lg font-bold tracking-[-.06em]">Scout<span className="text-[#486257]">Deck</span></span></Link><Link href="/login" className="focus-ring inline-flex min-h-11 shrink-0 items-center text-xs font-semibold text-primary underline underline-offset-4">Sign in</Link></header>
      <section className="atlas-frame mt-6 overflow-hidden px-5 py-7 text-sidebar-foreground sm:mt-8 sm:px-6 sm:py-8 md:px-10 md:py-10"><div className="atlas-route -right-20 -top-36 size-[390px]" /><div className="relative max-w-[650px]"><p className="signal-label text-primary">Guest field / private to this browser</p><h1 className="mt-4 text-balance text-[clamp(2.45rem,11vw,4.6rem)] font-medium leading-[.92] tracking-[-.055em] sm:tracking-[-.06em]">Find a few good <span className="signal-display text-primary">directions</span>.</h1><p className="mt-4 max-w-[510px] text-sm leading-relaxed text-sidebar-foreground/70">Try ScoutDeck without an account. Your profile and results stay in this browser until you choose to create one.</p></div></section>
      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <form onSubmit={submit} className="rounded-[24px] border border-card-border bg-card p-5 shadow-[0_7px_0_hsl(var(--foreground)/.04)] md:p-7">
          <div className="flex items-start gap-3 border-b border-border pb-5"><span className="grid size-10 place-items-center rounded-xl bg-accent/60 text-accent-foreground"><Compass size={19} /></span><div><h2 className="font-semibold tracking-[-.03em]">Set your direction</h2><p className="mt-1 text-xs text-muted-foreground">No account or cloud save required.</p></div></div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="text-xs font-semibold">Name<input value={profile.name} onChange={(event) => update('name', event.target.value)} className="focus-ring mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none" required /></label><label className="text-xs font-semibold">Field of study<input value={profile.fieldOfStudy} onChange={(event) => update('fieldOfStudy', event.target.value)} className="focus-ring mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none" placeholder="Design, CS, biology…" required /></label><label className="text-xs font-semibold">Place <span className="font-normal text-muted-foreground">(optional)</span><input value={profile.location} onChange={(event) => update('location', event.target.value)} className="focus-ring mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none" placeholder="Jeddah, Dubai, India…" autoComplete="address-level1" /></label><label className="text-xs font-semibold">Degree <span className="font-normal text-muted-foreground">(optional)</span><select value={profile.educationLevel} onChange={(event) => update('educationLevel', event.target.value)} className="focus-ring mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none"><option value="">Prefer not to say</option><option value="High school">High school</option><option value="Undergraduate">Undergraduate</option><option value="Graduate">Graduate</option><option value="Bootcamp or self-taught">Bootcamp or self-taught</option></select></label></div>
          <label className="mt-4 block text-xs font-semibold">Skills<input value={profile.skills} onChange={(event) => update('skills', event.target.value)} className="focus-ring mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none" placeholder="Research, Python, writing…" required /><span className="mt-1 block text-[11px] font-normal text-muted-foreground">Separate each skill with a comma.</span></label>
          <label className="mt-4 block text-xs font-semibold">What are you curious about?<textarea value={profile.interests} onChange={(event) => update('interests', event.target.value)} className="focus-ring mt-2 min-h-[92px] w-full resize-none rounded-xl border border-input bg-background p-3 text-sm outline-none" placeholder="The problems, communities or questions pulling you in." required /></label>
          <div className="mt-5"><p className="text-xs font-semibold">What should we scout?</p><div className="mt-2 grid gap-2 sm:grid-cols-2">{opportunityTypes.map((type) => { const active = profile.opportunityTypes.includes(type.value); return <button key={type.value} type="button" aria-pressed={active} onClick={() => toggleType(type.value)} className={`focus-ring flex min-h-11 items-center justify-between rounded-xl border px-3 py-2.5 text-left text-xs font-medium ${active ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted'}`}>{type.label}{active && <Check size={14} />}</button>; })}</div></div>
          {formError && <p className="mt-4 text-sm text-destructive" role="alert">{formError}</p>}
          <button type="submit" disabled={!ready || scout.pending} className="focus-ring mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60"><Sparkles size={16} />{scout.pending ? 'Scouting…' : 'Scout as guest'}</button>
          <p className={`mt-3 text-xs ${scout.error ? 'text-destructive' : 'text-muted-foreground'}`} aria-live="polite">{scout.error ?? scout.progress?.message ?? 'We use a focused, six-source search to keep this quick.'}</p>
        </form>
        <section aria-live="polite"><div className="flex items-end justify-between gap-3 border-b border-border pb-4"><div className="min-w-0"><p className="signal-label text-[#486257]">Guest shortlist</p><h2 className="mt-2 wrap-anywhere text-2xl font-medium tracking-[-.055em]">{context}</h2></div><span className="shrink-0 font-mono-label text-[10px] uppercase tracking-[.12em] text-muted-foreground">Local only</span></div>{matches.length ? <div className="mt-5 space-y-4">{matches.map((match) => <article key={match.candidateId} className="border-y border-card-border bg-card p-4 sm:p-5"><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3"><div className="min-w-0"><p className="text-xs text-muted-foreground">{match.opportunity.organization ?? 'Opportunity'}</p><h3 className="mt-1 wrap-anywhere text-lg font-semibold tracking-[-.03em]">{match.opportunity.title}</h3></div><span className="shrink-0 font-mono-label text-xs text-primary">{Math.round(match.score)} match</span></div><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{match.matchReason}</p><a href={match.opportunity.sourceUrl} target="_blank" rel="noopener noreferrer" className="focus-ring mt-3 inline-flex min-h-11 items-center gap-1 rounded px-1 text-xs font-semibold text-primary underline underline-offset-4">View source <ArrowUpRight size={13} /></a></article>)}</div> : <div className="mt-5 border-y border-dashed border-border px-5 py-12 text-center"><Sparkles size={20} className="mx-auto text-primary" /><h3 className="mt-4 font-semibold">Your private shortlist will appear here.</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Fill in a few details, then we’ll show the strongest currently available matches.</p></div>}</section>
      </div>
    </div>
  </main>;
}
