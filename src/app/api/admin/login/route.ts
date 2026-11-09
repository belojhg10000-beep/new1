import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { admins } from "@/db/schema";
import { clearGate, createSession, ensureSeedAdmin, fail, getIp, hasGate, json, sameOrigin, verifyPassword } from "@/lib/auth";
import { blockedFor, clearHits, registerHit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

let dummy: string | null = null;

/** Stage 2: real authentication (username + password). Requires the stage-1 gate cookie. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("طلب غير مسموح", 403);
  if (!(await hasGate())) return fail("انتهت صلاحية الرمز السري. أعد إدخاله من الصفحة الرئيسية.", 403, { gate: false });

  let username = "";
  let password = "";
  try {
    const b = await req.json();
    username = typeof b.username === "string" ? b.username.trim().slice(0, 60) : "";
    password = typeof b.password === "string" ? b.password.slice(0, 200) : "";
  } catch {
    return fail("بيانات غير صالحة");
  }
  if (!username || !password) return fail("أدخل اسم المستخدم وكلمة المرور");

  const ipKey = `login:ip:${getIp(req)}`;
  const userKey = `login:user:${username.toLowerCase()}`;
  const wait = Math.max(await blockedFor(ipKey), await blockedFor(userKey));
  if (wait) return fail(`تم حظر محاولات الدخول مؤقتاً. حاول بعد ${Math.ceil(wait / 60)} دقيقة.`, 429);

  await ensureSeedAdmin();
  const [a] = await db.select().from(admins).where(sql`lower(${admins.username}) = ${username.toLowerCase()}`);
  dummy ??= bcrypt.hashSync("dummy-password", 12);
  const ok = await verifyPassword(password, a?.passwordHash ?? dummy);
  if (!a || !a.active || !ok) {
    const r1 = await registerHit(ipKey, 8, 900, 900);
    await registerHit(userKey, 5, 900, 900);
    return fail(r1.blocked ? "تم حظر المحاولات مؤقتاً." : "اسم المستخدم أو كلمة المرور غير صحيحة", 401);
  }

  await clearHits(ipKey);
  await clearHits(userKey);
  await db.update(admins).set({ lastLoginAt: new Date() }).where(eq(admins.id, a.id));
  await createSession(req, a);
  await clearGate();
  return json({ ok: true });
}
