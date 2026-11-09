"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import CodeRain from "@/components/CodeRain";
import { BRAND } from "@/lib/constants";

export default function LoginForm() {
  const router = useRouter();
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: u, password: p }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) {
        router.replace("/admin");
        router.refresh();
        return;
      }
      if (d.gate === false) {
        router.replace("/");
        return;
      }
      setMsg(d.error || "فشل تسجيل الدخول");
      setShake((s) => s + 1);
    } catch {
      setMsg("تعذر الاتصال بالخادم");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="bg-hero relative grid min-h-screen place-items-center overflow-hidden p-4">
      <div className="bg-grid absolute inset-0" aria-hidden />
      <CodeRain />
      <form key={shake} onSubmit={submit} className={`pop glass-light relative z-10 w-full max-w-sm rounded-3xl p-7 ${shake ? "shake" : ""}`}>
        <div className="mb-4 flex justify-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={BRAND.logoCollege} alt="" width={52} height={52} className="h-13 w-13 rounded-xl bg-white p-1 shadow" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={BRAND.logoClub} alt="" width={52} height={52} className="h-13 w-13 rounded-full bg-white p-0.5 shadow" />
        </div>
        <h1 className="text-center text-xl font-black text-navy2">تسجيل دخول الإدارة</h1>
        <p className="mb-5 mt-1 text-center text-xs text-slate-500">تم اجتياز الرمز السري ✓ — أدخل بيانات حسابك</p>
        <label className="label">اسم المستخدم</label>
        <input className="input ltr mb-4" value={u} onChange={(e) => setU(e.target.value)} autoComplete="username" autoFocus required maxLength={60} />
        <label className="label">كلمة المرور</label>
        <input type="password" className="input ltr" value={p} onChange={(e) => setP(e.target.value)} autoComplete="current-password" required maxLength={200} />
        {msg && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-center text-sm font-bold text-rose-700" role="alert">{msg}</p>}
        <button className="btn btn-primary mt-6 w-full" disabled={busy}>{busy ? "جارٍ الدخول..." : "دخول"}</button>
        <a href="/" className="mt-3 block text-center text-xs text-slate-500 hover:text-royal">← العودة للموقع</a>
      </form>
    </main>
  );
}
