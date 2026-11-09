import { desc, eq, ilike, or, and } from "drizzle-orm";
import { db } from "@/db";
import { emailLogs } from "@/db/schema";
import { guard, json } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const g = await guard(req, "email.send");
  if (g.error) return g.error;
  const sp = new URL(req.url).searchParams;
  const status = sp.get("status");
  const q = sp.get("q")?.trim().slice(0, 80);
  const conds = [];
  if (status === "sent" || status === "failed" || status === "pending") conds.push(eq(emailLogs.status, status));
  if (q) {
    const l = `%${q.replace(/[\\%_]/g, (m) => "\\" + m)}%`;
    conds.push(or(ilike(emailLogs.toEmail, l), ilike(emailLogs.subject, l), ilike(emailLogs.toName, l)));
  }
  const rows = await db
    .select({
      id: emailLogs.id,
      toEmail: emailLogs.toEmail,
      toName: emailLogs.toName,
      subject: emailLogs.subject,
      template: emailLogs.template,
      status: emailLogs.status,
      error: emailLogs.error,
      attempts: emailLogs.attempts,
      sentBy: emailLogs.sentBy,
      createdAt: emailLogs.createdAt,
      sentAt: emailLogs.sentAt,
    })
    .from(emailLogs)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(emailLogs.createdAt))
    .limit(300);
  return json({ ok: true, rows });
}
