import { NextResponse } from "next/server";
import { listSavedOpportunities } from "@/lib/db";

export async function GET() {
  const opportunities = await listSavedOpportunities();
  return NextResponse.json(opportunities);
}
