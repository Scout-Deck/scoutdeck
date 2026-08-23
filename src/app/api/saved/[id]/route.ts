import { NextResponse } from "next/server";
import { saveOpportunity, unsaveOpportunity } from "@/lib/db";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const saved = await saveOpportunity(id);

  if (!saved) {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  await unsaveOpportunity(id);
  return new NextResponse(null, { status: 204 });
}
