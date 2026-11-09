// Shared (client + server) constants. Contains NO secrets.
export const BRAND = {
  logoCollege: "/logos/college.png",
  logoClub: "/logos/club.png",
  club: "New Vision Club",
  clubAr: "نادي نيو فيجن العلمي",
  university: "جامعة محمد خيضر – بسكرة",
  college: "كلية العلوم والتكنولوجيا",
  collegeShort: "FST",
};

export const STATUSES = [
  { key: "new", label: "جديد", color: "bg-sky-100 text-sky-800 border-sky-200" },
  { key: "review", label: "قيد المراجعة", color: "bg-amber-100 text-amber-800 border-amber-200" },
  { key: "accepted", label: "مقبول", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  { key: "rejected", label: "مرفوض", color: "bg-rose-100 text-rose-800 border-rose-200" },
  { key: "waitlist", label: "قائمة الانتظار", color: "bg-violet-100 text-violet-800 border-violet-200" },
] as const;
export type StatusKey = (typeof STATUSES)[number]["key"];
export const STATUS_KEYS = STATUSES.map((s) => s.key) as [StatusKey, ...StatusKey[]];
export const statusLabel = (k: string) => STATUSES.find((s) => s.key === k)?.label ?? k;

export const LEVELS = [
  "ليسانس 1",
  "ليسانس 2",
  "ليسانس 3",
  "ماستر 1",
  "ماستر 2",
  "مهندس / سنة متقدمة",
  "دكتوراه",
] as const;

export const PERMISSIONS = [
  { key: "participants.view", label: "عرض المشاركين" },
  { key: "participants.edit", label: "تعديل المشاركين وتغيير الحالات" },
  { key: "participants.delete", label: "حذف التسجيلات" },
  { key: "participants.export", label: "تصدير البيانات" },
  { key: "projects.view", label: "عرض المشاريع" },
  { key: "teams.view", label: "عرض الفرق" },
  { key: "email.send", label: "إرسال البريد وعرض السجل" },
  { key: "checkin.manage", label: "تسجيل الحضور (Check-in)" },
  { key: "settings.manage", label: "إعدادات المسابقة" },
] as const;
export type Permission = (typeof PERMISSIONS)[number]["key"];
export const ALL_PERMISSIONS = PERMISSIONS.map((p) => p.key) as Permission[];

export const DEFAULT_COMPETITION = {
  name: "PROGRAMMERS BATTLE – معركة المبرمجين",
  description:
    "مسابقة برمجية جامعية كبرى ينظمها نادي New Vision Club بكلية العلوم والتكنولوجيا – جامعة محمد خيضر بسكرة، تجمع أذكى المبرمجين والمبتكرين لتحويل الأفكار إلى مشاريع حقيقية تحل مشكلات واقعية.",
  conditions: [
    "أن يكون المشارك طالباً مسجلاً بجامعة محمد خيضر – بسكرة للسنة الجامعية الحالية.",
    "المشاركة فردية أو ضمن فريق لا يتجاوز العدد الأقصى المحدد.",
    "تسجيل واحد فقط لكل مشارك أو فريق، ويُرفض أي تسجيل مكرر.",
    "أن يكون المشروع المقترح عملاً أصيلاً من إنجاز المشاركين.",
    "تقديم بيانات صحيحة وكاملة، وأي بيانات خاطئة تُلغي المشاركة.",
    "الالتزام بالحضور في الموعد المحدد وإحضار بطاقة المشارك (QR).",
  ].join("\n"),
  departments: [
    { name: "الإعلام الآلي", specialties: ["أنظمة المعلومات", "الذكاء الاصطناعي", "الشبكات والأمن", "هندسة البرمجيات"] },
    { name: "الهندسة الكهربائية", specialties: ["آليات", "إلكترونيك", "اتصالات", "كهروتقني", "طاقات متجددة"] },
    { name: "الهندسة الميكانيكية", specialties: ["ميكانيك طاقوي", "صناعة ميكانيكية", "ميكاترونيك"] },
    { name: "الهندسة المدنية والري", specialties: ["مدني", "ري", "أشغال عمومية"] },
    { name: "هندسة الطرائق", specialties: ["هندسة كيميائية", "هندسة بيئة"] },
    { name: "تخصص آخر", specialties: [] },
  ],
};
