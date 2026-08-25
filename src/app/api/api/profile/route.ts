import { NextResponse } from "next/server";
import { UpdateProfileBody } from "@/lib/api-zod";
import { parseJsonBody, withAuthError } from "@/lib/api/validate";
import { getProfile, updateProfile } from "@/lib/db";

export async function GET() {
  const result = await withAuthError(() => getProfile());
  if (result instanceof NextResponse) return result;

  return NextResponse.json(result);
}

export async function PATCH(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = parseJsonBody(UpdateProfileBody, body);

  if ("error" in parsed) {
    return parsed.error;
  }

  const result = await withAuthError(() => updateProfile(parsed.data));
  if (result instanceof NextResponse) return result;

  return NextResponse.json(result);
}
