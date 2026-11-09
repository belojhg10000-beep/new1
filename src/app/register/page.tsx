import Link from "next/link";
import type { Metadata } from "next";
import CodeRain from "@/components/CodeRain";
import Countdown from "@/components/Countdown";
import RegisterForm from "@/components/RegisterForm";
import SiteHeader from "@/components/SiteHeader";
import { getSettings, publicSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "التسجيل – PROGRAMMERS BATTLE" };

export default async function RegisterPage() {
  const s = publicSettings(await getSettings());
  return (
    <main className="bg-hero relative min-h-screen overflow-hidden pb-16 pt-28">
      <div className="bg-grid absolute inset-0" aria-hidden />
      <CodeRain className="opacity-60" />
      <SiteHeader />
      <div className="relative z-10 mx-auto max-w-3xl px-4">
        <div className="mb-8 text-center text-white">
          <p className="code-font text-sm text-emerald-300">{"// register();"}</p>
          <h1 className="ltr text-shine mt-1 text-4xl font-black sm:text-5xl">PROGRAMMERS BATTLE</h1>
          <p className="mt-2 text-sky-100">استمارة التسجيل في معركة المبرمجين</p>
        </div>
        {s.state === "open" ? (
          <RegisterForm maxTeamSize={s.maxTeamSize} departments={s.departments} closesAt={s.registrationEnd} />
        ) : (
          <div className="glass-light rounded-3xl p-8 text-center">
            <div className="text-5xl">{s.state === "not_started" ? "⏳" : "🔒"}</div>
            <h2 className="mt-3 text-2xl font-black text-navy2">
              {s.state === "not_started" ? "التسجيل لم يبدأ بعد" : s.state === "paused" ? "التسجيل متوقف مؤقتاً" : "انتهى التسجيل"}
            </h2>
            <p className="mt-2 text-slate-600">
              {s.state === "not_started" && "سيُفتح باب التسجيل تلقائياً في الموعد المحدد."}
              {s.state === "closed" && "تم إغلاق استمارة التسجيل بعد انتهاء المدة المحددة. شكراً لاهتمامكم!"}
              {s.state === "paused" && "أوقفت الإدارة التسجيل مؤقتاً. يرجى المتابعة لاحقاً."}
            </p>
            <div className="mt-6 flex justify-center">
              <Countdown
                tone="light"
                target={s.state === "not_started" ? s.registrationStart : s.eventDate}
                label={s.state === "not_started" ? "يُفتح التسجيل بعد" : "تنطلق المعركة بعد"}
                refreshOnZero={s.state === "not_started"}
              />
            </div>
            <Link href="/" className="btn btn-outline mt-6">العودة للرئيسية</Link>
          </div>
        )}
      </div>
    </main>
  );
}
