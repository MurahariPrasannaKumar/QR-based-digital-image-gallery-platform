import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getAdminAuth } from "@/lib/firebase/admin";

export const SESSION_COOKIE_NAME = "session";
export const SESSION_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000; // 14 days — Firebase's max for session cookies

export interface CurrentUser {
  id: string;
  name: string | null;
  email: string | null;
  emailVerified: boolean;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const store = await cookies();
  const sessionCookie = store.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie) return null;

  try {
    const decoded = await getAdminAuth().verifySessionCookie(sessionCookie, true);
    return {
      id: decoded.uid,
      name: (decoded.name as string | undefined) ?? null,
      email: decoded.email ?? null,
      emailVerified: decoded.email_verified ?? false,
    };
  } catch {
    // Missing, expired, malformed, or revoked — all treated as "not signed in".
    return null;
  }
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}
