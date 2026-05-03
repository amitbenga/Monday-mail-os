import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export type Session = {
  google?: {
    refresh_token?: string;
    access_token?: string;
    expiry_date?: number;
    email?: string;
  };
};

export const sessionOptions: SessionOptions = {
  cookieName: "mmo_session",
  password: process.env.SESSION_PASSWORD || "dev_password_change_me_minimum_32_chars_long_pls",
  cookieOptions: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  },
};

export async function getSession() {
  return getIronSession<Session>(cookies(), sessionOptions);
}
