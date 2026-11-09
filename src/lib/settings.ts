import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { DEFAULT_COMPETITION } from "@/lib/constants";

export type SettingsRow = typeof settings.$inferSelect;

export async function getSettings(): Promise<SettingsRow> {
  const [row] = await db.select().from(settings).where(eq(settings.id, 1));
  if (row) return row;
  const day = 86400000;
  const now = Date.now();
  await db
    .insert(settings)
    .values({
      id: 1,
      competitionName: DEFAULT_COMPETITION.name,
      description: DEFAULT_COMPETITION.description,
      eventDate: new Date(now + 30 * day),
      registrationStart: new Date(now - 60000),
      registrationEnd: new Date(now + 20 * day),
      conditions: DEFAULT_COMPETITION.conditions,
      maxTeamSize: 4,
      departments: DEFAULT_COMPETITION.departments,
      registrationOpen: true,
    })
    .onConflictDoNothing();
  const [created] = await db.select().from(settings).where(eq(settings.id, 1));
  return created;
}

export type RegState = "open" | "not_started" | "closed" | "paused";

export function registrationState(s: SettingsRow, now = Date.now()): RegState {
  if (!s.registrationOpen) return "paused";
  if (now < s.registrationStart.getTime()) return "not_started";
  if (now > s.registrationEnd.getTime()) return "closed";
  return "open";
}

/** Public-safe projection. */
export function publicSettings(s: SettingsRow) {
  return {
    competitionName: s.competitionName,
    description: s.description,
    eventDate: s.eventDate.toISOString(),
    registrationStart: s.registrationStart.toISOString(),
    registrationEnd: s.registrationEnd.toISOString(),
    conditions: s.conditions.split("\n").map((x) => x.trim()).filter(Boolean),
    maxTeamSize: s.maxTeamSize,
    departments: s.departments,
    state: registrationState(s),
  };
}
export type PublicSettings = ReturnType<typeof publicSettings>;
