import { eq } from "drizzle-orm";
import { db } from "@/db";
import { emailLogs } from "@/db/schema";
import { baseUrl, fail, guard, json } from "@/lib/auth";
import { deliverLog } from "@/lib/mail";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** id = numeric log id, or "failed" to retry every failed message. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard(req, "email.send");
  if (g.error) return g.error;
  const { id } = await params;
  const s = await getSettings();
  const base = baseUrl(req);
  let ids: number[];
  if (id === "failed") {
    ids = (await db.select({ id: emailLogs.id }).from(emailLogs).where(eq(emailLogs.status, "failed")).limit(300)).map((r) => r.id);
  } else {
    const n = Number(id);
    if (!Number.isInteger(n)) return fail("معرّف غير صالح");
    ids = [n];
  }
  let sent = 0;
  let failed = 0;
  let firstError: string | undefined;
  for (let i = 0; i < ids.length; i += 4) {
    const res = await Promise.all(ids.slice(i, i + 4).map((x) => deliverLog(x, base, s.competitionName)));
    for (const r of res) {
      if (r.status === "sent") sent++;
      else {
        failed++;
        firstError ??= "error" in r ? r.error : undefined;
      }
    }
  }
  return json({ ok: true, total: ids.length, sent, failed, firstError });
}
