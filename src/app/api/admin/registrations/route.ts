import { fail, guard, json } from "@/lib/auth";
import { facets, listRegistrations } from "@/lib/regquery";
import type { Permission } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const scope = sp.get("scope") ?? "participants";
  const perm: Permission = scope === "projects" ? "projects.view" : scope === "teams" ? "teams.view" : "participants.view";
  const g = await guard(req, perm);
  if (g.error) return g.error;
  try {
    const rows = await listRegistrations(sp);
    // Personal contact data only goes to admins with the participants permission.
    const full = scope === "participants" || g.admin.role === "ADMIN" || g.admin.permissions.includes("participants.view");
    const data = rows.map((r) => {
      const { qrToken, phoneNorm, ...rest } = r;
      void qrToken;
      void phoneNorm;
      if (full) return rest;
      const { phone, email, birthDate, ...safe } = rest;
      void phone;
      void email;
      void birthDate;
      return safe;
    });
    return json({ ok: true, rows: data, facets: await facets() });
  } catch (e) {
    console.error(e);
    return fail("خطأ في الخادم", 500);
  }
}
