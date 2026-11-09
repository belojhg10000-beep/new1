import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSession, hasGate } from "@/lib/auth";
import LoginForm from "@/components/admin/LoginForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "دخول الإدارة", robots: { index: false, follow: false } };

export default async function AdminLoginPage() {
  if (await getSession()) redirect("/admin");
  if (!(await hasGate())) redirect("/");
  return <LoginForm />;
}
