import Link from "next/link";
import AdminGate from "@/components/AdminGate";
import { BRAND } from "@/lib/constants";

export default function SiteHeader({ home = false }: { home?: boolean }) {
  const h = home ? "" : "/";
  return (
    <header className="absolute inset-x-0 top-0 z-30">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={BRAND.logoCollege} alt="شعار كلية العلوم والتكنولوجيا" width={44} height={44} className="h-11 w-11 rounded-xl bg-white/90 p-1" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={BRAND.logoClub} alt="شعار New Vision Club" width={44} height={44} className="h-11 w-11 rounded-full bg-white/90 p-0.5" />
          <span className="code-font hidden text-sm font-bold text-white sm:block">{BRAND.club}</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-semibold text-white/85 lg:flex">
          <a href={`${h}#goals`} className="hover:text-white">الأهداف</a>
          <a href={`${h}#stages`} className="hover:text-white">المراحل</a>
          <a href={`${h}#conditions`} className="hover:text-white">الشروط</a>
          <a href={`${h}#teams`} className="hover:text-white">الفرق</a>
        </nav>
        <div className="flex items-center gap-2">
          <AdminGate />
          <Link href="/register" className="btn btn-green btn-sm">سجّل الآن</Link>
        </div>
      </div>
    </header>
  );
}
