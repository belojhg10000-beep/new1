"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, fmtDate, StatusBadge, useToast } from "./ui";

type P = { id: number; regNumber: string; name: string; nameLat: string; mode: string; teamName: string | null; teamSize: number; projectName: string; department: string; status: string; statusLabel: string; checkedIn: boolean; checkedInAt: string | null; checkedInBy: string | null };

export default function CheckinTab() {
  const toast = useToast();
  const [p, setP] = useState<P | null>(null);
  const [code, setCode] = useState("");
  const [manual, setManual] = useState("");
  const [scanning, setScanning] = useState(false);
  const [err, setErr] = useState("");
  const [canForce, setCanForce] = useState(false);
  const [busy, setBusy] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scanner = useRef<any>(null);
  const lock = useRef(false);

  const stop = useCallback(async () => {
    try {
      if (scanner.current?.isScanning) await scanner.current.stop();
      scanner.current?.clear();
    } catch {}
    scanner.current = null;
    setScanning(false);
  }, []);
  useEffect(() => () => { stop(); }, [stop]);

  const lookup = useCallback(async (c: string) => {
    setErr("");
    setCanForce(false);
    const r = await api<{ participant: P }>("/api/admin/checkin", "POST", { code: c });
    if (r.ok) { setP(r.data.participant); setCode(c); } else { setP(null); setErr(r.data.error || "رمز غير معروف"); }
  }, []);

  async function start() {
    setErr("");
    setP(null);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      setScanning(true);
      await new Promise((r) => setTimeout(r, 50));
      const s = new Html5Qrcode("qr-reader");
      scanner.current = s;
      lock.current = false;
      await s.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 240, height: 240 } }, async (text: string) => {
        if (lock.current) return;
        lock.current = true;
        await stop();
        lookup(text);
      }, () => {});
    } catch {
      setScanning(false);
      setErr("تعذر تشغيل الكاميرا. تأكد من منح الإذن (يتطلب HTTPS) أو استخدم الإدخال اليدوي.");
    }
  }

  async function confirmIn(force = false) {
    if (!p) return;
    setBusy(true);
    const r = await api<{ participant: P; alreadyCheckedIn?: boolean; canForce?: boolean }>("/api/admin/checkin", "POST", { code, confirm: true, force });
    setBusy(false);
    if (r.ok) { setP(r.data.participant); toast("✓ تم تسجيل الحضور"); setCanForce(false); }
    else {
      setErr(r.data.error || "فشل");
      if (r.data.participant) setP(r.data.participant);
      setCanForce(!!r.data.canForce);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="card-pro p-5">
        {scanning ? (
          <>
            <div id="qr-reader" className="overflow-hidden rounded-2xl" />
            <button className="btn btn-outline mt-3 w-full" onClick={stop}>إيقاف الكاميرا</button>
          </>
        ) : (
          <button className="btn btn-primary w-full py-4 text-lg" onClick={start}>📷 مسح رمز QR بالكاميرا</button>
        )}
        <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (manual.trim()) lookup(manual.trim()); }}>
          <input className="input ltr" placeholder="أو أدخل رقم التسجيل: PB-2026-XXXXXX" value={manual} onChange={(e) => setManual(e.target.value)} />
          <button className="btn btn-outline">بحث</button>
        </form>
      </div>
      {err && <div className="shake rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-700" role="alert">{err}</div>}
      {p && (
        <div className="pop card-pro overflow-hidden">
          <div className={`p-4 text-center text-white ${p.checkedIn ? "bg-gradient-to-l from-emerald-600 to-teal-500" : "bg-gradient-to-l from-royal to-sky2"}`}>
            <p className="text-sm">{p.checkedIn ? "✓ حاضر بالفعل" : "بيانات المشارك"}</p>
            <h2 className="text-2xl font-black">{p.name}</h2>
            <p className="ltr text-sm opacity-90">{p.nameLat}</p>
          </div>
          <div className="space-y-2 p-5 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">رقم التسجيل</span><b className="code-font">{p.regNumber}</b></div>
            <div className="flex justify-between"><span className="text-slate-500">الفريق</span><b>{p.mode === "team" ? `${p.teamName} (${p.teamSize})` : "فردي"}</b></div>
            <div className="flex justify-between"><span className="text-slate-500">المشروع</span><b>{p.projectName}</b></div>
            <div className="flex justify-between"><span className="text-slate-500">القسم</span><b>{p.department}</b></div>
            <div className="flex justify-between"><span className="text-slate-500">الحالة</span><StatusBadge status={p.status} /></div>
            {p.checkedIn && <p className="rounded-xl bg-emerald-50 p-3 text-center font-bold text-emerald-700">سُجّل الحضور: {fmtDate(p.checkedInAt)} — بواسطة {p.checkedInBy}</p>}
            {!p.checkedIn && (
              <div className="space-y-2 pt-3">
                <button className="btn btn-green w-full py-3 text-lg" disabled={busy} onClick={() => confirmIn(false)}>{busy ? "..." : "✅ تأكيد الحضور"}</button>
                {canForce && <button className="btn btn-outline w-full" onClick={() => confirmIn(true)}>تأكيد الحضور رغم الحالة (مسؤول)</button>}
              </div>
            )}
            <button className="btn btn-outline w-full" onClick={() => { setP(null); setErr(""); start(); }}>مسح التالي</button>
          </div>
        </div>
      )}
    </div>
  );
}
