import { betterAuth } from "better-auth";
import { Pool } from "pg";

let pool: Pool | undefined;
let authInstance: unknown;

export function getAuth() {
  if (authInstance) return authInstance as ReturnType<typeof betterAuth>;

  const connectionString = process.env.DATABASE_URL;
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!connectionString) throw new Error("DATABASE_URL is not configured.");
  if (!secret || secret.length < 32) throw new Error("BETTER_AUTH_SECRET must be at least 32 characters.");

  pool = new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 10_000,
    ssl: connectionString.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
  });

  const originValues = [
    process.env.BETTER_AUTH_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "").split(","),
  ];

  const trustedOrigins = [...new Set(
    originValues
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value))
      .map((value) => value.startsWith("http://") || value.startsWith("https://") ? value : `https://${value}`)
      .map((value) => value.replace(/\/$/, "")),
  )];

  authInstance = betterAuth({
    database: pool,
    secret,
    baseURL: process.env.BETTER_AUTH_URL,
    trustedOrigins,
    emailAndPassword: { enabled: true, minPasswordLength: 10, maxPasswordLength: 128, requireEmailVerification: false },
    session: { cookieCache: { enabled: true, maxAge: 5 * 60 }, expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 },
    rateLimit: { enabled: true, window: 60, max: 10 },
  });

  return authInstance as ReturnType<typeof betterAuth>;
}

// Better Auth CLI discovers a named auth or default export.
// Keep the same instance used by the Next.js route handlers.
export const auth = getAuth();
export default auth;
