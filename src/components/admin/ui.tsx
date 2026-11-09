"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { statusLabel, STATUSES } from "@/lib/constants";

export type Reg = {
  id: number;
  regNumber: string;
  fullNameAr: string;
  fullNameLat: string;
  birthDate?: string;
  faculty: string;
  department: string;
  specialty: string;
  level: string;
  phone?: string;
  email?: string;
  mode: "individual" | "team";
  teamName: string | null;
  teamSize: number;
  teamMembers: string[];
  projectName: string;
  projectDescription: string;
  problem: string;
  technologies: string;
  status: string;
  checkedIn: boolean;
  checkedInAt: string | null;
  checkedInBy: string | null;
  createdAt: string;
};

export type Me = { id: number; username: string; displayName: string; role: "ADMIN" | "SUPERVISOR"; permissions: string[] };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function api<T = any>(url: string, method = "GET", body?: unknown): Promise<{ ok: boolean; status: number; data: T & { error?: string } }> {
  try {
    const r = await fetch(url, {
      method,
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    const data = await r.json().catch(() => ({}));
    if (r.status === 401) {
      window.location.href = "/";
    }
    return { ok: r.ok && data.ok !== false, status: r.status, data };
  } catch {
    return { ok: false, status: 0, data: { error: "تعذر الاتصال بالخادم" } as T & { error?: string } };
  }
}

const ToastCtx = createContext<(m: string, kind?: "ok" | "err") => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [t, setT] = useState<{ m: string; kind: "ok" | "err"; k: number } | null>(null);
  const show = useCallback((m: string, kind: "ok" | "err" = "ok") => setT({ m, kind, k: Date.now() }), []);
  useEffect(() => {
    if (!t) return;
    const id = setTimeout(() => setT(null), 4500);
    return () => clearTimeout(id);
  }, [t]);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {t && (
        <div key={t.k} className={`pop fixed bottom-5 start-1/2 z-[200] max-w-[92vw] -translate-x-1/2 rounded-2xl px-5 py-3 text-sm font-bold text-white shadow-2xl rtl:translate-x-1/2 ${t.kind === "ok" ? "bg-emerald-600" : "bg-rose-600"}`} role="status">
          {t.m}
        </div>
      )}
    </ToastCtx.Provider>
  );
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[150] flex items-start justify-center overflow-y-auto bg-navy/60 p-3 backdrop-blur-sm sm:items-center" onMouseDown={(e) => e.target === e.currentTarget && onClose()} role="dialog" aria-modal="true">
      <div className={`pop my-4 w-full ${wide ? "max-w-3xl" : "max-w-lg"} rounded-3xl bg-white p-5 shadow-2xl sm:p-7`}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-lg font-extrabold text-navy2">{title}</h3>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200" aria-label="إغلاق">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const s = STATUSES.find((x) => x.key === status);
  return <span className={`inline-block whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-bold ${s?.color ?? "bg-slate-100"}`}>{statusLabel(status)}</span>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

export function Spinner() {
  return <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-100 border-t-royal" aria-label="جارٍ التحميل" />;
}

export const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("ar-DZ", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Algiers" }) : "—";

export function useDebounced<T>(v: T, ms = 350) {
  const [d, setD] = useState(v);
  useEffect(() => {
    const id = setTimeout(() => setD(v), ms);
    return () => clearTimeout(id);
  }, [v, ms]);
  return d;
}
