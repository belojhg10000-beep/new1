import Link from "next/link";
import CodeRain from "@/components/CodeRain";
import Countdown from "@/components/Countdown";
import Reveal from "@/components/Reveal";
import SiteHeader from "@/components/SiteHeader";
import { BRAND } from "@/lib/constants";
import { getSettings, publicSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

const fmt = (iso: string) =>
  new Intl.DateTimeFormat("ar-DZ", { dateStyle: "full", timeStyle: "short", timeZone: "Africa/Algiers" }).format(new Date(iso));

const GOALS = [
  { i: "💡", t: "اكتشاف المواهب", d: "إبراز الطاقات البرمجية والإبداعية لدى طلبة الجامعة وصقلها في بيئة تنافسية شريفة." },
  { i: "🛠️", t: "مشاريع تحل مشكلات حقيقية", d: "تشجيع الطلبة على تحويل أفكارهم إلى حلول تقنية قابلة للتطبيق تخدم المجتمع والجامعة." },
  { i: "🤝", t: "العمل الجماعي", d: "ترسيخ ثقافة الفريق وتوزيع الأدوار وإدارة المشاريع كما في شركات التقنية." },
  { i: "🚀", t: "ثقافة الابتكار", d: "نشر روح الابتكار وريادة الأعمال التقنية بين الطلبة من مختلف التخصصات." },
  { i: "🧠", t: "تطوير المهارات", d: "رفع مستوى المهارات في البرمجة وحل المشكلات والعرض والتواصل التقني." },
  { i: "🏆", t: "التقدير والتتويج", d: "مكافأة أفضل المشاريع والفرق وإتاحة فرصة الظهور أمام لجنة تحكيم متخصصة." },
];

const STAGES = [
  { n: "01", t: "التسجيل وتقديم الفكرة", d: "املأ استمارة التسجيل وقدّم فكرة مشروعك والتقنيات التي ستستخدمها قبل إغلاق باب التسجيل." },
  { n: "02", t: "المراجعة والقبول", d: "تدرس اللجنة الطلبات وتُبلغ المقبولين عبر البريد الإلكتروني مع بطاقة المشارك الرقمية (QR)." },
  { n: "03", t: "يوم المعركة", d: "تأكيد الحضور عبر QR ثم العمل على المشروع وتطويره ضمن الوقت المحدد بإشراف المنظمين." },
  { n: "04", t: "العرض والتحكيم", d: "عرض المشاريع أمام لجنة التحكيم وتقييمها وفق الابتكار والجودة التقنية وأثر الحل." },
];

export default async function HomePage() {
  const s = publicSettings(await getSettings());
  const open = s.state === "open";
  const [cdTarget, cdLabel] =
    s.state === "open"
      ? [s.registrationEnd, "⏳ يُغلق باب التسجيل بعد"]
      : s.state === "not_started"
        ? [s.registrationStart, "🔔 يُفتح باب التسجيل بعد"]
        : [s.eventDate, "⚔️ تنطلق المعركة بعد"];

  return (
    <main>
      {/* ================= HERO ================= */}
      <section className="bg-hero relative overflow-hidden pb-20 pt-28 text-white">
        <div className="bg-grid absolute inset-0" aria-hidden />
        <CodeRain />
        <div className="glow-pulse absolute -top-24 start-[-8rem] h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl" aria-hidden />
        <div className="glow-pulse absolute -bottom-24 end-[-6rem] h-96 w-96 rounded-full bg-sky-400/25 blur-3xl" aria-hidden />
        <SiteHeader home />
        <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-4 lg:grid-cols-[1.15fr_.85fr]">
          <div className="fade-up">
            <div className="glass mb-5 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold text-emerald-200">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              {BRAND.college} • {BRAND.university}
            </div>
            <p className="code-font mb-2 text-sm text-emerald-300">{"// New Vision Club presents"}</p>
            <h1 className="ltr text-shine text-5xl font-black leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
              PROGRAMMERS
              <br />
              BATTLE
            </h1>
            <p className="mt-4 text-2xl font-extrabold text-sky-100 sm:text-3xl">معركة المبرمجين… حيث تتحول الأكواد إلى انتصارات ⚔️</p>
            <p className="mt-4 max-w-2xl text-base leading-8 text-sky-100/90 sm:text-lg">{s.description}</p>

            <div className="mt-7 flex flex-wrap gap-3">
              {open ? (
                <Link href="/register" className="btn btn-green px-8 py-3.5 text-lg">سجّل الآن ←</Link>
              ) : (
                <span className="btn glass cursor-default px-8 py-3.5 text-lg">
                  {s.state === "not_started" ? "التسجيل لم يبدأ بعد" : "🔒 التسجيل مغلق"}
                </span>
              )}
              <a href="#stages" className="btn btn-ghost px-6 py-3.5">مراحل المسابقة</a>
            </div>

            <div className="mt-9 flex flex-wrap gap-6">
              <Countdown target={cdTarget} label={cdLabel} refreshOnZero={s.state !== "closed" && s.state !== "paused"} />
              {s.state !== "closed" && s.state !== "paused" && <Countdown target={s.eventDate} label="⚔️ موعد المسابقة" />}
            </div>
            {!open && (
              <p className="mt-4 max-w-xl rounded-2xl bg-white/10 px-4 py-3 text-sm leading-7 text-sky-100">
                {s.state === "not_started" && "سيُفتح باب التسجيل في الموعد المحدد وسيظهر زر التسجيل تلقائياً."}
                {s.state === "closed" && "انتهت فترة التسجيل وتم إغلاق الاستمارة. شكراً لكل من سجّل، ونراكم في ساحة المعركة!"}
                {s.state === "paused" && "تم إيقاف التسجيل مؤقتاً من طرف الإدارة. تابعونا لمعرفة المستجدات."}
              </p>
            )}
          </div>

          {/* Decorative code window */}
          <div className="relative hidden lg:block" aria-hidden>
            <div className="float glass relative rounded-3xl p-1 shadow-2xl">
              <div className="rounded-[1.4rem] bg-navy/80 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-rose-400" />
                  <span className="h-3 w-3 rounded-full bg-amber-300" />
                  <span className="h-3 w-3 rounded-full bg-emerald-400" />
                  <span className="code-font ms-3 text-xs text-sky-300">battle.ts</span>
                </div>
                <pre className="code-font whitespace-pre-wrap text-[13px] leading-7 text-sky-100">
{`const `}<span className="text-emerald-300">team</span>{` = new Team();
`}<span className="text-sky-300">await</span>{` team.build(idea);
`}<span className="text-violet-300">if</span>{` (idea.solves(problem)) {
  `}<span className="text-emerald-300">victory</span>{`++;
}
`}<span className="text-slate-400">{`// let the battle begin ⚔️`}</span>
                </pre>
                <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white/10 p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={BRAND.logoClub} alt="" width={44} height={44} className="h-11 w-11 rounded-full bg-white p-0.5" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={BRAND.logoCollege} alt="" width={44} height={44} className="h-11 w-11 rounded-xl bg-white p-1" />
                  <div className="text-xs leading-5 text-sky-100">New Vision Club<br />University Science Club</div>
                </div>
              </div>
            </div>
            <div className="spin-slow absolute -bottom-10 -start-10 h-28 w-28 rounded-3xl border-2 border-emerald-300/40" />
            <div className="spin-slow absolute -top-8 end-4 h-16 w-16 rounded-full border-2 border-sky-300/40" />
          </div>
        </div>
      </section>

      {/* ============ INFO STRIP ============ */}
      <section className="relative z-10 mx-auto -mt-10 max-w-6xl px-4">
        <Reveal>
          <div className="glass-light grid gap-4 rounded-3xl p-5 text-center sm:grid-cols-3">
            <div><p className="text-xs font-bold text-slate-500">📅 موعد المسابقة</p><p className="mt-1 text-sm font-extrabold text-navy2">{fmt(s.eventDate)}</p></div>
            <div><p className="text-xs font-bold text-slate-500">📝 آخر أجل للتسجيل</p><p className="mt-1 text-sm font-extrabold text-navy2">{fmt(s.registrationEnd)}</p></div>
            <div><p className="text-xs font-bold text-slate-500">👥 الحد الأقصى للفريق</p><p className="mt-1 text-sm font-extrabold text-navy2">{s.maxTeamSize} أعضاء</p></div>
          </div>
        </Reveal>
      </section>

      {/* ============ GOALS ============ */}
      <section id="goals" className="bg-grid-light scroll-mt-4 py-20">
        <div className="mx-auto max-w-7xl px-4">
          <Reveal><SectionTitle kicker="// goals" title="أهداف المسابقة" sub="لماذا ننظم معركة المبرمجين؟" /></Reveal>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {GOALS.map((g, i) => (
              <Reveal key={g.t} delay={i * 70}>
                <div className="card-pro card-hover h-full p-6">
                  <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-blue-50 to-emerald-50 text-3xl shadow-inner">{g.i}</div>
                  <h3 className="text-lg font-extrabold text-navy2">{g.t}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{g.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ STAGES ============ */}
      <section id="stages" className="bg-hero relative scroll-mt-4 overflow-hidden py-20 text-white">
        <div className="bg-grid absolute inset-0 opacity-60" aria-hidden />
        <div className="relative mx-auto max-w-5xl px-4">
          <Reveal><SectionTitle dark kicker="// roadmap" title="مراحل المسابقة" sub="من التسجيل إلى التتويج" /></Reveal>
          <div className="relative mt-12 space-y-6 before:absolute before:inset-y-2 before:start-7 before:w-0.5 before:bg-gradient-to-b before:from-emerald-300 before:to-sky-300/20">
            {STAGES.map((st, i) => (
              <Reveal key={st.n} delay={i * 90}>
                <div className="relative flex gap-5">
                  <div className="code-font z-10 grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-sky-400 text-lg font-black text-navy shadow-lg">{st.n}</div>
                  <div className="glass flex-1 rounded-2xl p-5">
                    <h3 className="text-lg font-extrabold">{st.t}</h3>
                    <p className="mt-1 text-sm leading-7 text-sky-100/90">{st.d}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CONDITIONS ============ */}
      <section id="conditions" className="scroll-mt-4 py-20">
        <div className="mx-auto max-w-4xl px-4">
          <Reveal><SectionTitle kicker="// rules" title="شروط المشاركة" sub="اقرأ الشروط جيداً قبل التسجيل" /></Reveal>
          <ul className="mt-10 space-y-3">
            {s.conditions.map((c, i) => (
              <Reveal key={i} delay={i * 50}>
                <li className="card-pro flex items-start gap-4 p-4">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-100 font-bold text-emerald-700">✓</span>
                  <span className="pt-0.5 leading-7 text-slate-700">{c}</span>
                </li>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* ============ TEAMS ============ */}
      <section id="teams" className="bg-grid-light scroll-mt-4 pb-20 pt-4">
        <div className="mx-auto max-w-5xl px-4">
          <Reveal><SectionTitle kicker="// teams" title="معلومات الفرق" sub="شارك بمفردك أو كوّن فريقك" /></Reveal>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <Reveal>
              <div className="card-pro h-full p-7">
                <div className="text-4xl">🧑‍💻</div>
                <h3 className="mt-3 text-xl font-extrabold text-navy2">مشاركة فردية</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">سجّل بمفردك وقدّم مشروعك الخاص. مناسبة لمن يفضلون العمل المستقل والتحدي الشخصي.</p>
              </div>
            </Reveal>
            <Reveal delay={100}>
              <div className="card-pro h-full border-emerald-200 p-7">
                <div className="text-4xl">👥</div>
                <h3 className="mt-3 text-xl font-extrabold text-navy2">مشاركة ضمن فريق</h3>
                <ul className="mt-2 space-y-1.5 text-sm leading-7 text-slate-600">
                  <li>• يتكون الفريق من 2 إلى <b>{s.maxTeamSize}</b> أعضاء.</li>
                  <li>• يسجّل قائد الفريق الاستمارة ويُدخل أسماء بقية الأعضاء.</li>
                  <li>• اسم الفريق فريد ولا يمكن تكراره.</li>
                  <li>• تُرسل بطاقة المشارك (QR) إلى بريد قائد الفريق.</li>
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section className="bg-hero relative overflow-hidden py-16 text-center text-white">
        <div className="bg-grid absolute inset-0 opacity-50" aria-hidden />
        <div className="relative mx-auto max-w-3xl px-4">
          <h2 className="text-3xl font-black sm:text-4xl">هل أنت مستعد للمعركة؟</h2>
          <p className="mt-3 text-sky-100">انضم إلى نخبة المبرمجين وأثبت مهارتك.</p>
          <div className="mt-6">
            {open ? <Link href="/register" className="btn btn-green px-10 py-4 text-lg">سجّل الآن ←</Link> : <span className="btn glass px-10 py-4">التسجيل غير متاح حالياً</span>}
          </div>
        </div>
      </section>

      <footer className="bg-navy py-8 text-center text-sm text-sky-200/80">
        <div className="mb-3 flex items-center justify-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={BRAND.logoCollege} alt="" width={36} height={36} className="h-9 w-9 rounded-lg bg-white p-1" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={BRAND.logoClub} alt="" width={36} height={36} className="h-9 w-9 rounded-full bg-white p-0.5" />
        </div>
        <p className="font-bold text-white">New Vision Club – University Science Club</p>
        <p>{BRAND.college} – {BRAND.university}</p>
      </footer>
    </main>
  );
}

function SectionTitle({ kicker, title, sub, dark }: { kicker: string; title: string; sub: string; dark?: boolean }) {
  return (
    <div className="text-center">
      <p className="code-font text-sm font-bold text-emerald-500">{kicker}</p>
      <h2 className={`mt-1 text-3xl font-black sm:text-4xl ${dark ? "text-white" : "text-navy2"}`}>{title}</h2>
      <p className={`mt-2 ${dark ? "text-sky-200" : "text-slate-500"}`}>{sub}</p>
      <div className="mx-auto mt-4 h-1 w-20 rounded-full bg-gradient-to-l from-emerald-400 to-sky-400" />
    </div>
  );
}
