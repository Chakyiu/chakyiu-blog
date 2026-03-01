import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type DbInstance = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as unknown as { _db: DbInstance | undefined };

function createDb(): DbInstance {
  const connectionString = process.env.DATABASE_URL ?? "postgres://localhost:5432/blog";
  const client = postgres(connectionString, { prepare: false });
  return drizzle(client, { schema });
}

export const db: DbInstance = globalForDb._db ?? createDb();
if (process.env.NODE_ENV !== "production") globalForDb._db = db;
