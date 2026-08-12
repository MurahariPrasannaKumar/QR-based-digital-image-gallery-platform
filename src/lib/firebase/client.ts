import { initializeApp, getApps, getApp, type FirebaseOptions, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

/**
 * Lazily initialized: these auth forms are client components that also get
 * rendered on the server during prerendering/SSR, where NEXT_PUBLIC_FIREBASE_*
 * may be unset (e.g. a build without real credentials yet). Calling getAuth()
 * eagerly at module scope would throw and fail the build/render before any
 * actual sign-in happens; deferring it until a form handler actually runs
 * (browser-only) avoids that.
 */
export function getFirebaseAuth(): Auth {
  if (!app) app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  if (!auth) auth = getAuth(app);
  return auth;
}
