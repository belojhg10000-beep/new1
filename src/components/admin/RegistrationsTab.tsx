"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LEVELS, STATUSES } from "@/lib/constants";
import { api, Field, fmtDate, Modal, Spinner, StatusBadge, useDebounced, useToast, type Reg } from "./ui";

type View = "participants" | "projects" | "teams";

export default function RegistrationsTab({ view, can }: { view: View; can: (p: string) => boolean }) {
  const toast = useToast();
  const [rows, setRows] = useState<Reg[] | null>(null);
  const [facets, setFacets] = useState<{ departments: string[]; specialties: string[] }>({ departments: [], specialties: [] });
  const [f, setF] = useState({ q: "", department: "", specialty: "", mode: view === "teams" ? "team" : "", status: "", team: "", checkedIn: "" });
  const dq = useDebounced(f);
  const [sel, setSel] = useState<Reg | null>(null);
  const [edit, setEdit] = useState<Reg | null>(null);
  const [del, setDel] = useState<Reg | null>(null);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    Object.entries(dq).forEach(([k, v]) => v && p.set(k, v));
    return p;
  }, [dq]);

  const load = useCallback(async () => {
    const p = new URLSearchParams(qs);
    p.set("scope", view);
    const r = await api<{ rows: Reg[]; facets: typeof facets }>(`/api/admin/registrations?${p}`);
    if (r.ok) {
      setRows(r.data.rows);
      setFacets(r.data.facets);
    } else toast(r.data.error || "فشل التحميل", "err");
  }, [qs, view, toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function setStatus(r: Reg, status: string, notify = false) {
    const res = await api(`/api/admin/registrations/${r.id}`, "PATCH", { status, notify });
    if (res.ok) {
      toast("تم تحديث الحالة" + (notify ? " وإرسال إشعار للمشارك" : ""));
      load();
      setSel((s) => (s && s.id === r.id ? { ...s, status } : s));
    } else toast(res.data.error || "فشل التحديث", "err");
  }

  const upd = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));
  const canEdit = can("participants.edit");

  return (
    <div className="space-y-4">
      {/* filters */}
      <div className="card-pro grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <input className="input sm:col-span-2" placeholder="🔍 بحث: الاسم، البريد، رقم التسجيل، المشروع..." value={f.q} onChange={(e) => upd("q", e.target.value)} />
        <select className="input" value={f.department} onChange={(e) => upd("department", e.target.value)}>
          <option value="">كل الأقسام</option>
          {facets.departments.map((d) => <option key={d}>{d}</option>)}
        </select>
        <input className="input" list="spec-f" placeholder="التخصص" value={f.specialty} onChange={(e) => upd("specialty", e.target.value)} />
        <datalist id="spec-f">{facets.specialties.map((d) => <option key={d} value={d} />)}</datalist>
        {view !== "teams" && (
          <select className="input" value={f.mode} onChange={(e) => upd("mode", e.target.value)}>
            <option value="">فردي + فرق</option>
            <option value="individual">فردي فقط</option>
            <option value="team">فرق فقط</option>
          </select>
        )}
        <input className="input" placeholder="اسم الفريق" value={f.team} onChange={(e) => upd("team", e.target.value)} />
        <select className="input" value={f.status} onChange={(e) => upd("status", e.target.value)}>
          <option value="">كل الحالات</option>
          {STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        {view === "participants" && (
          <select className="input" value={f.checkedIn} onChange={(e) => upd("checkedIn", e.target.value)}>
            <option value="">الحضور: الكل</option>
            <option value="1">حاضر</option>
            <option value="0">غير حاضر</option>
          </select>
        )}
        <div className="flex items-center gap-2">
          <button className="btn btn-outline btn-sm" onClick={() => setF({ q: "", department: "", specialty: "", mode: view === "teams" ? "team" : "", status: "", team: "", checkedIn: "" })}>مسح الفلاتر</button>
          {view === "participants" && can("participants.export") && (
            <a className="btn btn-green btn-sm" href={`/api/admin/export?${qs}`} download>⬇ تصدير CSV</a>
          )}
        </div>
      </div>

      {rows === null ? (
        <div className="py-16"><Spinner /></div>
      ) : (
        <>
          <p className="text-sm font-bold text-slate-500">{rows.length} نتيجة</p>
          {rows.length === 0 && <div className="card-pro p-10 text-center text-slate-500">لا توجد نتائج مطابقة.</div>}

          {view === "participants" && rows.length > 0 && (
            <div className="card-pro overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead className="bg-blue-50 text-xs text-navy2">
                  <tr>{["رقم التسجيل", "الاسم", "القسم / التخصص", "المشاركة", "المشروع", "الحالة", "إجراءات"].map((h) => <th key={h} className="px-3 py-3 text-start font-extrabold">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-blue-50">
                  {rows.map((r) => (
                    <tr key={r.id} className="hover:bg-blue-50/40">
                      <td className="code-font px-3 py-2.5 text-xs font-bold text-royal">{r.regNumber}{r.checkedIn && <span title="حاضر"> 🎟️</span>}</td>
                      <td className="px-3 py-2.5"><p className="font-bold">{r.fullNameAr}</p><p className="ltr text-xs text-slate-500">{r.email}</p></td>
                      <td className="px-3 py-2.5 text-xs">{r.department}<br /><span className="text-slate-500">{r.specialty}</span></td>
                      <td className="px-3 py-2.5 text-xs">{r.mode === "team" ? `👥 ${r.teamName} (${r.teamSize})` : "🧑‍💻 فردي"}</td>
                      <td className="max-w-[160px] truncate px-3 py-2.5 text-xs" title={r.projectName}>{r.projectName}</td>
                      <td className="px-3 py-2.5">
                        {canEdit ? (
                          <select className="rounded-lg border border-blue-100 bg-white px-1.5 py-1 text-xs font-bold" value={r.status} onChange={(e) => setStatus(r, e.target.value)}>
                            {STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                          </select>
                        ) : <StatusBadge status={r.status} />}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex gap-1.5">
                          <button className="btn btn-outline btn-sm" onClick={() => setSel(r)}>عرض</button>
                          {canEdit && <button className="btn btn-outline btn-sm" onClick={() => setEdit(r)}>تعديل</button>}
                          {can("participants.delete") && <button className="btn btn-sm bg-rose-50 text-rose-600 hover:bg-rose-100" onClick={() => setDel(r)}>حذف</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {view === "projects" && (
            <div className="grid gap-4 lg:grid-cols-2">
              {rows.map((r) => (
                <div key={r.id} className="card-pro p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-lg font-black text-navy2">💡 {r.projectName}</h3>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {r.mode === "team" ? `فريق «${r.teamName}» — القائد: ${r.fullNameAr}` : `${r.fullNameAr} (فردي)`} · <span className="code-font">{r.regNumber}</span>
                  </p>
                  <p className="mt-3 text-sm leading-7 text-slate-700">{r.projectDescription}</p>
                  <p className="mt-2 rounded-xl bg-amber-50 p-3 text-sm leading-7 text-amber-900"><b>المشكلة:</b> {r.problem}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {r.technologies.split(/[,،\n]/).map((t) => t.trim()).filter(Boolean).map((t) => <span key={t} className="code-font rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-royal">{t}</span>)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {view === "teams" && (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {rows.map((r) => (
                <div key={r.id} className="card-pro card-hover p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-lg font-black text-navy2">🛡️ {r.teamName}</h3>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{r.teamSize} أعضاء · {r.department} · <span className="code-font">{r.regNumber}</span></p>
                  <ul className="mt-3 space-y-1 text-sm">
                    <li>👑 <b>{r.fullNameAr}</b> <span className="text-xs text-slate-500">(قائد)</span></li>
                    {r.teamMembers.map((m, i) => <li key={i}>👤 {m}</li>)}
                  </ul>
                  <p className="mt-3 rounded-xl bg-blue-50 p-2 text-sm font-bold text-royal">💡 {r.projectName}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {sel && <ProfileModal r={sel} onClose={() => setSel(null)} can={can} onStatus={setStatus} />}
      {edit && <EditModal r={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
      {del && (
        <Modal title="تأكيد الحذف" onClose={() => setDel(null)}>
          <p className="leading-8 text-slate-700">هل أنت متأكد من حذف تسجيل <b>{del.fullNameAr}</b> (<span className="code-font">{del.regNumber}</span>)؟ لا يمكن التراجع عن هذه العملية.</p>
          <div className="mt-5 flex gap-3">
            <button className="btn btn-danger flex-1" onClick={async () => {
              const r = await api(`/api/admin/registrations/${del.id}`, "DELETE");
              if (r.ok) { toast("تم حذف التسجيل"); setDel(null); load(); } else toast(r.data.error || "فشل الحذف", "err");
            }}>نعم، احذف</button>
            <button className="btn btn-outline" onClick={() => setDel(null)}>إلغاء</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-blue-50/60 p-3">
      <p className="text-xs font-bold text-slate-500">{k}</p>
      <div className="mt-0.5 break-words text-sm font-semibold text-slate-800">{v || "—"}</div>
    </div>
  );
}

function ProfileModal({ r, onClose, can, onStatus }: { r: Reg; onClose: () => void; can: (p: string) => boolean; onStatus: (r: Reg, s: string, n?: boolean) => void }) {
  const toast = useToast();
  async function sendCard() {
    const res = await api<{ sent: number; failed: number; firstError?: string }>("/api/admin/email/send", "POST", {
      template: "confirmation", subject: "بطاقة المشارك – PROGRAMMERS BATTLE (رقم {{registration_number}})",
      body: "<h2>مرحباً {{participant_name}}</h2><p>هذه بطاقتك الرقمية للمشاركة في <b>PROGRAMMERS BATTLE</b>. يرجى إحضارها يوم المسابقة.</p>",
      includeCard: true, audience: { type: "ids", ids: [r.id] },
    });
    if (res.ok && res.data.sent) toast("تم إرسال البطاقة بالبريد");
    else toast(res.data.firstError || res.data.error || "فشل الإرسال (راجع سجل الرسائل)", "err");
  }
  return (
    <Modal title={`ملف المشارك – ${r.regNumber}`} onClose={onClose} wide>
      <div className="mb-4 flex flex-wrap items-center gap-2"><StatusBadge status={r.status} />{r.checkedIn && <span className="rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-bold text-emerald-700">🎟️ حاضر – {fmtDate(r.checkedInAt)} ({r.checkedInBy})</span>}</div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Row k="الاسم بالعربية" v={r.fullNameAr} /><Row k="الاسم باللاتينية" v={<span className="ltr">{r.fullNameLat}</span>} />
        <Row k="تاريخ الميلاد" v={r.birthDate} /><Row k="المستوى" v={r.level} />
        <Row k="الكلية" v={r.faculty} /><Row k="القسم" v={r.department} /><Row k="التخصص" v={r.specialty} />
        <Row k="الهاتف" v={<span className="ltr">{r.phone}</span>} /><Row k="البريد" v={<span className="ltr">{r.email}</span>} />
        <Row k="نوع المشاركة" v={r.mode === "team" ? `فريق «${r.teamName}» (${r.teamSize})` : "فردي"} />
        {r.mode === "team" && <Row k="الأعضاء" v={r.teamMembers.join("، ")} />}
        <Row k="تاريخ التسجيل" v={fmtDate(r.createdAt)} />
        <div className="sm:col-span-2"><Row k="المشروع" v={r.projectName} /></div>
        <div className="sm:col-span-2"><Row k="وصف المشروع" v={r.projectDescription} /></div>
        <div className="sm:col-span-2"><Row k="المشكلة" v={r.problem} /></div>
        <div className="sm:col-span-2"><Row k="التقنيات" v={r.technologies} /></div>
      </div>
      {can("participants.edit") && (
        <div className="mt-5 flex flex-wrap gap-2 border-t pt-4">
          <span className="self-center text-sm font-bold">تغيير الحالة:</span>
          {STATUSES.map((s) => <button key={s.key} disabled={s.key === r.status} className={`btn btn-sm border ${s.color}`} onClick={() => onStatus(r, s.key)}>{s.label}</button>)}
          <button className="btn btn-green btn-sm" onClick={() => onStatus(r, "accepted", true)}>قبول + إشعار بالبريد</button>
          <button className="btn btn-sm bg-rose-600 text-white" onClick={() => onStatus(r, "rejected", true)}>رفض + إشعار بالبريد</button>
        </div>
      )}
      {can("email.send") && <button className="btn btn-primary btn-sm mt-3" onClick={sendCard}>🪪 إرسال بطاقة المشارك بالبريد</button>}
    </Modal>
  );
}

function EditModal({ r, onClose, onSaved }: { r: Reg; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [d, setD] = useState({ ...r, teamMembersText: r.teamMembers.join("\n") });
  const [busy, setBusy] = useState(false);
  const s = (k: string, v: string | number) => setD((p) => ({ ...p, [k]: v }));
  async function save() {
    setBusy(true);
    const body: Record<string, unknown> = {
      fullNameAr: d.fullNameAr, fullNameLat: d.fullNameLat, birthDate: d.birthDate, faculty: d.faculty, department: d.department,
      specialty: d.specialty, level: d.level, phone: d.phone, email: d.email, projectName: d.projectName,
      projectDescription: d.projectDescription, problem: d.problem, technologies: d.technologies, status: d.status,
    };
    if (r.mode === "team") {
      body.teamName = d.teamName ?? "";
      body.teamMembers = d.teamMembersText.split("\n").map((x) => x.trim()).filter(Boolean);
      body.teamSize = (body.teamMembers as string[]).length + 1;
    }
    const res = await api(`/api/admin/registrations/${r.id}`, "PATCH", body);
    setBusy(false);
    if (res.ok) { toast("تم حفظ التعديلات"); onSaved(); } else toast(res.data.error || "فشل الحفظ", "err");
  }
  const T = (label: string, k: keyof typeof d, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <Field label={label}><input className="input" value={String(d[k] ?? "")} onChange={(e) => s(k as string, e.target.value)} {...props} /></Field>
  );
  return (
    <Modal title={`تعديل – ${r.regNumber}`} onClose={onClose} wide>
      <div className="grid gap-3 sm:grid-cols-2">
        {T("الاسم بالعربية", "fullNameAr")}{T("الاسم باللاتينية", "fullNameLat", { dir: "ltr" })}
        {T("تاريخ الميلاد", "birthDate", { type: "date", dir: "ltr" })}
        <Field label="المستوى"><select className="input" value={d.level} onChange={(e) => s("level", e.target.value)}>{[...new Set([d.level, ...LEVELS])].map((l) => <option key={l}>{l}</option>)}</select></Field>
        {T("الكلية", "faculty")}{T("القسم", "department")}{T("التخصص", "specialty")}
        {T("الهاتف", "phone", { dir: "ltr" })}{T("البريد", "email", { dir: "ltr", type: "email" })}
        {r.mode === "team" && T("اسم الفريق", "teamName")}
        <Field label="الحالة"><select className="input" value={d.status} onChange={(e) => s("status", e.target.value)}>{STATUSES.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}</select></Field>
        {r.mode === "team" && <div className="sm:col-span-2"><Field label="أعضاء الفريق (اسم في كل سطر، بدون القائد)"><textarea className="input" rows={3} value={d.teamMembersText} onChange={(e) => s("teamMembersText", e.target.value)} /></Field></div>}
        <div className="sm:col-span-2">{T("اسم المشروع", "projectName")}</div>
        <div className="sm:col-span-2"><Field label="وصف المشروع"><textarea className="input" rows={3} value={d.projectDescription} onChange={(e) => s("projectDescription", e.target.value)} /></Field></div>
        <div className="sm:col-span-2"><Field label="المشكلة"><textarea className="input" rows={2} value={d.problem} onChange={(e) => s("problem", e.target.value)} /></Field></div>
        <div className="sm:col-span-2">{T("التقنيات", "technologies")}</div>
      </div>
      <div className="mt-5 flex gap-3"><button className="btn btn-primary flex-1" disabled={busy} onClick={save}>{busy ? "جارٍ الحفظ..." : "حفظ التعديلات"}</button><button className="btn btn-outline" onClick={onClose}>إلغاء</button></div>
    </Modal>
  );
}
