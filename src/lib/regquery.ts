import "server-only";
import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { registrations } from "@/db/schema";

const likeEsc = (s: string) => s.replace(/[\\%_]/g, (m) => "\\" + m);

export function buildFilter(sp: URLSearchParams): SQL | undefined {
  const c: (SQL | undefined)[] = [];
  const q = sp.get("q")?.trim().slice(0, 100);
  if (q) {
    const l = `%${likeEsc(q)}%`;
    c.push(
      or(
        ilike(registrations.fullNameAr, l),
        ilike(registrations.fullNameLat, l),
        ilike(registrations.email, l),
        ilike(registrations.regNumber, l),
        ilike(registrations.projectName, l),
        ilike(registrations.teamName, l),
      ),
    );
  }
  const dep = sp.get("department");
  if (dep) c.push(eq(registrations.department, dep));
  const spec = sp.get("specialty");
  if (spec) c.push(ilike(registrations.specialty, `%${likeEsc(spec.slice(0, 100))}%`));
  const mode = sp.get("mode");
  if (mode === "team" || mode === "individual") c.push(eq(registrations.mode, mode));
  const status = sp.get("status");
  if (status) c.push(eq(registrations.status, status));
  const team = sp.get("team")?.trim();
  if (team) c.push(ilike(registrations.teamName, `%${likeEsc(team.slice(0, 80))}%`));
  const ci = sp.get("checkedIn");
  if (ci === "1") c.push(eq(registrations.checkedIn, true));
  if (ci === "0") c.push(eq(registrations.checkedIn, false));
  return c.length ? and(...c) : undefined;
}

export async function listRegistrations(sp: URLSearchParams, limit = 1500) {
  return db.select().from(registrations).where(buildFilter(sp)).orderBy(desc(registrations.createdAt)).limit(limit);
}

export async function facets() {
  const deps = await db.selectDistinct({ v: registrations.department }).from(registrations);
  const specs = await db.selectDistinct({ v: registrations.specialty }).from(registrations);
  return { departments: deps.map((d) => d.v).sort(), specialties: specs.map((d) => d.v).sort() };
}

export const countSql = sql<number>`count(*)::int`;
