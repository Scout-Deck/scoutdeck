import { NextResponse } from "next/server";
import { withAuthError } from "@/lib/api/validate";
import { listSavedOpportunities } from "@/lib/db";

export async function GET() {
  const result = await withAuthError(() => listSavedOpportunities());
  if (result instanceof NextResponse) return result;

  return NextResponse.json(result);
}
