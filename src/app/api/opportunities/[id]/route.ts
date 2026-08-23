import { NextResponse } from "next/server";
import { getOpportunity } from "@/lib/db";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const opportunity = await getOpportunity(id);

  if (!opportunity) {
    return new NextResponse(null, { status: 404 });
  }

  return NextResponse.json(opportunity);
}
