'use client';

import {
  Component,
  type ComponentType,
  type ErrorInfo,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { Compass, RefreshCw } from 'lucide-react';

export interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  FallbackComponent?: ComponentType<ErrorFallbackProps>;
  /** Changing this clears a caught error. Pass the route to recover on navigation. */
  resetKey?: unknown;
}

interface ErrorBoundaryState {
  error: Error | null;
}

function toError(value: unknown): Error {
  if (value instanceof Error) {
    return value;
  }
  if (typeof value === 'string') {
    return new Error(value);
  }
  try {
    return new Error(JSON.stringify(value));
  } catch {
    return new Error(String(value));
  }
}

function DefaultFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <div className="grain flex min-h-[100dvh] w-full items-center justify-center bg-background p-4 sm:p-6">
      <div className="w-full max-w-lg rounded-[28px] border border-card-border bg-card p-6 text-center shadow-[0_10px_0_hsl(var(--foreground)/.06)] sm:p-9">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent/60 text-accent-foreground"><Compass size={26} aria-hidden="true" /></div>
        <p className="mt-6 font-mono-label text-[10px] uppercase tracking-[.2em] text-primary">Signal interruption</p>
        <h1 className="mt-2 text-balance text-2xl font-semibold tracking-[-.04em]">This trail hit a snag.</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
          Your saved routes are safe. Try this step again, or head back to your shortlist.
        </p>
        {/* Dev only: messages can carry API responses and other internals. */}
        {process.env.NODE_ENV === 'development' ? (
          <pre className="mt-4 overflow-x-auto rounded-xl border border-border bg-card p-3 text-left text-xs text-muted-foreground">
            {error.message || String(error)}
          </pre>
        ) : null}
        <div className="mt-6 flex flex-col-reverse justify-center gap-3 sm:flex-row">
          <Link href="/dashboard" className="focus-ring inline-flex min-h-11 items-center justify-center rounded-full border border-border px-5 text-sm font-semibold hover:bg-muted">Back to shortlist</Link>
          <button type="button" onClick={resetError} className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground"><RefreshCw size={16} aria-hidden="true" /> Try again</button>
        </div>
      </div>
    </div>
  );
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error: toError(error) };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error(
      'ErrorBoundary caught an error:',
      toError(error),
      info.componentStack,
    );
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (
      this.state.error !== null &&
      prevProps.resetKey !== this.props.resetKey
    ) {
      this.resetError();
    }
  }

  resetError = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (error === null) {
      return this.props.children;
    }
    const Fallback = this.props.FallbackComponent ?? DefaultFallback;
    return <Fallback error={error} resetError={this.resetError} />;
  }
}
