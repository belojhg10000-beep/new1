"use client";
import { useEffect, useState } from "react";
import { api, Spinner } from "./ui";

type Stats = Record<string, number>;
type Data = { stats: Stats; mail: Stats; daily: { day: string; n: number }[]; byDept: { name: string; n: number }[] };

const CARDS: { k: string; l: string; i: string; c: string }[] = [
  { k: "participants", l: "إجمالي المشاركين", i: "👥", c: "from-blue-600 to-sky-500" },
  { k: "teams", l: "عدد الفرق", i: "🛡️", c: "from-indigo-600 to-blue-500" },
  { k: "individuals", l: "المشاركون الفرديون", i: "🧑‍💻", c: "from-sky-600 to-cyan-500" },
  { k: "projects", l: "عدد المشاريع", i: "💡", c: "from-emerald-600 to-teal-500" },
  { k: "last24h", l: "تسجيلات آخر 24 ساعة", i: "🆕", c: "from-fuchsia-600 to-pink-500" },
  { k: "statusNew", l: "جديد (بانتظار الفرز)", i: "📥", c: "from-sky-500 to-blue-400" },
  { k: "review", l: "قيد المراجعة", i: "🔎", c: "from-amber-500 to-orange-400" },
  { k: "accepted", l: "المقبولون", i: "✅", c: "from-emerald-500 to-green-400" },
  { k: "rejected", l: "المرفوضون", i: "⛔", c: "from-rose-600 to-red-400" },
  { k: "waitlist", l: "قائمة الانتظار", i: "⏳", c: "from-violet-600 to-purple-400" },
  { k: "checkedIn", l: "الحاضرون (Check-in)", i: "🎟️", c: "from-teal-600 to-emerald-400" },
];

export default function OverviewTab({ mailConfigured }: { mailConfigured: boolean }) {
  const [d, setD] = useState<Data | null>(null);
  useEffect(() => {
    api<Data>("/api/admin/stats").then((r) => r.ok && setD(r.data));
  }, []);
  if (!d) return <div className="py-20"><Spinner /></div>;
  const max = Math.max(1, ...d.daily.map((x) => x.n));
  const maxDept = Math.max(1, ...d.byDept.map((x) => x.n));
  return (
    <div className="space-y-6">
      {!mailConfigured && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold leading-7 text-amber-900">
          ⚠️ خدمة البريد (SMTP) غير مهيأة بعد على الخادم، لذلك ستُسجَّل الرسائل كـ«فاشلة» ويمكن إعادة إرسالها بعد ضبط متغيرات SMTP_* (راجع دليل الإعداد).
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {CARDS.map((c) => (
          <div key={c.k} className="card-pro overflow-hidden p-4">
            <div className={`mb-3 grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br ${c.c} text-xl text-white shadow-md`}>{c.i}</div>
            <p className="code-font text-3xl font-black text-navy2">{d.stats[c.k] ?? 0}</p>
            <p className="text-xs font-bold text-slate-500">{c.l}</p>
          </div>
        ))}
        <div className="card-pro p-4">
          <div className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-slate-600 to-slate-400 text-xl text-white">✉️</div>
          <p className="code-font text-3xl font-black text-navy2">{d.mail.sent ?? 0}<span className="text-base text-rose-500"> / {d.mail.failed ?? 0}</span></p>
          <p className="text-xs font-bold text-slate-500">رسائل مرسلة / فاشلة</p>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card-pro p-5">
          <h3 className="mb-4 font-extrabold text-navy2">التسجيلات خلال آخر 14 يوماً</h3>
          <div className="flex h-40 items-end gap-1.5" dir="ltr">
            {d.daily.map((x) => (
              <div key={x.day} className="group flex flex-1 flex-col items-center justify-end gap-1">
                <span className="code-font text-[10px] text-slate-500">{x.n || ""}</span>
                <div className="w-full rounded-t-md bg-gradient-to-t from-royal to-sky2 transition-all" style={{ height: `${Math.max(3, (x.n / max) * 100)}%` }} />
                <span className="code-font text-[9px] text-slate-400">{x.day}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card-pro p-5">
          <h3 className="mb-4 font-extrabold text-navy2">التوزيع حسب القسم</h3>
          <div className="space-y-3">
            {d.byDept.length === 0 && <p className="text-sm text-slate-500">لا توجد بيانات بعد.</p>}
            {d.byDept.map((x) => (
              <div key={x.name}>
                <div className="mb-1 flex justify-between text-xs font-bold text-slate-600"><span>{x.name}</span><span className="code-font">{x.n}</span></div>
                <div className="h-2.5 overflow-hidden rounded-full bg-blue-50"><div className="h-full rounded-full bg-gradient-to-l from-emerald-400 to-royal" style={{ width: `${(x.n / maxDept) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
