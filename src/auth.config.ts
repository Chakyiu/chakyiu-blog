/**
 * Edge-compatible auth configuration — NO database imports.
 *
 * Used by:
 *  - src/middleware.ts (edge runtime): JWT verification only, no DB access.
 *
 * The full config (adapter + DB callbacks) lives in src/auth.ts and is used
 * exclusively by API route handlers (/api/auth/[...nextauth]) which run in
 * the Node.js runtime where bun:sqlite is available.
 */
import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
  // Providers are intentionally omitted here — they are added in auth.ts.
  // The edge middleware only needs to verify the JWT; it never processes
  // sign-in or OAuth callbacks.
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      // On initial sign-in the user object is populated; persist id + role.
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "user";
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
};
