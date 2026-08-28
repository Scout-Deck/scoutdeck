"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { LogIn, UserPlus, Mail, Lock, AlertCircle, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Mode = "sign-in" | "sign-up";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const callbackError =
    typeof window === "undefined"
      ? ""
      : (new URLSearchParams(window.location.search).get("error") ?? "");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setError("");
    setMessage("");

    try {
      const supabase = createClient();
      const result =
        mode === "sign-in"
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({ email, password });

      if (result.error) {
        setError(result.error.message);
        return;
      }

      if (!result.data.session) {
        if (mode === "sign-up" && result.data.user?.identities?.length === 0) {
          setMode("sign-in");
          setMessage(
            "An account already exists or is awaiting confirmation. Check your email, then sign in.",
          );
        } else {
          setMessage(
            "Account created. Check your email to confirm it, then sign in.",
          );
        }
        return;
      }

      const user = result.data.user;
      if (user) {
        const { error: profileError } = await supabase
          .from("profiles")
          .upsert({ id: user.id }, { onConflict: "id" });
        if (profileError) {
          setError(
            "Signed in, but we could not prepare your profile. Please try again.",
          );
          return;
        }
      }

      const nextPath = new URLSearchParams(window.location.search).get("next");
      router.replace(nextPath?.startsWith("/") ? nextPath : "/dashboard");
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to reach the authentication service.",
      );
    } finally {
      setPending(false);
    }
  };

  const switchMode = () => {
    setMode(mode === "sign-in" ? "sign-up" : "sign-in");
    setError("");
    setMessage("");
  };

  return (
    <main className="grain grid min-h-dvh place-items-center bg-background p-6">
      <section className="w-full max-w-md rounded-[28px] border border-card-border bg-card p-7 shadow-[0_10px_0_hsl(var(--foreground)/.06)] sm:p-9">
        <div className="flex items-center gap-3">
          <Image
            src="/icon.jpg"
            alt="ScoutDeck"
            width={40}
            height={40}
            className="size-10 rounded-xl"
            priority
          />
          <p className="font-mono-label text-[10px] uppercase tracking-[.18em] text-primary">
            ScoutDeck
          </p>
        </div>

        <h1 className="mt-6 text-3xl font-semibold tracking-[-.06em]">
          {mode === "sign-in" ? "Welcome back." : "Start your search."}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Save your profile, then we&rsquo;ll scout opportunities that deserve
          your attention.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
          <button
            type="button"
            onClick={() => mode !== "sign-in" && switchMode()}
            className={`focus-ring h-9 rounded-lg text-xs font-semibold transition-colors ${
              mode === "sign-in"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => mode !== "sign-up" && switchMode()}
            className={`focus-ring h-9 rounded-lg text-xs font-semibold transition-colors ${
              mode === "sign-up"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Create account
          </button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={submit} noValidate>
          <label className="block text-xs font-semibold">
            Email
            <div className="relative mt-2">
              <Mail
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                className="focus-ring h-11 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </div>
          </label>

          <label className="block text-xs font-semibold">
            Password
            <div className="relative mt-2">
              <Lock
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                className="focus-ring h-11 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary"
                type="password"
                placeholder={mode === "sign-in" ? "Your password" : "At least 6 characters"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={
                  mode === "sign-in" ? "current-password" : "new-password"
                }
                minLength={6}
                required
              />
            </div>
          </label>

          {(error || callbackError) && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
            >
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error || callbackError}</span>
            </div>
          )}
          {message && (
            <div
              role="status"
              className="flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/10 px-3 py-2.5 text-sm text-primary"
            >
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          <button
            className="focus-ring flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={pending}
          >
            {pending ? (
              <span className="size-4 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" />
            ) : mode === "sign-in" ? (
              <LogIn size={16} />
            ) : (
              <UserPlus size={16} />
            )}
            {pending
              ? "Working…"
              : mode === "sign-in"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>

        <div className="mt-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-card-border" />
          <span className="font-mono-label text-[10px] uppercase tracking-[.14em] text-muted-foreground">
            or
          </span>
          <span className="h-px flex-1 bg-card-border" />
        </div>

        <Link
          href="/guest"
          className="focus-ring mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-input bg-background text-sm font-semibold text-foreground transition-colors hover:bg-muted"
        >
          Try as guest
        </Link>
      </section>
    </main>
  );
}