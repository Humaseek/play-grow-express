# Play-Grow (Express + Supabase)

هذا مشروع بسيط: **واجهة واحدة للأطفال** + **API على Express** (إضافة/تعديل/حذف/عرض).

## تشغيل سريع (Local)
1) تأكد أن Supabase Local شغال عندك.
2) افتح هذا المشروع في Terminal:

```bash
npm install
```

3) انسخ ملف env:

```bash
cp .env.example .env
```

4) عدّل `.env`:
- `SUPABASE_URL` (عادة Local: `http://127.0.0.1:54321`)
- `SUPABASE_SERVICE_ROLE_KEY` (خذه من Supabase Studio → Settings → API)

5) شغّل السيرفر:

```bash
npm run dev
```

افتح:
- http://localhost:3000

## كيف الأمان شغال؟
- الواجهة تسجل دخول عبر Supabase Auth.
- الواجهة ترسل `access_token` لـ Express في Header:
  `Authorization: Bearer <token>`
- Express يتأكد من المستخدم + يتأكد أنه `admin` من جدول `profiles`.

## صفحات المالية (Enterprise)

تمت إضافة صفحتين:
- **الدفعات (B)**: عرض/بحث/تصفية + إضافة دفعة + ربط اختياري بحصة.
- **المصاريف (A)**: تسجيل مصروفات التشغيل + بحث/تصفية + تعديل/حذف.

⚠️ ملاحظة: هذه الصفحات تعتمد على ترحيل Supabase جديد داخل:
`supabase/migrations/20260204090000_finance_enterprise.sql`

إذا لم تكن قاعدة البيانات محدثة، ستظهر داخل الواجهة رسالة توضيح (وضع التوافق / أو جدول غير موجود).
