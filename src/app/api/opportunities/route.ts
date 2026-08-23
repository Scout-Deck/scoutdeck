import { NextResponse } from "next/server";
import {
  ListOpportunitiesQueryParams,
  SubmitOpportunityBody,
} from "@/lib/api-zod";
import { parseJsonBody, parseQueryParams } from "@/lib/api/validate";
import { listOpportunities, submitOpportunity } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = parseQueryParams(ListOpportunitiesQueryParams, searchParams);
  if ("error" in parsed) {
    return parsed.error;
  }

  const opportunities = await listOpportunities(parsed.data);
  return NextResponse.json(opportunities);
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

  const opportunity = await submitOpportunity(parsed.data);
  return NextResponse.json(opportunity, { status: 201 });
}
