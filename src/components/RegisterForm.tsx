"use client";
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { LEVELS } from "@/lib/constants";
import { makeRegistrationSchema } from "@/lib/validation";
import type { Department } from "@/db/schema";

type Data = {
  fullNameAr: string; fullNameLat: string;
  faculty: string; department: string; specialty: string; level: string;
  phone: string; email: string;
  mode: "individual" | "team" | ""; teamName: string; teamSize: number; teamMembers: string[];
  projectName: string; projectDescription: string; problem: string; technologies: string;
  confirmData: boolean; confirmPrivacy: boolean; website: string;
};

const INIT: Data = {
  fullNameAr: "", fullNameLat: "", faculty: "كلية العلوم والتكنولوجيا", department: "", specialty: "", level: "",
  phone: "", email: "", mode: "", teamName: "", teamSize: 2, teamMembers: [""],
  projectName: "", projectDescription: "", problem: "", technologies: "",
  confirmData: false, confirmPrivacy: false, website: "",
};

const STEPS: { title: string; icon: string; fields: (keyof Data)[] }[] = [
  { title: "المعلومات الشخصية", icon: "👤", fields: ["fullNameAr", "fullNameLat"] },
  { title: "المعلومات الجامعية", icon: "🎓", fields: ["faculty", "department", "specialty", "level"] },
  { title: "معلومات الاتصال", icon: "📞", fields: ["phone", "email"] },
  { title: "معلومات المشاركة", icon: "👥", fields: ["mode", "teamName", "teamSize", "teamMembers"] },
  { title: "معلومات المشروع", icon: "💻", fields: ["projectName", "projectDescription", "problem", "technologies"] },
  { title: "تأكيد التسجيل", icon: "✅", fields: ["confirmData", "confirmPrivacy"] },
];

export default function RegisterForm({ maxTeamSize, departments, closesAt }: { maxTeamSize: number; departments: Department[]; closesAt: string }) {
  const [step, setStep] = useState(0);
  const [d, setD] = useState<Data>(INIT);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [serverMsg, setServerMsg] = useState("");
  const [done, setDone] = useState<{ regNumber: string; cardToken: string; name: string } | null>(null);
  const top = useRef<HTMLDivElement>(null);
  const schema = useMemo(() => makeRegistrationSchema(maxTeamSize), [maxTeamSize]);
  const specs = departments.find((x) => x.name === d.department)?.specialties ?? [];

  const set = <K extends keyof Data>(k: K, v: Data[K]) => {
    setD((p) => ({ ...p, [k]: v }));
    setErrors((e) => (e[k as string] ? { ...e, [k]: "" } : e));
  };

  function setSize(n: number) {
    const size = Math.min(Math.max(n || 2, 2), maxTeamSize);
    setD((p) => ({ ...p, teamSize: size, teamMembers: Array.from({ length: size - 1 }, (_, i) => p.teamMembers[i] ?? "") }));
  }

  function validate(fields: (keyof Data)[]) {
    const payload = { ...d, mode: d.mode || undefined };
    const r = schema.safeParse(payload);
    const errs: Record<string, string> = {};
    if (!r.success) {
      for (const i of r.error.issues) {
        const k = String(i.path[0]);
        if ((fields as string[]).includes(k)) errs[k] ??= i.message;
      }
    }
    return errs;
  }

  function next() {
    const errs = validate(STEPS[step].fields);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setStep((s) => s + 1);
    top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function submit() {
    const errs = validate(STEPS[5].fields);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    setServerMsg("");
    try {
      const r = await fetch("/api/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.ok) {
        setDone({ regNumber: j.regNumber, cardToken: j.cardToken, name: j.name });
        top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      setServerMsg(j.error || "حدث خطأ غير متوقع");
      if (j.errors) {
        setErrors(j.errors);
        const idx = STEPS.findIndex((s) => s.fields.some((f) => j.errors[f]));
        if (idx >= 0) setStep(idx);
      }
      if (r.status === 403) setTimeout(() => window.location.reload(), 2500);
    } catch {
      setServerMsg("تعذر الاتصال بالخادم، تحقق من الإنترنت وحاول مجدداً.");
    } finally {
      setBusy(false);
    }
  }

  if (done) return <Success {...done} />;

  const Err = ({ k }: { k: string }) => (errors[k] ? <p className="mt-1 text-xs font-semibold text-rose-600" role="alert">{errors[k]}</p> : null);
  const cls = (k: string) => `input ${errors[k] ? "err" : ""}`;

  return (
    <div ref={top} className="scroll-mt-24">
      {/* progress */}
      <div className="glass mb-5 rounded-2xl p-4 text-white">
        <div className="mb-2 flex items-center justify-between text-sm font-bold">
          <span>{STEPS[step].icon} {STEPS[step].title}</span>
          <span className="code-font">{step + 1}/{STEPS.length}</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-white/20" role="progressbar" aria-valuenow={step + 1} aria-valuemax={STEPS.length}>
          <div className="h-full rounded-full bg-gradient-to-l from-emerald-300 to-sky-300 transition-all duration-500" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
        <div className="mt-3 hidden justify-between sm:flex">
          {STEPS.map((s, i) => (
            <span key={s.title} className={`grid h-8 w-8 place-items-center rounded-full text-sm transition ${i <= step ? "bg-emerald-400 text-navy" : "bg-white/15"}`}>{i < step ? "✓" : s.icon}</span>
          ))}
        </div>
      </div>

      <div className="glass-light rounded-3xl p-5 sm:p-8" key={step}>
        <div className="fade-up space-y-5">
          {step === 0 && (
            <>
              <div><label className="label">الاسم واللقب بالعربية *</label><input className={cls("fullNameAr")} value={d.fullNameAr} onChange={(e) => set("fullNameAr", e.target.value)} placeholder="مثال: محمد بن علي" autoComplete="name" /><Err k="fullNameAr" /></div>
              <div><label className="label">الاسم واللقب باللاتينية *</label><input className={`${cls("fullNameLat")} ltr`} value={d.fullNameLat} onChange={(e) => set("fullNameLat", e.target.value)} placeholder="Mohamed Benali" /><Err k="fullNameLat" /></div>
            </>
          )}
          {step === 1 && (
            <>
              <div><label className="label">الكلية *</label><input className={cls("faculty")} value={d.faculty} onChange={(e) => set("faculty", e.target.value)} /><Err k="faculty" /></div>
              <div><label className="label">القسم *</label>
                <select className={cls("department")} value={d.department} onChange={(e) => { set("department", e.target.value); set("specialty", ""); }}>
                  <option value="">— اختر القسم —</option>
                  {departments.map((x) => <option key={x.name} value={x.name}>{x.name}</option>)}
                </select><Err k="department" /></div>
              <div><label className="label">التخصص *</label>
                <input className={cls("specialty")} list="specs" value={d.specialty} onChange={(e) => set("specialty", e.target.value)} placeholder={specs.length ? "اختر أو اكتب تخصصك" : "اكتب تخصصك"} />
                <datalist id="specs">{specs.map((x) => <option key={x} value={x} />)}</datalist><Err k="specialty" /></div>
              <div><label className="label">المستوى الدراسي *</label>
                <select className={cls("level")} value={d.level} onChange={(e) => set("level", e.target.value)}>
                  <option value="">— اختر المستوى —</option>
                  {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select><Err k="level" /></div>
            </>
          )}
          {step === 2 && (
            <>
              <div><label className="label">رقم الهاتف *</label><input type="tel" inputMode="tel" className={`${cls("phone")} ltr`} value={d.phone} onChange={(e) => set("phone", e.target.value)} placeholder="0550 00 00 00" autoComplete="tel" /><Err k="phone" /></div>
              <div><label className="label">البريد الإلكتروني *</label><input type="email" className={`${cls("email")} ltr`} value={d.email} onChange={(e) => set("email", e.target.value)} placeholder="name@example.com" autoComplete="email" /><Err k="email" />
                <p className="mt-1 text-xs text-slate-500">سيصلك تأكيد التسجيل وبطاقة المشارك على هذا البريد.</p></div>
            </>
          )}
          {step === 3 && (
            <>
              <div>
                <label className="label">نوع المشاركة *</label>
                <div className="grid grid-cols-2 gap-3">
                  {([["individual", "🧑‍💻", "فردية"], ["team", "👥", "ضمن فريق"]] as const).map(([v, ic, l]) => (
                    <button type="button" key={v} onClick={() => { set("mode", v); if (v === "team" && d.teamMembers.length !== d.teamSize - 1) setSize(d.teamSize); }}
                      className={`rounded-2xl border-2 p-4 text-center font-bold transition ${d.mode === v ? "border-royal bg-blue-50 text-royal shadow-md" : "border-blue-100 bg-white text-slate-600 hover:border-blue-300"}`}>
                      <div className="text-3xl">{ic}</div>{l}
                    </button>
                  ))}
                </div>
                <Err k="mode" />
              </div>
              {d.mode === "team" && (
                <div className="pop space-y-4 rounded-2xl bg-blue-50/60 p-4">
                  <div><label className="label">اسم المجموعة *</label><input className={cls("teamName")} value={d.teamName} onChange={(e) => set("teamName", e.target.value)} /><Err k="teamName" /></div>
                  <div><label className="label">عدد الأعضاء (شاملاً قائد الفريق) *</label>
                    <select className={cls("teamSize")} value={d.teamSize} onChange={(e) => setSize(Number(e.target.value))}>
                      {Array.from({ length: maxTeamSize - 1 }, (_, i) => i + 2).map((n) => <option key={n} value={n}>{n}</option>)}
                    </select><Err k="teamSize" /></div>
                  <div>
                    <label className="label">أسماء بقية الأعضاء *</label>
                    <div className="space-y-2">
                      {d.teamMembers.map((m, i) => (
                        <input key={i} className={cls("teamMembers")} value={m} placeholder={`العضو ${i + 2}`} onChange={(e) => set("teamMembers", d.teamMembers.map((x, j) => (j === i ? e.target.value : x)))} />
                      ))}
                    </div>
                    <Err k="teamMembers" />
                  </div>
                </div>
              )}
            </>
          )}
          {step === 4 && (
            <>
              <div><label className="label">اسم المشروع *</label><input className={cls("projectName")} value={d.projectName} onChange={(e) => set("projectName", e.target.value)} /><Err k="projectName" /></div>
              <div><label className="label">وصف المشروع *</label><textarea rows={4} className={cls("projectDescription")} value={d.projectDescription} onChange={(e) => set("projectDescription", e.target.value)} maxLength={2000} /><Err k="projectDescription" /></div>
              <div><label className="label">المشكلة التي يحلها المشروع *</label><textarea rows={3} className={cls("problem")} value={d.problem} onChange={(e) => set("problem", e.target.value)} maxLength={1500} /><Err k="problem" /></div>
              <div><label className="label">التقنيات المستخدمة *</label><input className={`${cls("technologies")}`} value={d.technologies} onChange={(e) => set("technologies", e.target.value)} placeholder="React, Node.js, PostgreSQL, Python..." /><Err k="technologies" /></div>
            </>
          )}
          {step === 5 && (
            <>
              <div className="rounded-2xl bg-blue-50/70 p-4 text-sm leading-7 text-slate-700">
                <p className="font-extrabold text-navy2">ملخص تسجيلك</p>
                <p>{d.fullNameAr} — <span className="ltr">{d.fullNameLat}</span></p>
                <p>{d.department} / {d.specialty} / {d.level}</p>
                <p>{d.mode === "team" ? `فريق «${d.teamName}» (${d.teamSize} أعضاء)` : "مشاركة فردية"} — مشروع: {d.projectName}</p>
                <p className="ltr text-start">{d.email} · {d.phone}</p>
              </div>
              <label className="flex cursor-pointer items-start gap-3"><input type="checkbox" className="mt-1.5 h-5 w-5 accent-blue-700" checked={d.confirmData} onChange={(e) => set("confirmData", e.target.checked)} /><span className="text-sm leading-7">أقرّ بأن جميع البيانات المُدخلة صحيحة وكاملة، وأتحمل مسؤولية أي خطأ فيها.</span></label><Err k="confirmData" />
              <label className="flex cursor-pointer items-start gap-3"><input type="checkbox" className="mt-1.5 h-5 w-5 accent-blue-700" checked={d.confirmPrivacy} onChange={(e) => set("confirmPrivacy", e.target.checked)} /><span className="text-sm leading-7">أوافق على <b>سياسة الخصوصية</b>: تُستخدم بياناتي لتنظيم المسابقة والتواصل معي فقط، ولا تُشارك مع أي طرف خارجي.</span></label><Err k="confirmPrivacy" />
              {/* honeypot */}
              <input tabIndex={-1} autoComplete="off" aria-hidden className="absolute -start-[9999px] h-0 w-0 opacity-0" value={d.website} onChange={(e) => set("website", e.target.value)} name="website" />
              {serverMsg && <p className="rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-700" role="alert">{serverMsg}</p>}
            </>
          )}
        </div>

        {step < 5 && serverMsg && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-700" role="alert">{serverMsg}</p>}
        <div className="mt-8 flex items-center justify-between gap-3">
          <button type="button" className="btn btn-outline" disabled={step === 0 || busy} onClick={() => setStep((s) => s - 1)}>→ السابق</button>
          {step < 5 ? (
            <button type="button" className="btn btn-primary" onClick={next}>التالي ←</button>
          ) : (
            <button type="button" className="btn btn-green px-8" disabled={busy} onClick={submit}>{busy ? "جارٍ الإرسال..." : "إرسال التسجيل 🚀"}</button>
          )}
        </div>
      </div>
      <p className="mt-4 text-center text-xs text-sky-100">يُغلق التسجيل تلقائياً في: <span className="ltr font-bold">{new Date(closesAt).toLocaleString("ar-DZ", { timeZone: "Africa/Algiers", dateStyle: "medium", timeStyle: "short" })}</span></p>
    </div>
  );
}

function Success({ regNumber, cardToken, name }: { regNumber: string; cardToken: string; name: string }) {
  return (
    <div className="pop glass-light overflow-hidden rounded-3xl text-center">
      <div className="bg-gradient-to-l from-emerald-500 to-sky-500 px-6 py-8 text-white">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-white text-5xl text-emerald-500 shadow-xl">✓</div>
        <h2 className="mt-4 text-3xl font-black">تم التسجيل بنجاح! 🎉</h2>
        <p className="mt-1 text-emerald-50">مرحباً بك في معركة المبرمجين{name ? `، ${name}` : ""}</p>
      </div>
      <div className="space-y-5 p-6 sm:p-8">
        <div>
          <p className="text-sm font-bold text-slate-500">رقم التسجيل الخاص بك</p>
          <p className="code-font mt-1 inline-block rounded-2xl border-2 border-dashed border-royal bg-blue-50 px-6 py-3 text-2xl font-black tracking-widest text-royal sm:text-3xl">{regNumber}</p>
          <p className="mt-2 text-xs text-slate-500">احتفظ بهذا الرقم، فهو مطلوب للتواصل ويوم المسابقة.</p>
        </div>
        {cardToken && (
          <div className="mx-auto max-w-xs rounded-2xl bg-white p-4 shadow-lg ring-1 ring-blue-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/card/${cardToken}`} alt="رمز QR الخاص بك" width={180} height={180} className="mx-auto h-44 w-44" />
            <p className="mt-2 text-sm font-bold text-navy2">بطاقتك الرقمية (QR)</p>
          </div>
        )}
        <p className="rounded-2xl bg-blue-50 p-4 text-sm leading-7 text-slate-700">📧 أُرسلت رسالة تأكيد تحتوي على بطاقة المشارك إلى بريدك الإلكتروني. إن لم تجدها، تحقق من البريد المزعج (Spam).</p>
        <div className="flex flex-wrap justify-center gap-3">
          {cardToken && <Link href={`/card/${cardToken}`} className="btn btn-primary" target="_blank">عرض بطاقة المشارك وطباعتها</Link>}
          <Link href="/" className="btn btn-outline">العودة للرئيسية</Link>
        </div>
      </div>
    </div>
  );
}
