import { NextResponse } from "next/server";
import {
  ListOpportunitiesQueryParams,
  SubmitOpportunityBody,
} from "@/lib/api-zod";
import { parseJsonBody, parseQueryParams, withAuthError } from "@/lib/api/validate";
import { listOpportunities, submitOpportunity } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = parseQueryParams(ListOpportunitiesQueryParams, searchParams);
  if ("error" in parsed) {
    return parsed.error;
  }

  const result = await withAuthError(() => listOpportunities(parsed.data));
  if (result instanceof NextResponse) return result;

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = parseJsonBody(SubmitOpportunityBody, body);
  if ("error" in parsed) {
    return parsed.error;
  }

  const result = await withAuthError(() => submitOpportunity(parsed.data));
  if (result instanceof NextResponse) return result;

  return NextResponse.json(result, { status: 201 });
}
