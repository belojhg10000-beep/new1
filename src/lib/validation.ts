import { z } from "zod";
import { LEVELS, STATUS_KEYS } from "@/lib/constants";

const arabicName = z
  .string()
  .trim()
  .min(3, "الاسم بالعربية مطلوب (3 أحرف على الأقل)")
  .max(80, "الاسم طويل جداً")
  .regex(/^[\u0600-\u06FF\s'’.-]+$/, "يرجى كتابة الاسم بالحروف العربية فقط");

const latinName = z
  .string()
  .trim()
  .min(3, "الاسم باللاتينية مطلوب (3 أحرف على الأقل)")
  .max(80, "الاسم طويل جداً")
  .regex(/^[A-Za-zÀ-ÿ\s'’.-]+$/, "يرجى كتابة الاسم بالأحرف اللاتينية فقط");

const text = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min, `${label} مطلوب (${min} أحرف على الأقل)`)
    .max(max, `${label} طويل جداً (الحد الأقصى ${max})`);

export function normalizePhone(p: string) {
  let d = p.replace(/[^\d+]/g, "");
  if (d.startsWith("+213")) d = "0" + d.slice(4);
  else if (d.startsWith("00213")) d = "0" + d.slice(5);
  else if (d.startsWith("213") && d.length >= 12) d = "0" + d.slice(3);
  return d.replace(/\D/g, "");
}

export function makeRegistrationSchema(maxTeamSize: number) {
  return z
    .object({
      fullNameAr: arabicName,
      fullNameLat: latinName,
      faculty: text("الكلية", 3, 120),
      department: text("القسم", 2, 120),
      specialty: text("التخصص", 2, 120),
      level: z.enum(LEVELS, { message: "المستوى الدراسي مطلوب" }),
      phone: z
        .string()
        .trim()
        .regex(/^\+?[0-9\s-]{9,16}$/, "رقم الهاتف غير صالح")
        .refine((v) => normalizePhone(v).length >= 9, "رقم الهاتف غير صالح"),
      email: z.string().trim().toLowerCase().email("البريد الإلكتروني غير صالح").max(160),
      mode: z.enum(["individual", "team"], { message: "اختر نوع المشاركة" }),
      teamName: z.string().trim().max(80).optional().default(""),
      teamSize: z.coerce.number().int().min(1).max(50).optional().default(1),
      teamMembers: z.array(z.string().trim().max(80)).max(50).optional().default([]),
      projectName: text("اسم المشروع", 3, 120),
      projectDescription: text("وصف المشروع", 30, 2000),
      problem: text("المشكلة التي يحلها المشروع", 20, 1500),
      technologies: text("التقنيات المستخدمة", 2, 300),
      confirmData: z.literal(true, { message: "يجب الموافقة على صحة البيانات" }),
      confirmPrivacy: z.literal(true, { message: "يجب الموافقة على سياسة الخصوصية" }),
    })
    .superRefine((v, ctx) => {
      if (v.mode === "team") {
        if (v.teamName.length < 3)
          ctx.addIssue({ code: "custom", path: ["teamName"], message: "اسم المجموعة مطلوب (3 أحرف على الأقل)" });
        if (v.teamSize < 2 || v.teamSize > maxTeamSize)
          ctx.addIssue({
            code: "custom",
            path: ["teamSize"],
            message: `عدد أعضاء الفريق يجب أن يكون بين 2 و${maxTeamSize}`,
          });
        const members = v.teamMembers.map((m) => m.trim()).filter(Boolean);
        if (members.length !== v.teamSize - 1)
          ctx.addIssue({
            code: "custom",
            path: ["teamMembers"],
            message: `أدخل أسماء بقية الأعضاء (${v.teamSize - 1}) كاملة`,
          });
        if (new Set(members.map((m) => m.toLowerCase())).size !== members.length)
          ctx.addIssue({ code: "custom", path: ["teamMembers"], message: "يوجد اسم مكرر بين أعضاء الفريق" });
      }
    });
}
export type RegistrationInput = z.infer<ReturnType<typeof makeRegistrationSchema>>;

export const statusSchema = z.enum(STATUS_KEYS);

export const adminUpdateSchema = z.object({
  fullNameAr: arabicName.optional(),
  fullNameLat: latinName.optional(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  faculty: text("الكلية", 3, 120).optional(),
  department: text("القسم", 2, 120).optional(),
  specialty: text("التخصص", 2, 120).optional(),
  level: z.string().trim().min(2).max(60).optional(),
  phone: z.string().trim().regex(/^\+?[0-9\s-]{9,16}$/, "رقم الهاتف غير صالح").optional(),
  email: z.string().trim().toLowerCase().email().max(160).optional(),
  teamName: z.string().trim().max(80).optional(),
  teamSize: z.coerce.number().int().min(1).max(50).optional(),
  teamMembers: z.array(z.string().trim().max(80)).max(50).optional(),
  projectName: text("اسم المشروع", 3, 120).optional(),
  projectDescription: text("وصف المشروع", 10, 2000).optional(),
  problem: text("المشكلة", 5, 1500).optional(),
  technologies: text("التقنيات", 2, 300).optional(),
  status: statusSchema.optional(),
});

export const settingsSchema = z.object({
  competitionName: text("اسم المسابقة", 3, 150),
  description: text("الوصف", 10, 2000),
  eventDate: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "موعد المسابقة غير صالح"),
  registrationStart: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "بداية التسجيل غير صالحة"),
  registrationEnd: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "نهاية التسجيل غير صالحة"),
  conditions: text("شروط المشاركة", 5, 5000),
  maxTeamSize: z.coerce.number().int().min(2).max(20),
  registrationOpen: z.boolean(),
  departments: z
    .array(
      z.object({
        name: text("اسم القسم", 2, 100),
        specialties: z.array(z.string().trim().min(1).max(100)).max(40),
      }),
    )
    .min(1)
    .max(40),
});

export const adminUserSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .max(40)
    .regex(/^[A-Za-z0-9_.-]+$/, "اسم المستخدم: أحرف لاتينية وأرقام فقط"),
  displayName: text("الاسم", 2, 80),
  password: z
    .string()
    .min(10, "كلمة المرور 10 أحرف على الأقل")
    .max(100)
    .regex(/[A-Za-z]/, "يجب أن تحتوي على حرف")
    .regex(/\d/, "يجب أن تحتوي على رقم"),
  role: z.enum(["ADMIN", "SUPERVISOR"]),
  permissions: z.array(z.string()).max(30).default([]),
});
