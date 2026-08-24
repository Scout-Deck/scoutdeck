import { NextResponse } from "next/server";
import { SaveOpportunityParams } from "@/lib/api-zod";
import { parsePathParams, withAuthError } from "@/lib/api/validate";
import { saveOpportunity, unsaveOpportunity } from "@/lib/db";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const parsed = parsePathParams(SaveOpportunityParams, { id });
  if ("error" in parsed) {
    return parsed.error;
  }

  const result = await withAuthError(() => saveOpportunity(parsed.data.id));
  if (result instanceof NextResponse) return result;

  if (!result) {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const parsed = parsePathParams(SaveOpportunityParams, { id });
  if ("error" in parsed) {
    return parsed.error;
  }

  const result = await withAuthError(() => unsaveOpportunity(parsed.data.id));
  if (result instanceof NextResponse) return result;

  return new NextResponse(null, { status: 204 });
}
