import { NextResponse } from "next/server";
import { authUrl } from "@/lib/gmail";
import crypto from "crypto";
import { getSession } from "@/lib/session";

export async function GET() {
  const state = crypto.randomBytes(16).toString("hex");
  const session = await getSession();
  (session as any).oauth_state = state;
  await session.save();
  const url = authUrl(state);
  return NextResponse.redirect(url);
}
