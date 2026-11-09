import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { admins } from "@/db/schema";
import { fail, guard, hashPassword, json, verifyPassword } from "@/lib/auth";
import { mailConfigured } from "@/lib/mail";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const g = await guard(req);
  if (g.error) return g.error;
  return json({ ok: true, admin: g.admin, mailConfigured: mailConfigured() });
}

const pwSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(10, "كلمة المرور 10 أحرف على الأقل").max(100).regex(/[A-Za-z]/, "يجب أن تحتوي على حرف").regex(/\d/, "يجب أن تحتوي على رقم"),
});

/** Change own password (invalidates all other sessions). */
export async function PATCH(req: Request) {
  const g = await guard(req);
  if (g.error) return g.error;
  const p = pwSchema.safeParse(await req.json().catch(() => ({})));
  if (!p.success) return fail(p.error.issues[0].message, 422);
  const [a] = await db.select().from(admins).where(eq(admins.id, g.admin.id));
  if (!a || !(await verifyPassword(p.data.currentPassword, a.passwordHash))) return fail("كلمة المرور الحالية غير صحيحة", 401);
  await db
    .update(admins)
    .set({ passwordHash: await hashPassword(p.data.newPassword), sessionVersion: a.sessionVersion + 1 })
    .where(eq(admins.id, a.id));
  return json({ ok: true, relogin: true });
}
