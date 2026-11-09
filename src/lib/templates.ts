// Shared between server and client (editor). No secrets here.
export const VARIABLES = [
  { key: "participant_name", label: "اسم المشارك" },
  { key: "registration_number", label: "رقم التسجيل" },
  { key: "team_name", label: "اسم الفريق" },
  { key: "project_name", label: "اسم المشروع" },
] as const;

export const TEMPLATE_KEYS = ["confirmation", "accepted", "rejected", "instructions", "reminder", "custom"] as const;
export type TemplateKey = (typeof TEMPLATE_KEYS)[number];

export const TEMPLATES: Record<TemplateKey, { label: string; subject: string; body: string; includeCard: boolean }> = {
  confirmation: {
    label: "تأكيد التسجيل",
    subject: "تأكيد تسجيلك في PROGRAMMERS BATTLE – رقم {{registration_number}}",
    includeCard: true,
    body: `<h2>مرحباً {{participant_name}} 👋</h2><p>يسعدنا إبلاغك بأنه تم <b>استلام تسجيلك</b> بنجاح في مسابقة <b>PROGRAMMERS BATTLE – معركة المبرمجين</b>.</p><p><b>رقم التسجيل:</b> {{registration_number}}<br><b>الفريق:</b> {{team_name}}<br><b>المشروع:</b> {{project_name}}</p><p>ستتم مراجعة طلبك وإبلاغك بالنتيجة عبر البريد الإلكتروني. احتفظ ببطاقة المشارك أدناه، فهي مطلوبة عند الدخول يوم المسابقة.</p>`,
  },
  accepted: {
    label: "قبول المشاركة",
    subject: "🎉 تم قبول مشاركتك في PROGRAMMERS BATTLE",
    includeCard: true,
    body: `<h2>مبروك {{participant_name}}! 🎉</h2><p>يسعدنا إخبارك بأنه تم <b>قبول مشاركتك</b> (رقم التسجيل: {{registration_number}}) عن مشروع «<b>{{project_name}}</b>» ضمن الفريق: {{team_name}}.</p><p>تجد بطاقتك الرقمية أدناه، يرجى إحضارها (مطبوعة أو على الهاتف) يوم المسابقة لتأكيد حضورك عبر رمز QR.</p><p>نتمنى لك التوفيق في معركة المبرمجين! 💻</p>`,
  },
  rejected: {
    label: "رفض المشاركة",
    subject: "بخصوص طلب مشاركتك في PROGRAMMERS BATTLE",
    includeCard: false,
    body: `<h2>عزيزي {{participant_name}}،</h2><p>نشكرك على اهتمامك بالمشاركة في <b>PROGRAMMERS BATTLE</b> (رقم التسجيل: {{registration_number}}).</p><p>نأسف لإبلاغك بأنه لم يتم قبول طلبك هذه المرة نظراً لمحدودية المقاعد ومعايير الانتقاء. نشجعك على مواصلة التطوير والمشاركة في فعالياتنا القادمة.</p><p>مع خالص التقدير، <b>فريق New Vision Club</b></p>`,
  },
  instructions: {
    label: "تعليمات المسابقة",
    subject: "تعليمات المسابقة – PROGRAMMERS BATTLE",
    includeCard: false,
    body: `<h2>تعليمات المسابقة</h2><p>مرحباً {{participant_name}}،</p><p>إليك أهم التعليمات للمشاركة في المسابقة (الفريق: {{team_name}}):</p><ul><li>احضر قبل الموعد بـ 30 دقيقة على الأقل.</li><li>أحضر بطاقة المشارك (QR) ورقم تسجيلك: <b>{{registration_number}}</b>.</li><li>أحضر حاسوبك المحمول وشاحنه.</li><li>جهّز عرضاً مختصراً لمشروعك «{{project_name}}».</li><li>التزم بقواعد النزاهة والعمل الأصيل.</li></ul><p>بالتوفيق!</p>`,
  },
  reminder: {
    label: "تذكير بموعد المسابقة",
    subject: "⏰ تذكير: اقترب موعد PROGRAMMERS BATTLE",
    includeCard: true,
    body: `<h2>تذكير بموعد المسابقة ⏰</h2><p>مرحباً {{participant_name}}،</p><p>نذكرك بأن موعد <b>PROGRAMMERS BATTLE</b> يقترب. لا تنس إحضار بطاقتك الرقمية (رقم التسجيل: {{registration_number}}) وتجهيز مشروعك «{{project_name}}».</p><p>نراك في الحلبة! 🚀</p>`,
  },
  custom: {
    label: "رسالة خاصة بالمشارك",
    subject: "رسالة من إدارة PROGRAMMERS BATTLE",
    includeCard: false,
    body: `<p>مرحباً {{participant_name}}،</p><p>اكتب رسالتك هنا...</p>`,
  },
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** Replace {{vars}}; values are HTML-escaped (prevents injection through participant data). */
export function applyVars(html: string, vars: Record<string, string>, escapeValues = true) {
  return html.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (m, k: string) =>
    k in vars ? (escapeValues ? esc(vars[k]) : vars[k]) : m,
  );
}
