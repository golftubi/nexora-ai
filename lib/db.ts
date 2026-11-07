import { Pool } from "pg";

const globalForDb = globalThis as typeof globalThis & { nexoraPool?: Pool };

export function getDb() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured.");
  if (!globalForDb.nexoraPool) {
    globalForDb.nexoraPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 20_000,
      connectionTimeoutMillis: 10_000,
      ssl: process.env.DATABASE_URL.includes("sslmode=require")
        ? { rejectUnauthorized: false }
        : undefined,
    });
  }
  return globalForDb.nexoraPool;
}
