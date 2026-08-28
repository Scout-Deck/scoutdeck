'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { LogIn, UserPlus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Mode = 'sign-in' | 'sign-up';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  const callbackError = typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('error') ?? '';

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setError('');
    setMessage('');

    try {
      const supabase = createClient();
      const result = mode === 'sign-in'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

      if (result.error) {
        setError(result.error.message);
        return;
      }

      // Supabase deliberately returns no session when email confirmation is
      // enabled. The profile row is protected by RLS, so create it only after
      // the user has a real authenticated session (typically their first sign-in).
      if (!result.data.session) {
        if (mode === 'sign-up' && result.data.user?.identities?.length === 0) {
          setMode('sign-in');
          setMessage('An account already exists or is awaiting confirmation. Check your email, then sign in.');
        } else {
          setMessage('Account created. Check your email to confirm it, then sign in.');
        }
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
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to reach the authentication service.');
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="grain grid min-h-dvh place-items-center bg-background p-6">
      <section className="w-full max-w-md rounded-[28px] border border-card-border bg-card p-7 shadow-[0_10px_0_hsl(var(--foreground)/.06)] sm:p-9">
        {/* <div className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground"><Compass size={22} /></div> */}
        <Image src="/icon.jpg" alt="ScoutDeck" width={40} height={40} className="size-10" priority />
        <p className="mt-6 font-mono-label text-[10px] uppercase tracking-[.18em] text-primary">ScoutDeck</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-.06em]">{mode === 'sign-in' ? 'Welcome back.' : 'Start your search.'}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Save your profile, then we&rsquo;ll scout opportunities that deserve your attention.</p>

        <form className="mt-7 space-y-4" onSubmit={submit}>
          <label className="block text-xs font-semibold">Email<input className="focus-ring mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>
          <label className="block text-xs font-semibold">Password<input className="focus-ring mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} minLength={6} required /></label>
          {(error || callbackError) && <p className="text-sm text-destructive">{error || callbackError}</p>}
          {message && <p className="text-sm text-primary">{message}</p>}
          <button className="focus-ring flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-60" type="submit" disabled={pending}>{mode === 'sign-in' ? <LogIn size={16} /> : <UserPlus size={16} />}{pending ? 'Working…' : mode === 'sign-in' ? 'Sign in' : 'Create account'}</button>
        </form>

        <div className="mt-5 flex items-center justify-between gap-4"><button type="button" className="focus-ring text-xs font-semibold text-primary underline underline-offset-4" onClick={() => { setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in'); setError(''); setMessage(''); }}>{mode === 'sign-in' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}</button><Link href="/guest" className="focus-ring text-xs font-semibold text-muted-foreground underline underline-offset-4">Try as guest</Link></div>
      </section>
    </main>
  );
}
