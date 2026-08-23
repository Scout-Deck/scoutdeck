import { NextResponse } from "next/server";
import { getProfile, updateProfile, type ProfileInput } from "@/lib/db";

export async function GET() {
  const profile = await getProfile();
  return NextResponse.json(profile);
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as ProfileInput;
  const profile = await updateProfile(body);
  return NextResponse.json(profile);
}
