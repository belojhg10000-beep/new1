"use client";
import { useEffect, useRef } from "react";

const TOKENS = ["{ }", "</>", "const", "=>", "01", "async", "git", "AI", "[ ]", "fn()", "if", "&&", "npm", "0x1F", "SQL", "def", "#!"];

/** Lightweight canvas "falling code" background. Pauses when hidden / reduced-motion; fewer columns on phones. */
export default function CodeRain({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let w = 0;
    let h = 0;
    let cols: { x: number; y: number; speed: number; t: string; size: number }[] = [];
    let raf = 0;
    let last = 0;

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = r.width;
      h = r.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = w < 640 ? 8 : Math.min(26, Math.floor(w / 60));
      cols = Array.from({ length: count }, (_, i) => ({
        x: (i + 0.5) * (w / count),
        y: Math.random() * h,
        speed: 18 + Math.random() * 30,
        t: TOKENS[Math.floor(Math.random() * TOKENS.length)],
        size: 12 + Math.floor(Math.random() * 6),
      }));
    };

    const frame = (ts: number) => {
      raf = requestAnimationFrame(frame);
      if (document.hidden) return;
      const dt = Math.min((ts - last) / 1000, 0.1);
      if (dt < 1 / 24) return;
      last = ts;
      ctx.clearRect(0, 0, w, h);
      for (const c of cols) {
        c.y += c.speed * dt;
        if (c.y > h + 20) {
          c.y = -20;
          c.t = TOKENS[Math.floor(Math.random() * TOKENS.length)];
        }
        const a = 0.12 + 0.28 * (1 - Math.abs(c.y / h - 0.5) * 2);
        ctx.font = `${c.size}px ui-monospace, Consolas, monospace`;
        ctx.fillStyle = `rgba(110,231,183,${Math.max(0.05, a)})`;
        ctx.fillText(c.t, c.x, c.y);
      }
    };

    resize();
    raf = requestAnimationFrame(frame);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className={`pointer-events-none absolute inset-0 h-full w-full ${className}`} />;
}
