import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import sanitizeHtml from "sanitize-html";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { emailLogs, registrations } from "@/db/schema";
import { applyVars } from "@/lib/templates";
import { qrPng } from "@/lib/card";

type Reg = typeof registrations.$inferSelect;

export function mailConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

const g = globalThis as typeof globalThis & { __pbMail?: Transporter };
function transport(): Transporter {
  if (g.__pbMail) return g.__pbMail;
  const port = Number(process.env.SMTP_PORT || 587);
  g.__pbMail = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    pool: true,
    maxConnections: 3,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  });
  return g.__pbMail;
}

export function sanitizeBody(html: string) {
  return sanitizeHtml(html, {
    allowedTags: ["h1", "h2", "h3", "p", "br", "b", "strong", "i", "em", "u", "ul", "ol", "li", "a", "span", "div", "blockquote", "hr"],
    allowedAttributes: { a: ["href", "target"], "*": ["style"] },
    allowedStyles: {
      "*": {
        color: [/^#[0-9a-f]{3,8}$/i, /^rgb\(/i],
        "text-align": [/^(left|right|center|justify)$/],
        "font-size": [/^\d+(px|em|rem|%)$/],
        "font-weight": [/^(bold|normal|\d+)$/],
      },
    },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: { a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener" }) },
  });
}

export function varsFor(r: Reg | null, toName?: string | null): Record<string, string> {
  return {
    participant_name: r?.fullNameAr ?? toName ?? "",
    registration_number: r?.regNumber ?? "",
    team_name: r ? (r.mode === "team" && r.teamName ? r.teamName : "مشاركة فردية") : "",
    project_name: r?.projectName ?? "",
  };
}

function cardBlock(r: Reg, cardUrl: string, competition: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;border-radius:18px;overflow:hidden;border:2px solid #1d4ed8;background:#f4f8ff">
<tr><td style="background:#0a1f5c;background:linear-gradient(135deg,#0a1f5c,#1d4ed8);padding:14px 20px;color:#fff;font-weight:bold;font-size:15px" align="center">🪪 بطاقة المشارك – ${competition.replace(/[<>&]/g, "")}</td></tr>
<tr><td style="padding:20px" align="center">
<img src="cid:qrcode@pb" width="170" height="170" alt="QR" style="border:6px solid #fff;border-radius:12px;box-shadow:0 4px 16px rgba(10,31,92,.2)"/>
<div style="margin-top:14px;font-size:20px;font-weight:bold;color:#0a1f5c">${applyVars("{{participant_name}}", { participant_name: r.fullNameAr })}</div>
<div style="margin-top:6px;font-family:monospace;font-size:18px;letter-spacing:2px;color:#059669;font-weight:bold" dir="ltr">${r.regNumber}</div>
<div style="margin-top:6px;color:#475569;font-size:14px">${applyVars("{{team_name}}", varsFor(r))}</div>
<div style="margin-top:14px"><a href="${cardUrl}" style="background:#1d4ed8;color:#fff;text-decoration:none;padding:10px 22px;border-radius:999px;font-size:14px">عرض البطاقة / طباعتها</a></div>
</td></tr></table>`;
}

export function layout(subject: string, bodyHtml: string, extra: string) {
  return `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${subject.replace(/[<>&]/g, "")}</title></head>
<body style="margin:0;padding:0;background:#e8f0ff;font-family:Tahoma,'Segoe UI',Arial,sans-serif;direction:rtl">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e8f0ff;padding:24px 10px"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:22px;overflow:hidden;box-shadow:0 12px 40px rgba(10,31,92,.18)">
<tr><td align="center" style="background:#0a1f5c;background:linear-gradient(135deg,#061440 0%,#1d4ed8 60%,#0ea5e9 100%);padding:34px 20px;color:#fff">
<div style="font-family:Consolas,monospace;color:#34d399;font-size:13px;letter-spacing:3px" dir="ltr">&lt;/ NEW VISION CLUB /&gt;</div>
<div style="font-size:30px;font-weight:900;letter-spacing:2px;margin-top:8px" dir="ltr">PROGRAMMERS BATTLE</div>
<div style="font-size:16px;margin-top:6px;color:#bae6fd">معركة المبرمجين</div>
<div style="height:4px;width:80px;background:#10b981;border-radius:4px;margin:16px auto 0"></div></td></tr>
<tr><td style="padding:28px 28px 8px;color:#1e293b;font-size:16px;line-height:1.9">${bodyHtml}${extra}</td></tr>
<tr><td style="padding:22px 28px;background:#f1f6ff;color:#64748b;font-size:12px;line-height:1.8;border-top:3px solid #10b981" align="center">
<b style="color:#0a1f5c">New Vision Club – University Science Club</b><br>كلية العلوم والتكنولوجيا – جامعة محمد خيضر بسكرة</td></tr>
</table></td></tr></table></body></html>`;
}

export type SendOpts = {
  subject: string;
  body: string;
  template: string;
  includeCard: boolean;
  sentBy: string;
};

/** Create a log row for a recipient and try to deliver. Returns the log id & status. */
export async function sendToRegistration(reg: Reg, o: SendOpts, base: string, competition: string) {
  const vars = varsFor(reg);
  const subject = applyVars(o.subject, vars, false).replace(/[\r\n]+/g, " ").slice(0, 200);
  const body = sanitizeBody(applyVars(o.body, vars));
  const [log] = await db
    .insert(emailLogs)
    .values({
      registrationId: reg.id,
      toEmail: reg.email,
      toName: reg.fullNameAr,
      subject,
      body,
      template: o.template,
      includeCard: o.includeCard,
      sentBy: o.sentBy,
    })
    .returning({ id: emailLogs.id });
  return deliverLog(log.id, base, competition);
}

export async function sendRaw(to: string, toName: string | null, o: SendOpts, base: string, competition: string) {
  const subject = o.subject.replace(/[\r\n]+/g, " ").slice(0, 200);
  const [log] = await db
    .insert(emailLogs)
    .values({ toEmail: to, toName, subject, body: sanitizeBody(o.body), template: o.template, sentBy: o.sentBy })
    .returning({ id: emailLogs.id });
  return deliverLog(log.id, base, competition);
}

export async function deliverLog(logId: number, base: string, competition: string) {
  const [log] = await db.select().from(emailLogs).where(eq(emailLogs.id, logId));
  if (!log) return { id: logId, status: "failed" as const, error: "not found" };
  const markFail = async (error: string) => {
    await db
      .update(emailLogs)
      .set({ status: "failed", error: error.slice(0, 500), attempts: log.attempts + 1 })
      .where(eq(emailLogs.id, logId));
    return { id: logId, status: "failed" as const, error };
  };
  if (!mailConfigured()) return markFail("خدمة البريد (SMTP) غير مهيأة على الخادم");
  try {
    let extra = "";
    const attachments: { filename: string; content: Buffer; cid: string; contentType: string }[] = [];
    if (log.includeCard && log.registrationId) {
      const [reg] = await db.select().from(registrations).where(eq(registrations.id, log.registrationId));
      if (reg) {
        extra = cardBlock(reg, `${base}/card/${reg.qrToken}`, competition);
        attachments.push({ filename: "qr.png", content: await qrPng(reg.qrToken), cid: "qrcode@pb", contentType: "image/png" });
      }
    }
    await transport().sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: log.toName ? { name: log.toName.replace(/[",<>]/g, ""), address: log.toEmail } : log.toEmail,
      subject: log.subject,
      html: layout(log.subject, log.body, extra),
      attachments,
    });
    await db
      .update(emailLogs)
      .set({ status: "sent", error: null, sentAt: new Date(), attempts: log.attempts + 1 })
      .where(eq(emailLogs.id, logId));
    return { id: logId, status: "sent" as const };
  } catch (e) {
    return markFail(e instanceof Error ? e.message : "SMTP error");
  }
}
