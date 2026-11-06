import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const SESSION_COOKIE = "echo_session";

function passcode(): string {
  return process.env.APP_PASSCODE ?? "";
}

/** With no passcode set, the app is open — useful locally. */
export function authEnabled(): boolean {
  return passcode().length > 0;
}

export function sessionToken(): string {
  return createHmac("sha256", passcode()).update("echo-session-v1").digest("hex");
}

export async function isAuthed(): Promise<boolean> {
  if (!authEnabled()) return true;
  const jar = await cookies();
  return jar.get(SESSION_COOKIE)?.value === sessionToken();
}

export async function requireAuth(): Promise<void> {
  if (!(await isAuthed())) redirect("/login");
}

export function checkPasscode(input: string): boolean {
  const expected = Buffer.from(passcode());
  const given = Buffer.from(input ?? "");
  if (expected.length === 0 || expected.length !== given.length) return false;
  return timingSafeEqual(expected, given);
}

export async function startSession(): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, sessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}
