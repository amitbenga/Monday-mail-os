import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  return NextResponse.json({
    connected: Boolean(session.google?.refresh_token),
    email: session.google?.email || null,
  });
}
