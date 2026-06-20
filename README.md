# Niha

نظام مطعم وبيك احترافي عربي RTL مبني كـ modular monolith مع React و NestJS و PostgreSQL على Supabase.

## Architecture

- `apps/web`: واجهة المستخدم React RTL.
- `apps/api`: Backend API مبني بـ NestJS.
- `packages/contracts`: عقود وأنواع مشتركة بين الواجهة والخلفية.
- `docs`: وثائق المعمارية وقاعدة البيانات وخطة التنفيذ.

## Runtime Model

- قاعدة البيانات: PostgreSQL على Supabase.
- المصادقة والصلاحيات: داخل الـ backend.
- الخزنة والمخزون: ledger-based.
- مصروفات التأسيس منفصلة منطقيًا وبيانيًا عن المصروفات التشغيلية.

## First Run

1. انسخ `.env.example` إلى `.env`.
2. املأ القيم السرية الخاصة بـ Supabase.
3. ثبّت الحزم: `npm install`.
4. شغّل المشروع محليًا من الجذر: `npm run dev`.
5. الواجهة ستكون على `http://localhost:5173` والـ API على `http://localhost:4000/api/health`.
6. إذا احتجت مراقبة ملفات الـ API أثناء التطوير استخدم `npm run dev:watch --workspace @niha/api` بشكل منفصل.

## Local Multi-Device Access

- تم ضبط Vite على `0.0.0.0` بحيث يمكن فتح الواجهة من الهاتف على نفس الشبكة المحلية.
- لمعرفة عنوان جهازك داخل الشبكة استخدم `ipconfig` ثم افتح `http://YOUR_LOCAL_IP:5173` من الهاتف.
- أثناء التطوير، الـ API يسمح بطلبات CORS من عناوين الشبكة المحلية. في الإنتاج سنقفلها على النطاقات الفعلية فقط.

## Current Scope

هذه البداية تضع الهيكل الأساسي والوثائق التنفيذية. المرحلة التالية ستكون بناء طبقات auth, users, treasury, inventory, recipes, purchasing, expenses, setup-costs.
