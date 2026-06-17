import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Lazily construct the client so importing `db` doesn't throw at build/collection
// time when DATABASE_URL is absent — it only errors when a query actually runs.
let _db: NeonHttpDatabase<typeof schema> | null = null;

function getDb(): NeonHttpDatabase<typeof schema> {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example → .env.local and add your Neon pooled connection string.",
    );
  }
  // Neon serverless HTTP driver — use the POOLED connection string. Fine for ~5 users.
  _db = drizzle(neon(url), { schema });
  return _db;
}

// Proxy forwards property access to the lazily-built Drizzle client.
export const db = new Proxy({} as NeonHttpDatabase<typeof schema>, {
  get(_t, prop) {
    const real = getDb();
    const val = Reflect.get(real, prop, real);
    return typeof val === "function" ? val.bind(real) : val;
  },
});

export { schema };
