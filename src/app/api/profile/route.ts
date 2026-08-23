import { NextResponse } from "next/server";
import { UpdateProfileBody } from "@/lib/api-zod";
import { parseJsonBody } from "@/lib/api/validate";
import { getProfile, updateProfile } from "@/lib/db";

export async function GET() {
  const profile = await getProfile();
  return NextResponse.json(profile);
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

  const profile = await updateProfile(parsed.data);
  return NextResponse.json(profile);
}
