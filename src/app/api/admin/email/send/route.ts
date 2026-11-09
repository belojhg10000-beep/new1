import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { registrations } from "@/db/schema";
import { baseUrl, fail, guard, json } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { layout, mailConfigured, sanitizeBody, sendRaw, sendToRegistration, varsFor } from "@/lib/mail";
import { applyVars, TEMPLATE_KEYS } from "@/lib/templates";
import { STATUS_KEYS } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const schema = z.object({
  template: z.enum(TEMPLATE_KEYS),
  subject: z.string().trim().min(3).max(200),
  body: z.string().trim().min(3).max(30000),
  includeCard: z.boolean().default(false),
  preview: z.boolean().optional(),
  audience: z.discriminatedUnion("type", [
    z.object({ type: z.literal("all") }),
    z.object({ type: z.literal("accepted") }),
    z.object({ type: z.literal("status"), status: z.enum(STATUS_KEYS) }),
    z.object({ type: z.literal("team"), team: z.string().trim().min(1).max(80) }),
    z.object({ type: z.literal("ids"), ids: z.array(z.number().int()).min(1).max(1000) }),
    z.object({ type: z.literal("external"), email: z.string().trim().toLowerCase().email().max(160) }),
  ]),
});

export async function POST(req: Request) {
  const g = await guard(req, "email.send");
  if (g.error) return g.error;
  const p = schema.safeParse(await req.json().catch(() => null));
  if (!p.success) return fail("بيانات الرسالة غير صالحة: " + p.error.issues[0].message, 422);
  const { audience: a, ...o } = p.data;

  if (o.preview) {
    const html = layout(o.subject, sanitizeBody(applyVars(o.body, { participant_name: "اسم المشارك", registration_number: "PB-2026-XXXXXX", team_name: "اسم الفريق", project_name: "اسم المشروع" })), o.includeCard ? `<p style="text-align:center;padding:16px;border:2px dashed #1d4ed8;border-radius:14px;color:#1d4ed8">🪪 ستظهر هنا بطاقة المشارك مع رمز QR</p>` : "");
    return json({ ok: true, html });
  }

  const s = await getSettings();
  const base = baseUrl(req);
  const opts = { subject: o.subject, body: o.body, template: o.template, includeCard: o.includeCard, sentBy: g.admin.username };

  if (!mailConfigured()) {
    // still logs the failure so it can be resent once SMTP is configured
  }

  if (a.type === "external") {
    const r = await sendRaw(a.email, null, { ...opts, includeCard: false }, base, s.competitionName);
    return json({ ok: true, total: 1, sent: r.status === "sent" ? 1 : 0, failed: r.status === "sent" ? 0 : 1, firstError: "error" in r ? r.error : undefined });
  }

  let where;
  if (a.type === "all") where = undefined;
  else if (a.type === "accepted") where = eq(registrations.status, "accepted");
  else if (a.type === "status") where = eq(registrations.status, a.status);
  else if (a.type === "team") where = and(eq(registrations.mode, "team"), sql`lower(${registrations.teamName}) = ${a.team.toLowerCase()}`);
  else where = inArray(registrations.id, a.ids);

  const targets = await db.select().from(registrations).where(where).limit(1000);
  if (!targets.length) return fail("لا يوجد مستلمون مطابقون للتحديد.", 404);

  let sent = 0;
  let failed = 0;
  let firstError: string | undefined;
  for (let i = 0; i < targets.length; i += 4) {
    const res = await Promise.all(targets.slice(i, i + 4).map((t) => sendToRegistration(t, opts, base, s.competitionName)));
    for (const r of res) {
      if (r.status === "sent") sent++;
      else {
        failed++;
        firstError ??= "error" in r ? r.error : undefined;
      }
    }
  }
  void varsFor;
  return json({ ok: true, total: targets.length, sent, failed, firstError });
}
