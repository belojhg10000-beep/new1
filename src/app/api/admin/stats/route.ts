import { sql } from "drizzle-orm";
import { db } from "@/db";
import { emailLogs, registrations } from "@/db/schema";
import { guard, json } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const g = await guard(req);
  if (g.error) return g.error;
  const [r] = await db
    .select({
      registrations: sql<number>`count(*)::int`,
      participants: sql<number>`coalesce(sum(case when ${registrations.mode}='team' then ${registrations.teamSize} else 1 end),0)::int`,
      teams: sql<number>`(count(*) filter (where ${registrations.mode}='team'))::int`,
      individuals: sql<number>`(count(*) filter (where ${registrations.mode}='individual'))::int`,
      projects: sql<number>`count(distinct lower(${registrations.projectName}))::int`,
      statusNew: sql<number>`(count(*) filter (where ${registrations.status}='new'))::int`,
      review: sql<number>`(count(*) filter (where ${registrations.status}='review'))::int`,
      accepted: sql<number>`(count(*) filter (where ${registrations.status}='accepted'))::int`,
      rejected: sql<number>`(count(*) filter (where ${registrations.status}='rejected'))::int`,
      waitlist: sql<number>`(count(*) filter (where ${registrations.status}='waitlist'))::int`,
      last24h: sql<number>`(count(*) filter (where ${registrations.createdAt} > now() - interval '24 hours'))::int`,
      checkedIn: sql<number>`(count(*) filter (where ${registrations.checkedIn}))::int`,
    })
    .from(registrations);
  const [m] = await db
    .select({
      sent: sql<number>`(count(*) filter (where ${emailLogs.status}='sent'))::int`,
      failed: sql<number>`(count(*) filter (where ${emailLogs.status}='failed'))::int`,
    })
    .from(emailLogs);
  const daily = await db.execute(
    sql`select to_char(d::date,'MM-DD') as day, coalesce(c.n,0)::int as n from generate_series(current_date - interval '13 days', current_date, interval '1 day') d left join (select created_at::date as cd, count(*) n from registrations group by 1) c on c.cd = d::date order by d`,
  );
  const byDept = await db.execute(
    sql`select department as name, count(*)::int as n from registrations group by 1 order by n desc limit 8`,
  );
  return json({ ok: true, stats: r, mail: m, daily: daily.rows, byDept: byDept.rows });
}
