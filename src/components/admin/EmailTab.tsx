"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { STATUSES } from "@/lib/constants";
import { TEMPLATES, TEMPLATE_KEYS, VARIABLES, type TemplateKey } from "@/lib/templates";
import { api, fmtDate, Spinner, useDebounced, useToast, type Reg } from "./ui";

type Log = { id: number; toEmail: string; toName: string | null; subject: string; template: string; status: string; error: string | null; attempts: number; sentBy: string | null; createdAt: string; sentAt: string | null };

export default function EmailTab({ mailConfigured }: { mailConfigured: boolean }) {
  const [sub, setSub] = useState<"compose" | "logs">("compose");
  return (
    <div className="space-y-4">
      {!mailConfigured && <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-900">⚠️ SMTP غير مهيأ: لن تصل الرسائل قبل ضبط SMTP_HOST / SMTP_USER / SMTP_PASS / SMTP_FROM على الخادم. الرسائل الفاشلة تُحفظ في السجل ويمكن إعادة إرسالها لاحقاً.</div>}
      <div className="flex gap-2">
        {([["compose", "✍️ إنشاء رسالة"], ["logs", "📜 سجل الرسائل"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setSub(k)} className={`btn btn-sm ${sub === k ? "btn-primary" : "btn-outline"}`}>{l}</button>
        ))}
      </div>
      {sub === "compose" ? <Compose /> : <Logs />}
    </div>
  );
}

function Compose() {
  const toast = useToast();
  const [tpl, setTpl] = useState<TemplateKey>("custom");
  const [subject, setSubject] = useState(TEMPLATES.custom.subject);
  const [body, setBody] = useState(TEMPLATES.custom.body);
  const [editorKey, setEditorKey] = useState(0);
  const [includeCard, setIncludeCard] = useState(false);
  const [aud, setAud] = useState("all");
  const [status, setStatus] = useState("accepted");
  const [team, setTeam] = useState("");
  const [email, setEmail] = useState("");
  const [search, setSearch] = useState("");
  const dsearch = useDebounced(search);
  const [found, setFound] = useState<Reg[]>([]);
  const [picked, setPicked] = useState<Reg | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [teams, setTeams] = useState<string[]>([]);

  useEffect(() => {
    api<{ rows: Reg[] }>("/api/admin/registrations?mode=team&scope=teams").then((r) => r.ok && setTeams([...new Set(r.data.rows.map((x) => x.teamName || ""))].filter(Boolean)));
  }, []);
  useEffect(() => {
    if (aud !== "single" || dsearch.length < 2) return setFound([]);
    api<{ rows: Reg[] }>(`/api/admin/registrations?scope=participants&q=${encodeURIComponent(dsearch)}`).then((r) => r.ok && setFound(r.data.rows.slice(0, 6)));
  }, [dsearch, aud]);

  function pickTemplate(k: TemplateKey) {
    setTpl(k);
    setSubject(TEMPLATES[k].subject);
    setBody(TEMPLATES[k].body);
    setIncludeCard(TEMPLATES[k].includeCard);
    setEditorKey((x) => x + 1);
  }

  function audience() {
    if (aud === "single") return picked ? { type: "ids", ids: [picked.id] } : null;
    if (aud === "external") return email ? { type: "external", email } : null;
    if (aud === "status") return { type: "status", status };
    if (aud === "team") return team ? { type: "team", team } : null;
    return { type: aud };
  }

  async function run(isPreview: boolean) {
    const a = audience();
    if (!a) return toast("حدد المستلم أولاً", "err");
    if (!isPreview && !confirm("هل تريد إرسال هذه الرسالة الآن؟")) return;
    setBusy(true);
    const r = await api<{ html?: string; total: number; sent: number; failed: number; firstError?: string }>("/api/admin/email/send", "POST", { template: tpl, subject, body, includeCard, audience: a, preview: isPreview });
    setBusy(false);
    if (isPreview) return r.ok && r.data.html ? setPreview(r.data.html) : toast(r.data.error || "فشلت المعاينة", "err");
    if (!r.ok) return toast(r.data.error || "فشل الإرسال", "err");
    if (r.data.failed) toast(`أُرسلت ${r.data.sent} وفشلت ${r.data.failed}. ${r.data.firstError ?? ""}`, "err");
    else toast(`✓ تم إرسال ${r.data.sent} رسالة بنجاح`);
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
      <div className="card-pro space-y-4 p-5">
        <div>
          <label className="label">قالب الرسالة</label>
          <div className="flex flex-wrap gap-2">
            {TEMPLATE_KEYS.map((k) => <button key={k} onClick={() => pickTemplate(k)} className={`btn btn-sm ${tpl === k ? "btn-primary" : "btn-outline"}`}>{TEMPLATES[k].label}</button>)}
          </div>
        </div>
        <div><label className="label">عنوان الرسالة</label><input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} /></div>
        <div>
          <label className="label">نص الرسالة (محرر مرئي)</label>
          <RichEditor key={editorKey} initial={body} onChange={setBody} />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-bold"><input type="checkbox" className="h-4 w-4 accent-blue-700" checked={includeCard} onChange={(e) => setIncludeCard(e.target.checked)} /> إرفاق بطاقة المشارك (QR) داخل الرسالة</label>
      </div>

      <div className="card-pro h-fit space-y-4 p-5">
        <div>
          <label className="label">المستلمون</label>
          <select className="input" value={aud} onChange={(e) => setAud(e.target.value)}>
            <option value="all">جميع المشاركين</option>
            <option value="accepted">المقبولون فقط</option>
            <option value="status">حسب حالة التسجيل</option>
            <option value="team">فريق معيّن</option>
            <option value="single">مشارك واحد (بحث)</option>
            <option value="external">عنوان بريد محدد</option>
          </select>
        </div>
        {aud === "status" && <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>{STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</select>}
        {aud === "team" && <><input className="input" list="team-list" placeholder="اسم الفريق" value={team} onChange={(e) => setTeam(e.target.value)} /><datalist id="team-list">{teams.map((t) => <option key={t} value={t} />)}</datalist></>}
        {aud === "external" && <input className="input ltr" type="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />}
        {aud === "single" && (
          <div>
            {picked ? <div className="flex items-center justify-between rounded-xl bg-emerald-50 p-3 text-sm"><span><b>{picked.fullNameAr}</b><br /><span className="code-font text-xs">{picked.regNumber}</span></span><button className="text-rose-600" onClick={() => setPicked(null)}>✕</button></div> : (
              <>
                <input className="input" placeholder="ابحث بالاسم / البريد / الرقم" value={search} onChange={(e) => setSearch(e.target.value)} />
                <div className="mt-2 space-y-1">{found.map((r) => <button key={r.id} onClick={() => setPicked(r)} className="block w-full rounded-lg bg-blue-50 p-2 text-start text-sm hover:bg-blue-100">{r.fullNameAr} <span className="code-font text-xs text-slate-500">{r.regNumber}</span></button>)}</div>
              </>
            )}
          </div>
        )}
        <div className="rounded-xl bg-blue-50 p-3 text-xs leading-6 text-slate-600">
          <b className="text-navy2">المتغيرات المدعومة:</b>
          <div className="mt-1 flex flex-wrap gap-1">{VARIABLES.map((v) => <code key={v.key} className="code-font rounded bg-white px-1.5 py-0.5 text-[11px] text-royal" title={v.label}>{`{{${v.key}}}`}</code>)}</div>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-outline flex-1" disabled={busy} onClick={() => run(true)}>👁 معاينة</button>
          <button className="btn btn-primary flex-1" disabled={busy} onClick={() => run(false)}>{busy ? "جارٍ الإرسال..." : "📤 إرسال"}</button>
        </div>
      </div>

      {preview && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-navy/60 p-3" onMouseDown={(e) => e.target === e.currentTarget && setPreview(null)}>
          <div className="pop flex h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b p-3"><b>معاينة الرسالة</b><button className="btn btn-outline btn-sm" onClick={() => setPreview(null)}>إغلاق</button></div>
            <iframe title="preview" sandbox="" srcDoc={preview} className="w-full flex-1" />
          </div>
        </div>
      )}
    </div>
  );
}

function RichEditor({ initial, onChange }: { initial: string; onChange: (h: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.innerHTML = initial;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const cmd = (c: string, v?: string) => {
    ref.current?.focus();
    document.execCommand(c, false, v);
    onChange(ref.current?.innerHTML ?? "");
  };
  const Btn = ({ l, t, c, v }: { l: React.ReactNode; t: string; c: string; v?: string }) => (
    <button type="button" title={t} onMouseDown={(e) => e.preventDefault()} onClick={() => cmd(c, v)} className="grid h-8 min-w-8 place-items-center rounded-lg border border-blue-100 bg-white px-2 text-sm font-bold hover:bg-blue-50">{l}</button>
  );
  return (
    <div className="overflow-hidden rounded-2xl border-2 border-blue-100">
      <div className="flex flex-wrap items-center gap-1.5 border-b border-blue-100 bg-blue-50/60 p-2">
        <Btn l={<b>B</b>} t="غامق" c="bold" /><Btn l={<i>I</i>} t="مائل" c="italic" /><Btn l={<u>U</u>} t="تسطير" c="underline" />
        <Btn l="H" t="عنوان" c="formatBlock" v="h2" /><Btn l="¶" t="فقرة" c="formatBlock" v="p" />
        <Btn l="•" t="قائمة نقطية" c="insertUnorderedList" /><Btn l="1." t="قائمة رقمية" c="insertOrderedList" />
        <Btn l="⇤" t="يمين" c="justifyRight" /><Btn l="≡" t="وسط" c="justifyCenter" /><Btn l="⇥" t="يسار" c="justifyLeft" />
        <input type="color" title="لون النص" defaultValue="#1d4ed8" className="h-8 w-8 cursor-pointer rounded-lg border border-blue-100 bg-white" onChange={(e) => cmd("foreColor", e.target.value)} />
        <button type="button" title="رابط" onMouseDown={(e) => e.preventDefault()} onClick={() => { const u = prompt("الرابط (https://...)"); if (u && /^https?:\/\//.test(u)) cmd("createLink", u); }} className="h-8 rounded-lg border border-blue-100 bg-white px-2 text-sm hover:bg-blue-50">🔗</button>
        <Btn l="⌫" t="إزالة التنسيق" c="removeFormat" />
        <span className="mx-1 h-6 w-px bg-blue-200" />
        {VARIABLES.map((v) => (
          <button key={v.key} type="button" title={`إدراج ${v.label}`} onMouseDown={(e) => e.preventDefault()} onClick={() => cmd("insertText", `{{${v.key}}}`)} className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100">+ {v.label}</button>
        ))}
      </div>
      <div ref={ref} contentEditable suppressContentEditableWarning dir="rtl" onInput={() => onChange(ref.current?.innerHTML ?? "")} className="min-h-[260px] bg-white p-4 text-sm leading-8 outline-none [&_h2]:my-2 [&_h2]:text-xl [&_h2]:font-black [&_h2]:text-navy2 [&_li]:ms-5 [&_ol]:list-decimal [&_ul]:list-disc [&_a]:text-royal [&_a]:underline" />
    </div>
  );
}

function Logs() {
  const toast = useToast();
  const [rows, setRows] = useState<Log[] | null>(null);
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const dq = useDebounced(q);
  const [busy, setBusy] = useState<number | "all" | null>(null);

  const load = useCallback(async () => {
    const p = new URLSearchParams();
    if (status) p.set("status", status);
    if (dq) p.set("q", dq);
    const r = await api<{ rows: Log[] }>(`/api/admin/email/logs?${p}`);
    if (r.ok) setRows(r.data.rows);
  }, [status, dq]);
  useEffect(() => { load(); }, [load]);

  async function resend(id: number | "failed") {
    setBusy(id === "failed" ? "all" : id);
    const r = await api<{ sent: number; failed: number; firstError?: string }>(`/api/admin/email/logs/${id}/resend`, "POST", {});
    setBusy(null);
    if (r.ok) toast(r.data.failed ? `نجح ${r.data.sent} وفشل ${r.data.failed}: ${r.data.firstError ?? ""}` : `✓ أُعيد إرسال ${r.data.sent}`, r.data.failed ? "err" : "ok");
    else toast(r.data.error || "فشل", "err");
    load();
  }

  const badge = (s: string) => s === "sent" ? "bg-emerald-100 text-emerald-700" : s === "failed" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700";
  return (
    <div className="space-y-3">
      <div className="card-pro flex flex-wrap items-center gap-3 p-4">
        <input className="input max-w-xs" placeholder="🔍 بريد / عنوان / اسم" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input max-w-[160px]" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">كل الحالات</option><option value="sent">أُرسلت</option><option value="failed">فشلت</option><option value="pending">معلّقة</option></select>
        <button className="btn btn-outline btn-sm" onClick={load}>تحديث</button>
        <button className="btn btn-primary btn-sm" disabled={busy === "all"} onClick={() => resend("failed")}>{busy === "all" ? "..." : "🔁 إعادة إرسال كل الفاشلة"}</button>
      </div>
      {rows === null ? <div className="py-12"><Spinner /></div> : (
        <div className="card-pro overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-blue-50 text-xs text-navy2"><tr>{["المستلم", "العنوان", "القالب", "الحالة", "التاريخ", ""].map((h) => <th key={h} className="px-3 py-3 text-start font-extrabold">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-blue-50">
              {rows.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-slate-500">لا توجد رسائل.</td></tr>}
              {rows.map((l) => (
                <tr key={l.id}>
                  <td className="px-3 py-2"><p className="font-bold">{l.toName ?? "—"}</p><p className="ltr text-xs text-slate-500">{l.toEmail}</p></td>
                  <td className="max-w-[220px] truncate px-3 py-2 text-xs" title={l.subject}>{l.subject}</td>
                  <td className="px-3 py-2 text-xs">{TEMPLATES[l.template as TemplateKey]?.label ?? l.template}</td>
                  <td className="px-3 py-2"><span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${badge(l.status)}`}>{l.status === "sent" ? "أُرسلت" : l.status === "failed" ? "فشلت" : "معلّقة"}</span>{l.error && <p className="mt-1 max-w-[200px] text-[11px] text-rose-600" title={l.error}>{l.error.slice(0, 70)}</p>}</td>
                  <td className="px-3 py-2 text-xs">{fmtDate(l.sentAt ?? l.createdAt)}<br /><span className="text-slate-400">محاولات: {l.attempts}</span></td>
                  <td className="px-3 py-2">{l.status !== "sent" && <button className="btn btn-outline btn-sm" disabled={busy === l.id} onClick={() => resend(l.id)}>{busy === l.id ? "..." : "إعادة إرسال"}</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
