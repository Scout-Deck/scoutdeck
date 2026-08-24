import { NextResponse } from "next/server";
import { GetOpportunityParams } from "@/lib/api-zod";
import { parsePathParams, withAuthError } from "@/lib/api/validate";
import { getOpportunity } from "@/lib/db";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const parsed = parsePathParams(GetOpportunityParams, { id });
  if ("error" in parsed) {
    return parsed.error;
  }

  const result = await withAuthError(() => getOpportunity(parsed.data.id));
  if (result instanceof NextResponse) return result;

  if (!result) {
    return new NextResponse(null, { status: 404 });
  }

  return NextResponse.json(result);
}
