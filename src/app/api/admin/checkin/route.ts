import { and, eq, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { registrations } from "@/db/schema";
import { fail, guard, json } from "@/lib/auth";
import { statusLabel } from "@/lib/constants";

export const dynamic = "force-dynamic";

const schema = z.object({ code: z.string().trim().min(3).max(200), confirm: z.boolean().optional(), force: z.boolean().optional() });

const view = (r: typeof registrations.$inferSelect) => ({
  id: r.id,
  regNumber: r.regNumber,
  name: r.fullNameAr,
  nameLat: r.fullNameLat,
  mode: r.mode,
  teamName: r.teamName,
  teamSize: r.teamSize,
  projectName: r.projectName,
  department: r.department,
  status: r.status,
  statusLabel: statusLabel(r.status),
  checkedIn: r.checkedIn,
  checkedInAt: r.checkedInAt,
  checkedInBy: r.checkedInBy,
});

export async function POST(req: Request) {
  const g = await guard(req, "checkin.manage");
  if (g.error) return g.error;
  const p = schema.safeParse(await req.json().catch(() => null));
  if (!p.success) return fail("رمز غير صالح", 422);
  const code = p.data.code;
  const [r] = await db
    .select()
    .from(registrations)
    .where(or(eq(registrations.qrToken, code), sql`upper(${registrations.regNumber}) = ${code.toUpperCase()}`))
    .limit(1);
  if (!r) return fail("لم يتم العثور على مشارك بهذا الرمز", 404);

  if (!p.data.confirm) return json({ ok: true, participant: view(r) });

  if (r.status !== "accepted" && !(p.data.force && g.admin.role === "ADMIN")) {
    return fail(`لا يمكن تسجيل الحضور: حالة التسجيل «${statusLabel(r.status)}»`, 409, { participant: view(r), canForce: g.admin.role === "ADMIN" });
  }
  // atomic: only one request can flip checked_in from false to true
  const [u] = await db
    .update(registrations)
    .set({ checkedIn: true, checkedInAt: new Date(), checkedInBy: g.admin.username })
    .where(and(eq(registrations.id, r.id), eq(registrations.checkedIn, false)))
    .returning();
  if (!u) {
    const [cur] = await db.select().from(registrations).where(eq(registrations.id, r.id));
    return fail("تم تسجيل حضور هذا المشارك مسبقاً", 409, { alreadyCheckedIn: true, participant: view(cur) });
  }
  return json({ ok: true, participant: view(u) });
}
