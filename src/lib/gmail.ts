import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import type { Session } from "./session";

export const GMAIL_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/gmail.compose",
];

export function oauthClient(): OAuth2Client {
  const id = process.env.GOOGLE_CLIENT_ID;
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  const redirect = process.env.GOOGLE_REDIRECT_URI;
  if (!id || !secret || !redirect) {
    throw new Error("Google OAuth env vars are not set (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI)");
  }
  return new google.auth.OAuth2(id, secret, redirect);
}

export function authUrl(state: string): string {
  const c = oauthClient();
  return c.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GMAIL_SCOPES,
    state,
    include_granted_scopes: true,
  });
}

export async function exchangeCode(code: string) {
  const c = oauthClient();
  const { tokens } = await c.getToken(code);
  c.setCredentials(tokens);
  // fetch user email
  const oauth2 = google.oauth2({ version: "v2", auth: c });
  const me = await oauth2.userinfo.get();
  return { tokens, email: me.data.email || undefined };
}

function clientFromSession(session: Session): OAuth2Client {
  const c = oauthClient();
  if (!session.google?.refresh_token) throw new Error("Gmail account is not connected");
  c.setCredentials({
    refresh_token: session.google.refresh_token,
    access_token: session.google.access_token,
    expiry_date: session.google.expiry_date,
  });
  return c;
}

function buildRfc822(opts: { from: string; to: string; subject: string; body: string }): string {
  const headers = [
    `From: ${opts.from}`,
    opts.to ? `To: ${opts.to}` : "",
    `Subject: =?UTF-8?B?${Buffer.from(opts.subject, "utf8").toString("base64")}?=`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
  ].filter(Boolean).join("\r\n");
  return headers + "\r\n\r\n" + opts.body;
}

function toBase64Url(input: string): string {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function createDraft(session: Session, opts: { to?: string; subject: string; body: string }): Promise<{ draftId: string; messageId: string }> {
  const auth = clientFromSession(session);
  const gmail = google.gmail({ version: "v1", auth });
  const from = session.google?.email || "me";
  const raw = toBase64Url(buildRfc822({ from, to: opts.to || "", subject: opts.subject, body: opts.body }));
  const res = await gmail.users.drafts.create({
    userId: "me",
    requestBody: { message: { raw } },
  });
  return { draftId: res.data.id || "", messageId: res.data.message?.id || "" };
}
