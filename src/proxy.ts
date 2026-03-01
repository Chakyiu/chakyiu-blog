import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Use the edge-safe config (no DB) for middleware JWT verification.
const { auth } = NextAuth(authConfig);

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 10; // requests per window per IP per endpoint

const rateLimitStore = new Map<string, RateLimitEntry>();

function isRateLimited(ip: string, endpoint: string): boolean {
  const key = `${ip}:${endpoint}`;
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX;
}

// Periodically purge expired entries to prevent unbounded memory growth in long-running processes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}, RATE_LIMIT_WINDOW_MS);

const SECURITY_HEADERS: Record<string, string> = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'",
};

function applySecurityHeaders(response: NextResponse): void {
  for (const [header, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(header, value);
  }
}

const RATE_LIMITED_PATHS = [
  "/api/auth/signin",
  "/api/auth/callback/credentials",
  "/api/auth/register",
];

export default auth((req: NextRequest & { auth: unknown }) => {
  const { pathname } = req.nextUrl;

  if (
    req.method === "POST" &&
    RATE_LIMITED_PATHS.some((p) => pathname.startsWith(p))
  ) {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      (req as NextRequest & { ip?: string }).ip ??
      "127.0.0.1";

    if (isRateLimited(ip, pathname)) {
      return new NextResponse("Too Many Requests", {
        status: 429,
        headers: {
          "Retry-After": "60",
          "Content-Type": "text/plain",
        },
      });
    }
  }

  const response = NextResponse.next();
  applySecurityHeaders(response);
  return response;
});

export const config = {
  // Exclude /api/auth/* so auth callbacks are handled by the nodejs-runtime
  // API route (/api/auth/[...nextauth]/route.ts) where the database is available.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
};
