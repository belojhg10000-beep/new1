"use client";
import { useCallback, useEffect, useState } from "react";
import { PERMISSIONS } from "@/lib/constants";
import { api, Field, fmtDate, Modal, Spinner, useToast, type Me } from "./ui";

type U = { id: number; username: string; displayName: string; role: "ADMIN" | "SUPERVISOR"; permissions: string[]; active: boolean; lastLoginAt: string | null };

export default function UsersTab({ me }: { me: Me }) {
  return (
    <div className="space-y-6">
      <MyAccount />
      {me.role === "ADMIN" ? <Users me={me} /> : <p className="card-pro p-5 text-sm text-slate-600">إدارة المشرفين متاحة للمسؤول (ADMIN) فقط. صلاحياتك: {me.permissions.length ? me.permissions.map((p) => PERMISSIONS.find((x) => x.key === p)?.label).join("، ") : "لا شيء"}.</p>}
    </div>
  );
}

function MyAccount() {
  const toast = useToast();
  const [cur, setCur] = useState("");
  const [nw, setNw] = useState("");
  const [busy, setBusy] = useState(false);
  async function change() {
    setBusy(true);
    const r = await api("/api/admin/me", "PATCH", { currentPassword: cur, newPassword: nw });
    setBusy(false);
    if (r.ok) { toast("تم تغيير كلمة المرور. سيُطلب منك الدخول من جديد."); setTimeout(() => (window.location.href = "/"), 1500); }
    else toast(r.data.error || "فشل", "err");
  }
  return (
    <div className="card-pro max-w-xl p-5">
      <h3 className="mb-3 font-extrabold text-navy2">🔑 تغيير كلمة مروري</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <input type="password" className="input ltr" placeholder="كلمة المرور الحالية" value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" />
        <input type="password" className="input ltr" placeholder="الجديدة (10+ أحرف وأرقام)" value={nw} onChange={(e) => setNw(e.target.value)} autoComplete="new-password" />
      </div>
      <button className="btn btn-primary btn-sm mt-3" disabled={busy || !cur || !nw} onClick={change}>تغيير</button>
    </div>
  );
}

function Users({ me }: { me: Me }) {
  const toast = useToast();
  const [rows, setRows] = useState<U[] | null>(null);
  const [modal, setModal] = useState<U | "new" | null>(null);
  const load = useCallback(async () => {
    const r = await api<{ rows: U[] }>("/api/admin/users");
    if (r.ok) setRows(r.data.rows);
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between"><h3 className="font-extrabold text-navy2">👮 حسابات المشرفين والمسؤولين</h3><button className="btn btn-primary btn-sm" onClick={() => setModal("new")}>+ إضافة حساب</button></div>
      {rows === null ? <Spinner /> : (
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map((u) => (
            <div key={u.id} className={`card-pro p-4 ${u.active ? "" : "opacity-60"}`}>
              <div className="flex items-start justify-between">
                <div><p className="font-black text-navy2">{u.displayName}</p><p className="code-font text-xs text-slate-500">@{u.username}</p></div>
                <span className={`code-font rounded-full px-2.5 py-0.5 text-xs font-bold ${u.role === "ADMIN" ? "bg-violet-100 text-violet-700" : "bg-sky-100 text-sky-700"}`}>{u.role}</span>
              </div>
              <p className="mt-2 text-xs text-slate-500">آخر دخول: {fmtDate(u.lastLoginAt)} {!u.active && "• معطّل"}</p>
              {u.role === "SUPERVISOR" && <p className="mt-2 text-xs leading-6 text-slate-600">{u.permissions.map((p) => PERMISSIONS.find((x) => x.key === p)?.label).join(" • ") || "بلا صلاحيات"}</p>}
              <div className="mt-3 flex gap-2">
                <button className="btn btn-outline btn-sm" onClick={() => setModal(u)}>تعديل</button>
                {u.id !== me.id && <button className="btn btn-sm bg-rose-50 text-rose-600" onClick={async () => { if (!confirm(`حذف الحساب ${u.username}؟`)) return; const r = await api(`/api/admin/users/${u.id}`, "DELETE"); r.ok ? (toast("تم الحذف"), load()) : toast(r.data.error || "فشل", "err"); }}>حذف</button>}
              </div>
            </div>
          ))}
        </div>
      )}
      {modal && <UserModal u={modal === "new" ? null : modal} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
    </div>
  );
}

function UserModal({ u, onClose, onSaved }: { u: U | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [d, setD] = useState({ username: u?.username ?? "", displayName: u?.displayName ?? "", password: "", role: u?.role ?? "SUPERVISOR", permissions: u?.permissions ?? [] as string[], active: u?.active ?? true });
  const [busy, setBusy] = useState(false);
  const toggle = (k: string) => setD((p) => ({ ...p, permissions: p.permissions.includes(k) ? p.permissions.filter((x) => x !== k) : [...p.permissions, k] }));
  async function save() {
    setBusy(true);
    const r = u
      ? await api(`/api/admin/users/${u.id}`, "PATCH", { displayName: d.displayName, role: d.role, permissions: d.permissions, active: d.active, ...(d.password ? { password: d.password } : {}) })
      : await api("/api/admin/users", "POST", d);
    setBusy(false);
    r.ok ? (toast("✓ تم الحفظ"), onSaved()) : toast(r.data.error || "فشل", "err");
  }
  return (
    <Modal title={u ? `تعديل ${u.username}` : "حساب جديد"} onClose={onClose}>
      <div className="space-y-3">
        {!u && <Field label="اسم المستخدم"><input className="input ltr" value={d.username} onChange={(e) => setD({ ...d, username: e.target.value })} /></Field>}
        <Field label="الاسم المعروض"><input className="input" value={d.displayName} onChange={(e) => setD({ ...d, displayName: e.target.value })} /></Field>
        <Field label={u ? "كلمة مرور جديدة (اختياري)" : "كلمة المرور (10+ أحرف وأرقام)"}><input type="password" className="input ltr" value={d.password} onChange={(e) => setD({ ...d, password: e.target.value })} autoComplete="new-password" /></Field>
        <Field label="الدور"><select className="input" value={d.role} onChange={(e) => setD({ ...d, role: e.target.value as "ADMIN" | "SUPERVISOR" })}><option value="SUPERVISOR">SUPERVISOR – مشرف بصلاحيات محددة</option><option value="ADMIN">ADMIN – كل الصلاحيات</option></select></Field>
        {d.role === "SUPERVISOR" && (
          <div className="rounded-2xl bg-blue-50/60 p-3">
            <p className="label">الصلاحيات الممنوحة</p>
            <div className="grid gap-1.5 sm:grid-cols-2">{PERMISSIONS.map((p) => <label key={p.key} className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-blue-700" checked={d.permissions.includes(p.key)} onChange={() => toggle(p.key)} />{p.label}</label>)}</div>
          </div>
        )}
        {u && <label className="flex cursor-pointer items-center gap-2 text-sm font-bold"><input type="checkbox" className="h-4 w-4" checked={d.active} onChange={(e) => setD({ ...d, active: e.target.checked })} /> الحساب نشط</label>}
        <button className="btn btn-primary w-full" disabled={busy} onClick={save}>{busy ? "..." : "حفظ"}</button>
      </div>
    </Modal>
  );
}
