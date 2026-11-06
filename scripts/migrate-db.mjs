import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";

const shouldMigrate = process.env.VERCEL_ENV === "production" || process.env.RUN_DB_MIGRATIONS === "1";
if (!shouldMigrate) {
  console.log("Skipping database migrations outside production. Set RUN_DB_MIGRATIONS=1 to run explicitly.");
  process.exit(0);
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to run Nexora database migrations.");
}

console.log("Applying Better Auth PostgreSQL schema...");
execFileSync("npx", ["auth@latest", "migrate", "--yes"], { stdio: "inherit", env: process.env });

console.log("Applying Nexora application schema...");
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
try {
  const sql = await readFile(new URL("../db/schema.sql", import.meta.url), "utf8");
  await pool.query(sql);
  console.log("Nexora database schema applied successfully.");
} finally {
  await pool.end();
}
