import { cert, getApps, getApp, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";

function getPrivateKey(): string {
  const key = process.env.FIREBASE_PRIVATE_KEY;
  if (!key) throw new Error("FIREBASE_PRIVATE_KEY is not configured.");
  // .env files can't hold literal newlines — the key is stored with escaped
  // "\n" sequences and unescaped here before handing it to the SDK.
  return key.replace(/\\n/g, "\n");
}

let app: App | null = null;

function getAdminApp(): App {
  if (app) return app;
  app = getApps().length
    ? getApp()
    : initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: getPrivateKey(),
        }),
      });
  return app;
}

let auth: Auth | null = null;

/**
 * Lazily initialized so importing this module never throws just because
 * FIREBASE_* env vars aren't set yet — the error only surfaces when a
 * request actually needs to verify/create a session.
 */
export function getAdminAuth(): Auth {
  if (!auth) auth = getAuth(getAdminApp());
  return auth;
}
