"use client";
import { useEffect, useState } from "react";
import { api, Field, Spinner, useToast } from "./ui";

type Dept = { name: string; specialties: string[] };
type S = {
  competitionName: string; description: string; eventDate: string; registrationStart: string; registrationEnd: string;
  conditions: string; maxTeamSize: number; registrationOpen: boolean; departments: Dept[];
};

const toLocal = (iso: string) => {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const toIso = (local: string) => new Date(local).toISOString();

export default function SettingsTab() {
  const toast = useToast();
  const [s, setS] = useState<S | null>(null);
  const [deps, setDeps] = useState<{ name: string; specs: string }[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ settings: S }>("/api/admin/settings").then((r) => {
      if (!r.ok) return toast(r.data.error || "فشل التحميل", "err");
      const x = r.data.settings;
      setS({ ...x, eventDate: toLocal(x.eventDate), registrationStart: toLocal(x.registrationStart), registrationEnd: toLocal(x.registrationEnd) });
      setDeps(x.departments.map((d) => ({ name: d.name, specs: d.specialties.join("، ") })));
    });
  }, [toast]);

  if (!s) return <div className="py-16"><Spinner /></div>;
  const set = <K extends keyof S>(k: K, v: S[K]) => setS((p) => (p ? { ...p, [k]: v } : p));

  async function save() {
    if (!s) return;
    setBusy(true);
    const r = await api("/api/admin/settings", "PUT", {
      ...s,
      eventDate: toIso(s.eventDate), registrationStart: toIso(s.registrationStart), registrationEnd: toIso(s.registrationEnd),
      maxTeamSize: Number(s.maxTeamSize),
      departments: deps.filter((d) => d.name.trim()).map((d) => ({ name: d.name.trim(), specialties: d.specs.split(/[,،\n]/).map((x) => x.trim()).filter(Boolean) })),
    });
    setBusy(false);
    r.ok ? toast("✓ تم حفظ الإعدادات") : toast(r.data.error || "فشل الحفظ", "err");
  }

  return (
    <div className="card-pro mx-auto max-w-3xl space-y-5 p-5 sm:p-7">
      <Field label="اسم المسابقة"><input className="input" value={s.competitionName} onChange={(e) => set("competitionName", e.target.value)} /></Field>
      <Field label="وصف المسابقة"><textarea className="input" rows={4} value={s.description} onChange={(e) => set("description", e.target.value)} /></Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="موعد المسابقة"><input type="datetime-local" className="input ltr" value={s.eventDate} onChange={(e) => set("eventDate", e.target.value)} /></Field>
        <Field label="بداية التسجيل"><input type="datetime-local" className="input ltr" value={s.registrationStart} onChange={(e) => set("registrationStart", e.target.value)} /></Field>
        <Field label="نهاية التسجيل (إغلاق تلقائي)"><input type="datetime-local" className="input ltr" value={s.registrationEnd} onChange={(e) => set("registrationEnd", e.target.value)} /></Field>
      </div>
      <Field label="شروط المشاركة (شرط في كل سطر)"><textarea className="input" rows={6} value={s.conditions} onChange={(e) => set("conditions", e.target.value)} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="الحد الأقصى لأعضاء الفريق"><input type="number" min={2} max={20} className="input" value={s.maxTeamSize} onChange={(e) => set("maxTeamSize", Number(e.target.value))} /></Field>
        <Field label="حالة التسجيل">
          <label className={`flex cursor-pointer items-center justify-between rounded-xl border-2 p-3 font-bold ${s.registrationOpen ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-rose-300 bg-rose-50 text-rose-700"}`}>
            {s.registrationOpen ? "مفتوح (ضمن المواعيد)" : "متوقف يدوياً"}
            <input type="checkbox" className="h-5 w-5" checked={s.registrationOpen} onChange={(e) => set("registrationOpen", e.target.checked)} />
          </label>
        </Field>
      </div>
      <div>
        <p className="label">الأقسام والتخصصات</p>
        <div className="space-y-3">
          {deps.map((d, i) => (
            <div key={i} className="grid gap-2 rounded-2xl bg-blue-50/60 p-3 sm:grid-cols-[1fr_2fr_auto]">
              <input className="input" placeholder="اسم القسم" value={d.name} onChange={(e) => setDeps((p) => p.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
              <input className="input" placeholder="التخصصات مفصولة بفاصلة" value={d.specs} onChange={(e) => setDeps((p) => p.map((x, j) => (j === i ? { ...x, specs: e.target.value } : x)))} />
              <button className="btn btn-sm bg-rose-50 text-rose-600" onClick={() => setDeps((p) => p.filter((_, j) => j !== i))}>حذف</button>
            </div>
          ))}
          <button className="btn btn-outline btn-sm" onClick={() => setDeps((p) => [...p, { name: "", specs: "" }])}>+ إضافة قسم</button>
        </div>
      </div>
      <button className="btn btn-primary w-full py-3" disabled={busy} onClick={save}>{busy ? "جارٍ الحفظ..." : "💾 حفظ الإعدادات"}</button>
    </div>
  );
}
