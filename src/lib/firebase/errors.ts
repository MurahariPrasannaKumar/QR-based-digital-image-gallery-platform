const MESSAGES: Record<string, string> = {
  "auth/email-already-in-use": "An account with this email already exists.",
  "auth/invalid-email": "Enter a valid email address.",
  "auth/weak-password": "Password must be at least 6 characters.",
  "auth/invalid-credential": "Invalid email or password.",
  "auth/user-not-found": "Invalid email or password.",
  "auth/wrong-password": "Invalid email or password.",
  "auth/too-many-requests": "Too many attempts. Please try again later.",
  "auth/expired-action-code": "This link is invalid or has expired.",
  "auth/invalid-action-code": "This link is invalid or has expired.",
};

export function firebaseErrorMessage(err: unknown): string {
  const code = (err as { code?: string } | null)?.code;
  return (code && MESSAGES[code]) || "Something went wrong. Please try again.";
}
