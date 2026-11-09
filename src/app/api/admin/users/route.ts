import { asc } from "drizzle-orm";
import { db } from "@/db";
import { admins } from "@/db/schema";
import { fail, guard, hashPassword, json } from "@/lib/auth";
import { ALL_PERMISSIONS } from "@/lib/constants";
import { adminUserSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const g = await guard(req, "ADMIN_ONLY");
  if (g.error) return g.error;
  const rows = await db
    .select({ id: admins.id, username: admins.username, displayName: admins.displayName, role: admins.role, permissions: admins.permissions, active: admins.active, lastLoginAt: admins.lastLoginAt, createdAt: admins.createdAt })
    .from(admins)
    .orderBy(asc(admins.id));
  return json({ ok: true, rows });
}

export async function POST(req: Request) {
  const g = await guard(req, "ADMIN_ONLY");
  if (g.error) return g.error;
  const p = adminUserSchema.safeParse(await req.json().catch(() => null));
  if (!p.success) return fail(p.error.issues[0].message, 422);
  const d = p.data;
  const perms = d.role === "ADMIN" ? ALL_PERMISSIONS : d.permissions.filter((x) => (ALL_PERMISSIONS as string[]).includes(x));
  try {
    await db.insert(admins).values({ username: d.username, displayName: d.displayName, passwordHash: await hashPassword(d.password), role: d.role, permissions: perms });
    return json({ ok: true });
  } catch (e) {
    const err = e as { code?: string; cause?: { code?: string } };
    if ((err.code ?? err.cause?.code) === "23505") return fail("اسم المستخدم مستخدم مسبقاً", 409);
    console.error(e);
    return fail("خطأ في الخادم", 500);
  }
}
