import { fail, guard } from "@/lib/auth";
import { listRegistrations } from "@/lib/regquery";
import { statusLabel } from "@/lib/constants";

export const dynamic = "force-dynamic";

// Neutralise spreadsheet formula injection and quote properly.
const cell = (v: unknown) => {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
};

export async function GET(req: Request) {
  const g = await guard(req, "participants.export");
  if (g.error) return g.error;
  try {
    const rows = await listRegistrations(new URL(req.url).searchParams, 20000);
    const head = ["رقم التسجيل", "الاسم بالعربية", "الاسم باللاتينية", "تاريخ الميلاد", "الكلية", "القسم", "التخصص", "المستوى", "الهاتف", "البريد", "نوع المشاركة", "اسم الفريق", "عدد الأعضاء", "أعضاء الفريق", "المشروع", "وصف المشروع", "المشكلة", "التقنيات", "الحالة", "الحضور", "تاريخ التسجيل"];
    const lines = [head.map(cell).join(",")];
    for (const r of rows) {
      lines.push(
        [r.regNumber, r.fullNameAr, r.fullNameLat, r.birthDate, r.faculty, r.department, r.specialty, r.level, r.phone, r.email, r.mode === "team" ? "فريق" : "فردي", r.teamName, r.teamSize, r.teamMembers.join(" | "), r.projectName, r.projectDescription, r.problem, r.technologies, statusLabel(r.status), r.checkedIn ? "حاضر" : "لا", r.createdAt.toISOString()]
          .map(cell)
          .join(","),
      );
    }
    return new Response("\uFEFF" + lines.join("\r\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="programmers-battle-${new Date().toISOString().slice(0, 10)}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error(e);
    return fail("خطأ في الخادم", 500);
  }
}
