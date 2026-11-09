import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { registrations } from "@/db/schema";
import { qrSvg } from "@/lib/card";
import { getSettings } from "@/lib/settings";
import { BRAND } from "@/lib/constants";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "بطاقة المشارك – PROGRAMMERS BATTLE", robots: { index: false, follow: false } };

export default async function CardPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9]{48}$/.test(token)) notFound();
  const [r] = await db.select().from(registrations).where(eq(registrations.qrToken, token));
  if (!r) notFound();
  const s = await getSettings();
  const svg = await qrSvg(token);
  return (
    <main className="bg-hero grid min-h-screen place-items-center p-4">
      <div className="w-full max-w-sm">
        <div className="pop overflow-hidden rounded-[2rem] bg-white shadow-2xl ring-4 ring-white/30">
          <div className="bg-gradient-to-br from-navy via-navy2 to-royal px-6 pb-6 pt-5 text-center text-white">
            <div className="flex items-center justify-between">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={BRAND.logoCollege} alt="كلية العلوم والتكنولوجيا" width={52} height={52} className="h-13 w-13 rounded-xl bg-white p-1" />
              <div className="code-font text-[10px] text-emerald-300">PARTICIPANT CARD</div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={BRAND.logoClub} alt="New Vision Club" width={52} height={52} className="h-13 w-13 rounded-full bg-white p-0.5" />
            </div>
            <h1 className="ltr mt-4 text-2xl font-black tracking-wide">PROGRAMMERS BATTLE</h1>
            <p className="text-sm text-sky-200">{s.competitionName.includes("–") ? s.competitionName.split("–")[1].trim() : "معركة المبرمجين"}</p>
          </div>
          <div className="relative -mt-3 rounded-t-3xl bg-white px-6 pb-6 pt-6 text-center">
            <div className="mx-auto h-48 w-48 rounded-2xl p-2 ring-2 ring-blue-100 [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
            <h2 className="mt-4 text-xl font-black text-navy2">{r.fullNameAr}</h2>
            <p className="ltr text-sm text-slate-500">{r.fullNameLat}</p>
            <p className="code-font mt-3 rounded-xl bg-emerald-50 py-2 text-lg font-black tracking-widest text-emerald-700">{r.regNumber}</p>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-blue-50 p-2"><dt className="text-xs text-slate-500">الفريق</dt><dd className="font-bold text-navy2">{r.mode === "team" ? r.teamName : "مشاركة فردية"}</dd></div>
              <div className="rounded-xl bg-blue-50 p-2"><dt className="text-xs text-slate-500">المشروع</dt><dd className="font-bold text-navy2">{r.projectName}</dd></div>
            </dl>
            <p className="mt-4 text-[11px] text-slate-400">New Vision Club – University Science Club • {BRAND.university}</p>
          </div>
        </div>
        <div className="no-print mt-5 text-center"><PrintButton /></div>
      </div>
    </main>
  );
}
