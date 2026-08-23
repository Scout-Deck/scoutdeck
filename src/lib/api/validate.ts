import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";

export function validationError(error: ZodError | { message: string }) {
  const message =
    error instanceof ZodError
      ? error.issues.map((issue) => issue.message).join(", ")
      : error.message;
  return NextResponse.json({ message }, { status: 400 });
}

export function parseJsonBody<T>(schema: ZodType<T>, body: unknown) {
  const result = schema.safeParse(body);
  if (!result.success) {
    return { error: validationError(result.error) };
  }
  return { data: result.data };
}

export function parseQueryParams<T>(
  schema: ZodType<T>,
  searchParams: URLSearchParams,
) {
  const raw = Object.fromEntries(searchParams.entries());
  const result = schema.safeParse(raw);
  if (!result.success) {
    return { error: validationError(result.error) };
  }
  return { data: result.data };
}

export function parsePathParams<T>(
  schema: ZodType<T>,
  params: Record<string, string | string[] | undefined>,
) {
  const result = schema.safeParse(params);
  if (!result.success) {
    return { error: validationError(result.error) };
  }
  return { data: result.data };
}
