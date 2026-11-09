import { and, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { admins } from "@/db/schema";
import { fail, guard, hashPassword, json } from "@/lib/auth";
import { ALL_PERMISSIONS } from "@/lib/constants";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  displayName: z.string().trim().min(2).max(80).optional(),
  role: z.enum(["ADMIN", "SUPERVISOR"]).optional(),
  permissions: z.array(z.string()).max(30).optional(),
  active: z.boolean().optional(),
  password: z.string().min(10, "كلمة المرور 10 أحرف على الأقل").max(100).regex(/[A-Za-z]/, "يجب أن تحتوي على حرف").regex(/\d/, "يجب أن تحتوي على رقم").optional(),
});

async function otherActiveAdmins(id: number) {
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(admins).where(and(eq(admins.role, "ADMIN"), eq(admins.active, true), ne(admins.id, id)));
  return n;
}

export async function PATCH(req: Request, { params }: Ctx) {
  const g = await guard(req, "ADMIN_ONLY");
  if (g.error) return g.error;
  const id = Number((await params).id);
  const [u] = Number.isInteger(id) ? await db.select().from(admins).where(eq(admins.id, id)) : [];
  if (!u) return fail("غير موجود", 404);
  const p = patchSchema.safeParse(await req.json().catch(() => null));
  if (!p.success) return fail(p.error.issues[0].message, 422);
  const d = p.data;
  const self = id === g.admin.id;
  if (self && (d.role === "SUPERVISOR" || d.active === false)) return fail("لا يمكنك تقليص صلاحياتك أو تعطيل حسابك بنفسك", 400);
  if (u.role === "ADMIN" && (d.role === "SUPERVISOR" || d.active === false) && (await otherActiveAdmins(id)) === 0) return fail("يجب أن يبقى مسؤول واحد نشط على الأقل", 400);

  const set: Partial<typeof admins.$inferInsert> = {};
  if (d.displayName) set.displayName = d.displayName;
  if (d.role) set.role = d.role;
  const role = d.role ?? u.role;
  if (role === "ADMIN") set.permissions = ALL_PERMISSIONS;
  else if (d.permissions) set.permissions = d.permissions.filter((x) => (ALL_PERMISSIONS as string[]).includes(x));
  if (d.active !== undefined) set.active = d.active;
  if (d.password) set.passwordHash = await hashPassword(d.password);
  if (d.password || d.role || d.permissions || d.active === false) set.sessionVersion = u.sessionVersion + 1;
  await db.update(admins).set(set).where(eq(admins.id, id));
  return json({ ok: true });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const g = await guard(req, "ADMIN_ONLY");
  if (g.error) return g.error;
  const id = Number((await params).id);
  if (id === g.admin.id) return fail("لا يمكنك حذف حسابك", 400);
  const [u] = Number.isInteger(id) ? await db.select().from(admins).where(eq(admins.id, id)) : [];
  if (!u) return fail("غير موجود", 404);
  if (u.role === "ADMIN" && (await otherActiveAdmins(id)) === 0) return fail("يجب أن يبقى مسؤول واحد نشط على الأقل", 400);
  await db.delete(admins).where(eq(admins.id, id));
  return json({ ok: true });
}
