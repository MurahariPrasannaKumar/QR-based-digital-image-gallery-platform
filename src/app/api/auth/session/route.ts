import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminAuth } from "@/lib/firebase/admin";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_MS } from "@/lib/session";

/**
 * Exchanges a freshly-issued Firebase ID token (client SDK, < 5 minutes old)
 * for an httpOnly session cookie the server can verify on every request
 * without round-tripping to Firebase.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body." }, { status: 400 });
  }

  const idToken = (body as { idToken?: unknown })?.idToken;
  if (typeof idToken !== "string" || !idToken) {
    return NextResponse.json({ success: false, error: "Missing idToken." }, { status: 400 });
  }

  let sessionCookie: string;
  try {
    sessionCookie = await getAdminAuth().createSessionCookie(idToken, {
      expiresIn: SESSION_MAX_AGE_MS,
    });
  } catch {
    return NextResponse.json({ success: false, error: "Could not create session." }, { status: 401 });
  }

  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, sessionCookie, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_MS / 1000,
  });

  return NextResponse.json({ success: true });
}

export async function DELETE() {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
  return NextResponse.json({ success: true });
}
