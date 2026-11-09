import { blockedFor, clearHits, registerHit } from "@/lib/ratelimit";
import { fail, getIp, issueGate, json, safeEqual, sameOrigin } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Stage 1 of admin access: verifies the secret code on the server. The code lives only in the ADMIN_ACCESS_CODE env var. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("طلب غير مسموح", 403);
  const expected = process.env.ADMIN_ACCESS_CODE;
  if (!expected) return fail("لم يتم ضبط الرمز السري على الخادم.", 503);

  const ipKey = `gate:${getIp(req)}`;
  const globalKey = "gate:all";
  const wait = Math.max(await blockedFor(ipKey), await blockedFor(globalKey));
  if (wait) return fail(`تم حظر المحاولات مؤقتاً. حاول بعد ${Math.ceil(wait / 60)} دقيقة.`, 429, { retryAfter: wait });

  let code = "";
  try {
    const b = await req.json();
    code = typeof b.code === "string" ? b.code.slice(0, 200) : "";
  } catch {
    return fail("بيانات غير صالحة");
  }

  if (!code || !safeEqual(code.trim(), expected.trim())) {
    const r = await registerHit(ipKey, 5, 600, 900);
    await registerHit(globalKey, 300, 600, 300);
    await new Promise((res) => setTimeout(res, 600));
    return fail(
      r.blocked ? "تم حظر المحاولات مؤقتاً لمدة 15 دقيقة." : `الرمز السري غير صحيح. المحاولات المتبقية: ${r.remaining}`,
      r.blocked ? 429 : 401,
      { remaining: r.remaining },
    );
  }
  await clearHits(ipKey);
  await issueGate(req);
  return json({ ok: true });
}
