import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { rateLimits } from "@/db/schema";

/** Returns remaining block time in seconds (0 = not blocked). */
export async function blockedFor(key: string): Promise<number> {
  const [row] = await db.select().from(rateLimits).where(eq(rateLimits.key, key));
  if (row?.blockedUntil && row.blockedUntil.getTime() > Date.now()) {
    return Math.ceil((row.blockedUntil.getTime() - Date.now()) / 1000);
  }
  return 0;
}

/** Register one (failed) attempt. Blocks the key once `max` attempts happen inside `windowSec`. */
export async function registerHit(key: string, max: number, windowSec: number, blockSec: number) {
  const [row] = await db.select().from(rateLimits).where(eq(rateLimits.key, key));
  const now = new Date();
  let count = 1;
  let windowStart = now;
  if (row && now.getTime() - row.windowStart.getTime() < windowSec * 1000) {
    count = row.count + 1;
    windowStart = row.windowStart;
  }
  const blockedUntil = count >= max ? new Date(now.getTime() + blockSec * 1000) : null;
  await db
    .insert(rateLimits)
    .values({ key, count, windowStart, blockedUntil })
    .onConflictDoUpdate({ target: rateLimits.key, set: { count, windowStart, blockedUntil } });
  return { remaining: Math.max(0, max - count), blocked: !!blockedUntil };
}

export async function clearHits(key: string) {
  await db.delete(rateLimits).where(eq(rateLimits.key, key));
}
