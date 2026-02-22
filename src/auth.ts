import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import { users, accounts, sessions, verificationTokens } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { authConfig } from "./auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    GitHub,
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await db.query.users.findFirst({
          where: eq(users.email, credentials.email as string),
        });
        if (!user?.passwordHash) return null;
        const valid = await Bun.password.verify(
          credentials.password as string,
          user.passwordHash,
        );
        if (!valid) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      if (account?.provider === "github") {
        // Block if email already used with password account
        const existing = await db.query.users.findFirst({
          where: eq(users.email, user.email!),
        });
        if (existing?.passwordHash) {
          return "/auth/error?error=OAuthAccountNotLinked";
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "user";
      }
      if (token.id && !token.role) {
        // Refresh role from DB on subsequent requests
        const dbUser = await db.query.users.findFirst({
          where: eq(users.id, token.id as string),
        });
        token.role = dbUser?.role ?? "user";
      }
      return token;
    },
    async session({ session, token, user }) {
      if (session.user) {
        // JWT strategy (Credentials login): role comes from token
        if (token?.id) {
          session.user.id = token.id as string;
          session.user.role = (token.role as string) ?? "user";
        }
        // Database strategy (OAuth / GitHub login): DrizzleAdapter only passes
        // standard fields, so we must query the DB for the role ourselves.
        if (user?.id) {
          session.user.id = user.id;
          const dbUser = await db.query.users.findFirst({
            where: eq(users.id, user.id),
            columns: { role: true },
          });
          session.user.role = dbUser?.role ?? "user";
        }
      }
      return session;
    },
  },
});
