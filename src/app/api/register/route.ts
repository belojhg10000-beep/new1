import { after } from "next/server";
import { randomBytes, randomInt } from "crypto";
import { and, eq, ne, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { registrations } from "@/db/schema";
import { baseUrl, fail, getIp, json, sameOrigin } from "@/lib/auth";
import { blockedFor, registerHit } from "@/lib/ratelimit";
import { getSettings, registrationState } from "@/lib/settings";
import { makeRegistrationSchema, normalizePhone } from "@/lib/validation";
import { sendToRegistration } from "@/lib/mail";
import { TEMPLATES } from "@/lib/templates";

export const dynamic = "force-dynamic";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const genReg = () =>
  `PB-${new Date().getFullYear()}-${Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("")}`;

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("طلب غير مسموح", 403);
  const ip = getIp(req);
  const rlKey = `reg:${ip}`;
  const wait = await blockedFor(rlKey);
  if (wait) return fail(`محاولات كثيرة، حاول بعد ${Math.ceil(wait / 60)} دقيقة.`, 429);

  const s = await getSettings();
  const state = registrationState(s);
  if (state !== "open") {
    return fail(
      state === "not_started" ? "التسجيل لم يبدأ بعد." : "التسجيل مغلق حالياً.",
      403,
      { state },
    );
  }

  const raw = await req.text();
  if (raw.length > 30000) return fail("حجم الطلب كبير", 413);
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return fail("بيانات غير صالحة");
  }
  // Honeypot for bots: pretend success.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return json({ ok: true, regNumber: "PB-0000-000000", cardToken: "" });
  }

  await registerHit(rlKey, 60, 3600, 900);

  const parsed = makeRegistrationSchema(s.maxTeamSize).safeParse(body);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0] ?? "form")] ??= i.message;
    return fail("يرجى تصحيح الحقول المحددة", 422, { errors });
  }
  const v = parsed.data;
  const phoneNorm = normalizePhone(v.phone);
  const isTeam = v.mode === "team";
  const members = isTeam ? v.teamMembers.map((m) => m.trim()).filter(Boolean) : [];

  // ---- duplicate rules: one registration per email, phone, team name, and person ----
  const dupConds: (SQL<unknown> | undefined)[] = [
    sql`lower(${registrations.email}) = ${v.email}`,
    eq(registrations.phoneNorm, phoneNorm),
    sql`lower(${registrations.fullNameLat}) = ${v.fullNameLat.toLowerCase()}`,
  ];
  if (isTeam) {
    const teamCondition = and(eq(registrations.mode, "team"), sql`lower(${registrations.teamName}) = ${v.teamName.toLowerCase()}`);
    if (teamCondition) dupConds.push(teamCondition);
  }
  const dups = await db.select({ email: registrations.email, phoneNorm: registrations.phoneNorm, teamName: registrations.teamName }).from(registrations).where(or(...dupConds.filter((c): c is SQL<unknown> => !!c))).limit(5);
  if (dups.length) {
    const d = dups[0];
    const errors: Record<string, string> = {};
    if (dups.some((x) => x.email.toLowerCase() === v.email)) errors.email = "هذا البريد الإلكتروني مسجّل مسبقاً";
    else if (dups.some((x) => x.phoneNorm === phoneNorm)) errors.phone = "رقم الهاتف مسجّل مسبقاً";
    else if (isTeam && dups.some((x) => x.teamName?.toLowerCase() === v.teamName.toLowerCase())) errors.teamName = "اسم المجموعة مستخدم مسبقاً";
    else errors.fullNameLat = "يوجد تسجيل سابق لهذا المشارك";
    void d;
    return fail("تسجيل مكرر: " + Object.values(errors)[0], 409, { errors, duplicate: true });
  }

  let created: typeof registrations.$inferSelect | null = null;
  for (let attempt = 0; attempt < 5 && !created; attempt++) {
    try {
      const [row] = await db
        .insert(registrations)
        .values({
          regNumber: genReg(),
          qrToken: randomBytes(24).toString("hex"),
          fullNameAr: v.fullNameAr,
          fullNameLat: v.fullNameLat,
          faculty: v.faculty,
          department: v.department,
          specialty: v.specialty,
          level: v.level,
          phone: v.phone,
          phoneNorm,
          email: v.email,
          mode: v.mode,
          teamName: isTeam ? v.teamName : null,
          teamSize: isTeam ? v.teamSize : 1,
          teamMembers: members,
          projectName: v.projectName,
          projectDescription: v.projectDescription,
          problem: v.problem,
          technologies: v.technologies,
          status: "new",
        })
        .returning();
      created = row;
    } catch (e) {
      const err = e as { code?: string; cause?: { code?: string; constraint?: string } };
      const code = err.code ?? err.cause?.code;
      const constraint = err.cause?.constraint ?? "";
      if (code === "23505") {
        if (constraint === "reg_email_uq") return fail("تسجيل مكرر: هذا البريد الإلكتروني مسجّل مسبقاً", 409, { duplicate: true, errors: { email: "البريد مسجّل مسبقاً" } });
        if (constraint === "reg_phone_uq") return fail("تسجيل مكرر: رقم الهاتف مسجّل مسبقاً", 409, { duplicate: true, errors: { phone: "الهاتف مسجّل مسبقاً" } });
        continue; // reg number collision -> retry
      }
      console.error("register error", e);
      return fail("حدث خطأ في الخادم، حاول مجدداً", 500);
    }
  }
  if (!created) return fail("تعذر إنشاء رقم التسجيل، حاول مجدداً", 500);

  const base = baseUrl(req);
  const reg = created;
  after(async () => {
    try {
      const t = TEMPLATES.confirmation;
      await sendToRegistration(reg, { subject: t.subject, body: t.body, template: "confirmation", includeCard: true, sentBy: "system" }, base, s.competitionName);
    } catch (e) {
      console.error("confirmation email failed", e);
    }
  });

  return json({ ok: true, regNumber: reg.regNumber, cardToken: reg.qrToken, name: reg.fullNameAr });
}

void ne;
