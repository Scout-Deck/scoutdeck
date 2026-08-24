import 'server-only';

import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

// Server-side Supabase client. Reads/writes the session via Next's cookie
// store, so it works inside Route Handlers, Server Components, and Server
// Actions. `server-only` guarantees this file (and anything that imports it)
// can never end up in a client bundle.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // setAll is called from a Server Component in some cases (e.g.
            // during a GET render). Next disallows cookie writes there — this
            // is safe to ignore as long as middleware refreshes the session.
          }
        },
      },
    },
  );
}

/**
 * Returns the current authenticated user's id, or throws a 401-friendly
 * error if there isn't one. Every db.ts function that's scoped to "the
 * current user" (profile, saved opportunities) should call this first.
 */
export async function requireUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new UnauthorizedError();
  }

  return user.id;
}

export class UnauthorizedError extends Error {
  constructor() {
    super('Not authenticated');
    this.name = 'UnauthorizedError';
  }
}
