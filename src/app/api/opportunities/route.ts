import { NextResponse } from "next/server";
import { listOpportunities, submitOpportunity } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const typeParam = searchParams.get("type");
  const type =
    typeParam === null ? undefined : typeParam === "null" ? null : typeParam;
  const userSubmittedOnly =
    searchParams.get("userSubmittedOnly") === "true";

  const opportunities = await listOpportunities({ type, userSubmittedOnly });
  return NextResponse.json(opportunities);
}

export async function POST(request: Request) {
  const body = (await request.json()) as { url: string; notes?: string };
  const opportunity = await submitOpportunity(body);
  return NextResponse.json(opportunity, { status: 201 });
}
