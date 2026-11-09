import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { fail, guard, json } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { settingsSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const g = await guard(req, "settings.manage");
  if (g.error) return g.error;
  return json({ ok: true, settings: await getSettings() });
}

export async function PUT(req: Request) {
  const g = await guard(req, "settings.manage");
  if (g.error) return g.error;
  const p = settingsSchema.safeParse(await req.json().catch(() => null));
  if (!p.success) return fail(p.error.issues[0].message, 422);
  const d = p.data;
  const start = new Date(d.registrationStart);
  const end = new Date(d.registrationEnd);
  if (end <= start) return fail("نهاية التسجيل يجب أن تكون بعد بدايته", 422);
  await getSettings();
  await db
    .update(settings)
    .set({
      competitionName: d.competitionName,
      description: d.description,
      eventDate: new Date(d.eventDate),
      registrationStart: start,
      registrationEnd: end,
      conditions: d.conditions,
      maxTeamSize: d.maxTeamSize,
      registrationOpen: d.registrationOpen,
      departments: d.departments,
      updatedAt: new Date(),
    })
    .where(eq(settings.id, 1));
  return json({ ok: true });
}
