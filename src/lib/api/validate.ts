import { NextResponse } from 'next/server';
import type { ZodType, z } from 'zod';
import { UnauthorizedError } from '@/lib/supabase/server';

type ParseResult<T> = { data: T } | { error: NextResponse };

function errorResponse(issues: unknown, status = 400): NextResponse {
  return NextResponse.json({ message: 'Validation failed', issues }, { status });
}

export function parseJsonBody<S extends ZodType>(schema: S, body: unknown): ParseResult<z.infer<S>> {
  const result = schema.safeParse(body);
  if (!result.success) {
    return { error: errorResponse(result.error.issues) };
  }
  return { data: result.data };
}

export function parseQueryParams<S extends ZodType>(
  schema: S,
  searchParams: URLSearchParams,
): ParseResult<z.infer<S>> {
  const raw = Object.fromEntries(searchParams.entries());
  const result = schema.safeParse(raw);
  if (!result.success) {
    return { error: errorResponse(result.error.issues) };
  }
  return { data: result.data };
}

export function parsePathParams<S extends ZodType>(schema: S, params: unknown): ParseResult<z.infer<S>> {
  const result = schema.safeParse(params);
  if (!result.success) {
    return { error: errorResponse(result.error.issues) };
  }
  return { data: result.data };
}

/**
 * Wrap a Route Handler body so UnauthorizedError (thrown by requireUserId()
 * deep inside db.ts) becomes a 401 instead of an unhandled 500. Use this
 * around the db call, not the whole handler, so validation errors above it
 * still return their own responses untouched.
 *
 * Example:
 *   const opportunities = await withAuthError(() => listOpportunities(parsed.data));
 */
export async function withAuthError<T>(fn: () => Promise<T>): Promise<T | NextResponse> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }
    throw err;
  }
}
