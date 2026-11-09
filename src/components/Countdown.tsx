"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const pad = (n: number) => String(n).padStart(2, "0");

export default function Countdown({
  target,
  label,
  refreshOnZero = false,
  tone = "dark",
}: {
  target: string;
  label: string;
  refreshOnZero?: boolean;
  tone?: "dark" | "light";
}) {
  const router = useRouter();
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    const t = new Date(target).getTime();
    let fired = false;
    const tick = () => {
      const d = t - Date.now();
      setLeft(Math.max(0, d));
      if (d <= 0 && refreshOnZero && !fired) {
        fired = true;
        router.refresh();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target, refreshOnZero, router]);

  const s = left == null ? null : Math.floor(left / 1000);
  const parts = [
    { l: "يوم", v: s == null ? "--" : String(Math.floor(s / 86400)) },
    { l: "ساعة", v: s == null ? "--" : pad(Math.floor((s % 86400) / 3600)) },
    { l: "دقيقة", v: s == null ? "--" : pad(Math.floor((s % 3600) / 60)) },
    { l: "ثانية", v: s == null ? "--" : pad(s % 60) },
  ];
  const dark = tone === "dark";
  return (
    <div>
      <p className={`mb-2 text-sm font-semibold ${dark ? "text-sky-200" : "text-royal"}`}>{label}</p>
      <div className="flex gap-2 sm:gap-3" dir="ltr" role="timer" aria-live="off">
        {parts.map((p) => (
          <div
            key={p.l}
            className={`flex w-16 flex-col items-center rounded-2xl py-2 sm:w-20 sm:py-3 ${dark ? "glass" : "bg-white shadow-lg ring-1 ring-blue-100"}`}
          >
            <span className={`code-font text-2xl font-bold tabular-nums sm:text-3xl ${dark ? "text-white" : "text-navy2"}`}>{p.v}</span>
            <span className={`text-[11px] ${dark ? "text-sky-200" : "text-slate-500"}`}>{p.l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
