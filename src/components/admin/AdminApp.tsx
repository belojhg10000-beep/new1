"use client";
import { useState } from "react";
import { BRAND } from "@/lib/constants";
import { api, Modal, ToastProvider, type Me } from "./ui";
import OverviewTab from "./OverviewTab";
import RegistrationsTab from "./RegistrationsTab";
import EmailTab from "./EmailTab";
import CheckinTab from "./CheckinTab";
import SettingsTab from "./SettingsTab";
import UsersTab from "./UsersTab";

const TABS = [
  { k: "overview", l: "نظرة عامة", i: "📊", p: "" },
  { k: "participants", l: "المشاركون", i: "👥", p: "participants.view" },
  { k: "projects", l: "المشاريع", i: "💡", p: "projects.view" },
  { k: "teams", l: "الفرق", i: "🛡️", p: "teams.view" },
  { k: "email", l: "البريد", i: "✉️", p: "email.send" },
  { k: "checkin", l: "تسجيل الحضور", i: "📷", p: "checkin.manage" },
  { k: "settings", l: "إعدادات المسابقة", i: "⚙️", p: "settings.manage" },
  { k: "users", l: "المشرفون والحساب", i: "🔐", p: "" },
] as const;

export default function AdminApp({ admin, mailConfigured }: { admin: Me; mailConfigured: boolean }) {
  const can = (p: string) => !p || admin.role === "ADMIN" || admin.permissions.includes(p);
  const tabs = TABS.filter((t) => can(t.p));
  const [tab, setTab] = useState<string>("overview");
  const [menu, setMenu] = useState(false);

  async function logout() {
    await api("/api/admin/logout", "POST", {});
    window.location.href = "/";
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#eef4ff]">
        <header className="sticky top-0 z-40 bg-gradient-to-l from-navy via-navy2 to-royal text-white shadow-lg">
          <div className="flex items-center gap-3 px-4 py-3">
            <button className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 lg:hidden" onClick={() => setMenu((m) => !m)} aria-label="القائمة">☰</button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={BRAND.logoClub} alt="" width={38} height={38} className="h-9 w-9 rounded-full bg-white p-0.5" />
            <div className="min-w-0 flex-1">
              <p className="ltr truncate text-sm font-black tracking-wide sm:text-base">PROGRAMMERS BATTLE</p>
              <p className="text-[11px] text-sky-200">لوحة الإدارة</p>
            </div>
            <div className="hidden text-end text-xs sm:block">
              <p className="font-bold">{admin.displayName}</p>
              <p className="code-font text-emerald-300">{admin.role}</p>
            </div>
            <a href="/" className="btn btn-ghost btn-sm hidden sm:inline-flex">الموقع</a>
            <button onClick={logout} className="btn btn-sm bg-rose-500 text-white">خروج</button>
          </div>
        </header>
        <div className="flex">
          <aside className={`${menu ? "block" : "hidden"} fixed inset-x-0 top-[61px] z-30 border-b bg-white p-3 shadow-xl lg:sticky lg:top-[61px] lg:block lg:h-[calc(100vh-61px)] lg:w-60 lg:shrink-0 lg:border-b-0 lg:border-e lg:shadow-none`}>
            <nav className="grid gap-1">
              {tabs.map((t) => (
                <button key={t.k} onClick={() => { setTab(t.k); setMenu(false); }} className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-start text-sm font-bold transition ${tab === t.k ? "bg-gradient-to-l from-royal to-sky2 text-white shadow-md" : "text-slate-600 hover:bg-blue-50"}`}>
                  <span>{t.i}</span>{t.l}
                </button>
              ))}
            </nav>
          </aside>
          <main className="min-w-0 flex-1 p-3 sm:p-6">
            <h1 className="mb-4 text-xl font-black text-navy2">{tabs.find((t) => t.k === tab)?.i} {tabs.find((t) => t.k === tab)?.l}</h1>
            {tab === "overview" && <OverviewTab mailConfigured={mailConfigured} />}
            {tab === "participants" && <RegistrationsTab view="participants" can={can} />}
            {tab === "projects" && <RegistrationsTab view="projects" can={can} />}
            {tab === "teams" && <RegistrationsTab view="teams" can={can} />}
            {tab === "email" && <EmailTab mailConfigured={mailConfigured} />}
            {tab === "checkin" && <CheckinTab />}
            {tab === "settings" && <SettingsTab />}
            {tab === "users" && <UsersTab me={admin} />}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}

export { Modal };
