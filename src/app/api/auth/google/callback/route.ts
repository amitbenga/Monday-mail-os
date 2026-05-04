import { NextResponse } from "next/server";
import { exchangeCode } from "@/lib/gmail";
import { getSession } from "@/lib/session";

export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const session = await getSession();

  const expected = (session as any).oauth_state;
  if (!code || !state || !expected || state !== expected) {
    return NextResponse.redirect(`${origin}/?error=oauth_state_mismatch`);
  }
  delete (session as any).oauth_state;

  try {
    const { tokens, email } = await exchangeCode(code);
    session.google = {
      refresh_token: tokens.refresh_token || session.google?.refresh_token,
      access_token: tokens.access_token || undefined,
      expiry_date: tokens.expiry_date || undefined,
      email,
    };
    await session.save();
    return NextResponse.redirect(`${origin}/?connected=1`);
  } catch (e: any) {
    return NextResponse.redirect(`${origin}/?error=${encodeURIComponent(e.message || "oauth_failed")}`);
  }
}
