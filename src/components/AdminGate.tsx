"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/** Discreet "الإدارة" button. The secret code is verified only by the server (/api/gate). */
export default function AdminGate() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || busy) return;
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch("/api/gate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) {
        setCode("");
        router.push("/admin/login");
        return;
      }
      setMsg(d.error || "تعذر التحقق من الرمز");
      setShake((s) => s + 1);
    } catch {
      setMsg("تعذر الاتصال بالخادم");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        onClick={() => {
          setOpen(true);
          setMsg("");
        }}
        className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 backdrop-blur transition hover:bg-white/20 hover:text-white"
        aria-haspopup="dialog"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
        الإدارة
      </button>
      {open && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-navy/70 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)} role="dialog" aria-modal="true" aria-label="الدخول إلى الإدارة">
          <form key={shake} onSubmit={submit} className={`pop w-full max-w-sm rounded-3xl bg-white p-7 shadow-2xl ${shake ? "shake" : ""}`}>
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-royal to-sky2 text-white shadow-lg">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
            </div>
            <h2 className="text-center text-xl font-extrabold text-navy2">منطقة الإدارة</h2>
            <p className="mt-1 text-center text-sm text-slate-500">أدخل الرمز السري الخاص بالإدارة للمتابعة</p>
            <input ref={inputRef} type="password" autoComplete="off" value={code} onChange={(e) => setCode(e.target.value)} className={`input ltr mt-5 text-center tracking-widest ${msg ? "err" : ""}`} placeholder="••••••••" maxLength={200} />
            {msg && <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-center text-sm font-semibold text-rose-700" role="alert">{msg}</p>}
            <div className="mt-5 flex gap-3">
              <button type="submit" disabled={busy || !code.trim()} className="btn btn-primary flex-1">{busy ? "جارٍ التحقق..." : "تحقق"}</button>
              <button type="button" onClick={() => setOpen(false)} className="btn btn-outline">إلغاء</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
