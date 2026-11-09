# PROGRAMMERS BATTLE – معركة المبرمجين
New Vision Club – University Science Club · كلية العلوم والتكنولوجيا · جامعة محمد خيضر بسكرة

تطبيق ويب واحد (Next.js + PostgreSQL/Drizzle) يضم: التسجيل العام، بوابة الإدارة السرية، لوحة التحكم، البريد، QR وCheck-in.

## المتغيرات (ملف `.env` على الخادم فقط)
| المتغير | الوظيفة |
|---|---|
| `DATABASE_URL` | رابط PostgreSQL |
| `ADMIN_ACCESS_CODE` | **الرمز السري** للنافذة المنبثقة «الإدارة». غيّره ثم أعد تشغيل الخادم. لا يظهر في أي ملف عام. |
| `SESSION_SECRET` | مفتاح توقيع الجلسات (32+ حرفاً عشوائياً). تغييره يُنهي كل الجلسات. |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | حساب ADMIN الأول، يُنشأ تلقائياً عند أول دخول إذا لم يوجد أي مسؤول. غيّر كلمة المرور من لوحة الإدارة بعد أول دخول. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | إعداد خدمة البريد الحقيقية (انظر أدناه). |
| `APP_URL` | عنوان الموقع العام (يُستعمل في روابط البطاقة داخل الرسائل). اتركه فارغاً للاكتشاف التلقائي. |

## تدفق الدخول إلى الإدارة
1. زر «الإدارة» أعلى الموقع ← نافذة الرمز السري ← `POST /api/gate` (تحقق من الخادم، 5 محاولات ثم حظر 15 دقيقة).
2. عند النجاح تُمنح كوكي قصيرة العمر (10 دقائق) تسمح بفتح `/admin/login`.
3. اسم المستخدم + كلمة المرور (bcrypt، حظر عند التخمين المتكرر) ← جلسة JWT في كوكي `HttpOnly + SameSite=Strict + Secure`، تُفحص صلاحياتها من قاعدة البيانات في كل طلب.

## إعداد البريد (SMTP)
مثال Gmail (يتطلب «كلمة مرور التطبيقات» App Password):
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=youraddress@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx
SMTP_FROM="PROGRAMMERS BATTLE <youraddress@gmail.com>"
```
يصلح أيضاً أي مزود (Brevo, Mailgun SMTP, SendGrid SMTP, Resend SMTP...). بعد التعديل أعد تشغيل الخادم، ثم من «البريد ← سجل الرسائل» اضغط «إعادة إرسال كل الفاشلة».

## الأوامر
```
npm install
npx drizzle-kit push      # إنشاء الجداول
npm run build && npm start
```

## الشعارات
استبدل الملفين `public/logos/college.svg` و`public/logos/club.svg` بشعاريكما الأصليين (أو عدّل المسارين في `src/lib/constants.ts` إن كانا PNG).
