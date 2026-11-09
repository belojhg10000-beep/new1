import { destroySession, fail, json, sameOrigin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("طلب غير مسموح", 403);
  await destroySession();
  return json({ ok: true });
}
