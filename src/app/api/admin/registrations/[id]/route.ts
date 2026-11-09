import { after } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { registrations } from "@/db/schema";
import { baseUrl, fail, guard, json } from "@/lib/auth";
import { adminUpdateSchema, normalizePhone } from "@/lib/validation";
import { getSettings } from "@/lib/settings";
import { sendToRegistration } from "@/lib/mail";
import { TEMPLATES } from "@/lib/templates";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

async function load(id: string) {
  const n = Number(id);
  if (!Number.isInteger(n)) return null;
  const [r] = await db.select().from(registrations).where(eq(registrations.id, n));
  return r ?? null;
}

export async function GET(req: Request, { params }: Ctx) {
  const g = await guard(req, "participants.view");
  if (g.error) return g.error;
  const r = await load((await params).id);
  if (!r) return fail("غير موجود", 404);
  const { phoneNorm, ...rest } = r;
  void phoneNorm;
  return json({ ok: true, row: rest });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const g = await guard(req, "participants.edit");
  if (g.error) return g.error;
  const r = await load((await params).id);
  if (!r) return fail("غير موجود", 404);
  const raw = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!raw) return fail("بيانات غير صالحة");
  const notify = raw.notify === true;
  const p = adminUpdateSchema.safeParse(raw);
  if (!p.success) return fail(p.error.issues[0].message, 422);
  const d = p.data;
  const set: Partial<typeof registrations.$inferInsert> = { ...d, updatedAt: new Date() };
  if (d.phone) set.phoneNorm = normalizePhone(d.phone);
  if (r.mode === "individual") {
    delete set.teamName;
    delete set.teamSize;
    delete set.teamMembers;
  }
  try {
    const [u] = await db.update(registrations).set(set).where(eq(registrations.id, r.id)).returning();
    if (notify && d.status && d.status !== r.status && (d.status === "accepted" || d.status === "rejected")) {
      const base = baseUrl(req);
      const s = await getSettings();
      const t = TEMPLATES[d.status];
      const by = g.admin.username;
      after(async () => {
        await sendToRegistration(u, { subject: t.subject, body: t.body, template: d.status!, includeCard: t.includeCard, sentBy: by }, base, s.competitionName);
      });
    }
    return json({ ok: true });
  } catch (e) {
    const err = e as { code?: string; cause?: { code?: string } };
    if ((err.code ?? err.cause?.code) === "23505") return fail("البريد أو الهاتف مستخدم لدى مشارك آخر", 409);
    console.error(e);
    return fail("خطأ في الخادم", 500);
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  const g = await guard(req, "participants.delete");
  if (g.error) return g.error;
  const r = await load((await params).id);
  if (!r) return fail("غير موجود", 404);
  await db.delete(registrations).where(eq(registrations.id, r.id));
  return json({ ok: true });
}
