import { asc } from "drizzle-orm";
import { auth } from "./auth";
import { db } from "./db";
import { users } from "./db/schema";

/**
 * Owner gating for self-hosted instances. The owner is whoever set OWNER_NAME
 * (their login name) in the environment; if unset, the first-created account
 * (lowest id — the seeded account) is treated as the owner. Keeps the app
 * hardcoded-identity-free so anyone can self-host (see memory: self-hostable-intent).
 */
export async function isOwner(): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.id) return false;

  const ownerName = process.env.OWNER_NAME?.trim();
  if (ownerName) return session.user.name === ownerName;

  const [first] = await db.select({ id: users.id }).from(users).orderBy(asc(users.id)).limit(1);
  return first ? Number(session.user.id) === first.id : false;
}
