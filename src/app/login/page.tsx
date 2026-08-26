'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowUpRight, Check, Compass, Eye, EyeOff, LogIn, Sparkles, UserPlus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Mode = 'sign-in' | 'sign-up';

const signalPoints = [
  { label: 'Live openings', tone: 'bg-primary', position: 'left-[20%] top-[22%]' },
  { label: 'Your profile', tone: 'bg-accent', position: 'right-[18%] top-[42%]' },
  { label: 'A clear next move', tone: 'bg-[#a7d8be]', position: 'bottom-[18%] left-[42%]' },
];

function BrandMark() {
  return <span className="grid size-10 place-items-center rounded-[13px] bg-primary text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,.24)]"><Compass size={20} strokeWidth={2.1} aria-hidden="true" /></span>;
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const callbackError = typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('error') ?? '';
  const displayError = error || callbackError;
  const isSignIn = mode === 'sign-in';

  const switchMode = () => {
    setMode(isSignIn ? 'sign-up' : 'sign-in');
    setError('');
    setMessage('');
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setError('');
    setMessage('');

    try {
      const supabase = createClient();
      const result = isSignIn
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth/confirm` } });

      if (result.error) {
        setError(result.error.message);
        return;
      }

      if (!result.data.session) {
        setMessage('Your account is ready. Check your email to confirm it, then sign in.');
        return;
      }

      const user = result.data.user;
      if (user) {
        const { error: profileError } = await supabase.from('profiles').upsert({ id: user.id }, { onConflict: 'id' });
        if (profileError) {
          setError('Signed in, but we could not prepare your profile. Please try again.');
          return;
        }
      }

      const nextPath = new URLSearchParams(window.location.search).get('next');
      router.replace(nextPath?.startsWith('/') ? nextPath : '/dashboard');
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to reach the authentication service.');
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="relative min-h-dvh overflow-hidden bg-background px-4 py-4 text-foreground sm:p-6 lg:p-8">
      <div className="pointer-events-none absolute -left-28 top-1/4 size-80 rounded-full bg-primary/10 blur-[110px]" />
      <div className="pointer-events-none absolute -right-32 bottom-0 size-96 rounded-full bg-accent/15 blur-[130px]" />

      <div className="relative mx-auto grid min-h-[calc(100dvh-2rem)] max-w-[1440px] overflow-hidden rounded-[28px] border border-card-border bg-card shadow-[0_28px_90px_rgba(20,52,46,.13)] sm:min-h-[calc(100dvh-3rem)] lg:grid-cols-[1.05fr_.95fr] lg:rounded-[34px]">
        <section className="relative hidden min-h-[700px] overflow-hidden bg-sidebar p-9 text-sidebar-foreground lg:flex lg:flex-col xl:p-12">
          <div className="absolute -right-28 -top-32 size-[430px] rounded-full border border-primary/20" />
          <div className="absolute -right-5 -top-4 size-64 rounded-full border border-primary/20" />
          <div className="absolute -bottom-36 -left-24 size-[460px] rounded-full border border-white/10" />
          <div className="absolute bottom-[18%] left-[19%] h-px w-[58%] -rotate-[28deg] bg-primary/30" />
          <div className="absolute left-[44%] top-[29%] h-px w-[37%] rotate-[43deg] bg-white/15" />

          <Link href="/" className="focus-ring relative flex w-fit items-center gap-3 rounded-lg" aria-label="ScoutDeck home"><BrandMark /><span className="text-xl font-semibold tracking-[-.055em]">ScoutDeck</span></Link>

          <div className="relative mt-auto max-w-[530px] pb-7 pt-28 xl:pb-10">
            <p className="flex items-center gap-2 font-mono-label text-[10px] font-medium uppercase tracking-[.18em] text-primary"><span className="size-1.5 rounded-full bg-primary" />Opportunity intelligence</p>
            <h1 className="mt-6 text-balance text-[clamp(3.4rem,5vw,5.6rem)] font-semibold leading-[.88] tracking-[-.085em]">Make your next move feel <span className="text-primary">obvious.</span></h1>
            <p className="mt-7 max-w-md text-base leading-relaxed text-sidebar-foreground/68">ScoutDeck turns your direction into a considered shortlist of opportunities worth your attention.</p>

            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-sidebar-foreground/78">
              {['Live web scouting', 'A short deck with reasons'].map((item) => <span key={item} className="flex items-center gap-2"><Check size={16} className="text-primary" aria-hidden="true" />{item}</span>)}
            </div>
          </div>

          <div className="relative h-40 border-t border-sidebar-border/80 pt-5">
            <p className="font-mono-label text-[10px] uppercase tracking-[.16em] text-sidebar-foreground/55">Your signal map</p>
            {signalPoints.map((point) => <div key={point.label} className={`absolute ${point.position} flex items-center gap-2`}><span className={`grid size-7 place-items-center rounded-full ${point.tone} text-sidebar`}><Sparkles size={13} aria-hidden="true" /></span><span className="rounded-full border border-white/10 bg-white/[.07] px-2.5 py-1 font-mono-label text-[9px] uppercase tracking-[.1em] text-white/78 backdrop-blur-sm">{point.label}</span></div>)}
          </div>
        </section>

        <section className="relative flex min-h-[calc(100dvh-2rem)] flex-col px-5 py-6 sm:px-9 sm:py-9 lg:min-h-0 lg:px-12 lg:py-12 xl:px-16">
          <header className="flex items-center justify-between gap-4 lg:hidden">
            <Link href="/" className="focus-ring flex items-center gap-2.5 rounded-lg" aria-label="ScoutDeck home"><BrandMark /><span className="text-lg font-semibold tracking-[-.055em]">ScoutDeck</span></Link>
            <Link href="/" className="focus-ring inline-flex size-11 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label="Back to ScoutDeck home"><ArrowLeft size={17} aria-hidden="true" /></Link>
          </header>

          <div className="mx-auto flex w-full max-w-[410px] flex-1 flex-col justify-center py-12 lg:py-4">
            <div className="scout-rise">
              <p className="font-mono-label text-[10px] font-medium uppercase tracking-[.18em] text-primary">Your ScoutDeck</p>
              <h2 className="mt-4 text-balance text-[clamp(2.6rem,4vw,3.7rem)] font-semibold leading-[.92] tracking-[-.075em]">{isSignIn ? 'Welcome back.' : 'Start with a direction.'}</h2>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">{isSignIn ? 'Pick up where your search left off.' : 'Create your account and we’ll build a more useful opportunity search around you.'}</p>
            </div>

            <div className="scout-rise scout-rise-1 mt-9 grid grid-cols-2 rounded-xl border border-border bg-muted/55 p-1" role="tablist" aria-label="Authentication options">
              <button type="button" role="tab" aria-selected={isSignIn} onClick={() => !isSignIn && switchMode()} className={`focus-ring min-h-10 rounded-lg px-3 text-sm font-semibold transition-all ${isSignIn ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>Sign in</button>
              <button type="button" role="tab" aria-selected={!isSignIn} onClick={() => isSignIn && switchMode()} className={`focus-ring min-h-10 rounded-lg px-3 text-sm font-semibold transition-all ${!isSignIn ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>Create account</button>
            </div>

            <form className="scout-rise scout-rise-2 mt-7 space-y-5" onSubmit={submit} noValidate>
              <div>
                <label htmlFor="email" className="text-sm font-semibold">Email address</label>
                <input id="email" className="focus-ring mt-2 h-12 w-full rounded-xl border border-input bg-background px-3.5 text-base outline-none transition-colors placeholder:text-muted-foreground/75 hover:border-primary/45 focus:border-primary" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" inputMode="email" placeholder="you@example.com" required aria-describedby={displayError ? 'auth-message' : undefined} />
              </div>
              <div>
                <div className="flex items-baseline justify-between gap-4"><label htmlFor="password" className="text-sm font-semibold">Password</label>{!isSignIn && <span className="text-xs text-muted-foreground">At least 6 characters</span>}</div>
                <div className="relative mt-2"><input id="password" className="focus-ring h-12 w-full rounded-xl border border-input bg-background px-3.5 pr-12 text-base outline-none transition-colors placeholder:text-muted-foreground/75 hover:border-primary/45 focus:border-primary" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={isSignIn ? 'current-password' : 'new-password'} placeholder="Enter your password" minLength={6} required aria-describedby={displayError ? 'auth-message' : undefined} /><button type="button" onClick={() => setShowPassword((visible) => !visible)} className="focus-ring absolute inset-y-1.5 right-1.5 grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}>{showPassword ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}</button></div>
              </div>

              {displayError && <p id="auth-message" role="alert" className="rounded-xl border border-destructive/25 bg-destructive/5 px-3.5 py-3 text-sm leading-relaxed text-destructive">{displayError}</p>}
              {message && <p id="auth-message" role="status" className="rounded-xl border border-primary/25 bg-primary/10 px-3.5 py-3 text-sm leading-relaxed text-primary">{message}</p>}

              <button className="focus-ring flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-[0_10px_22px_hsl(var(--primary)/.18)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_15px_28px_hsl(var(--primary)/.26)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none" type="submit" disabled={pending}>{isSignIn ? <LogIn size={17} aria-hidden="true" /> : <UserPlus size={17} aria-hidden="true" />}{pending ? 'Working…' : isSignIn ? 'Continue to ScoutDeck' : 'Create your ScoutDeck'}<ArrowUpRight size={16} aria-hidden="true" /></button>
            </form>

            <p className="scout-rise scout-rise-3 mt-7 text-center text-sm text-muted-foreground">{isSignIn ? 'New to ScoutDeck?' : 'Already have an account?'} <button type="button" onClick={switchMode} className="focus-ring cursor-pointer rounded font-semibold text-primary underline decoration-primary/35 underline-offset-4 transition-colors hover:text-foreground">{isSignIn ? 'Create an account' : 'Sign in'}</button></p>
          </div>

          <footer className="scout-rise scout-rise-4 flex items-center justify-between gap-4 border-t border-border pt-5 text-xs text-muted-foreground"><span>Find a direction worth following.</span><Link href="/" className="focus-ring inline-flex items-center gap-1.5 rounded font-semibold text-foreground transition-colors hover:text-primary">Explore ScoutDeck <ArrowUpRight size={13} aria-hidden="true" /></Link></footer>
        </section>
      </div>
    </main>
  );
}
