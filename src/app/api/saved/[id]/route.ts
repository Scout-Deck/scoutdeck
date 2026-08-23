import { NextResponse } from "next/server";
import { SaveOpportunityParams } from "@/lib/api-zod";
import { parsePathParams } from "@/lib/api/validate";
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

  const saved = await saveOpportunity(parsed.data.id);

  if (!saved) {
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

  await unsaveOpportunity(parsed.data.id);
  return new NextResponse(null, { status: 204 });
}
