import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  // Required on Vercel (and other platforms without a static AUTH_URL) —
  // the platform's edge network sets the Host header correctly and
  // terminates TLS itself, so trusting it here is safe. Without this,
  // Auth.js rejects every request in production with "UntrustedHost".
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
