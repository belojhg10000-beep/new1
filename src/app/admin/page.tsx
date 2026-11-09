import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { mailConfigured } from "@/lib/mail";
import AdminApp from "@/components/admin/AdminApp";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "لوحة الإدارة – PROGRAMMERS BATTLE", robots: { index: false, follow: false } };

export default async function AdminPage() {
  const admin = await getSession();
  if (!admin) redirect("/");
  return <AdminApp admin={admin} mailConfigured={mailConfigured()} />;
}
