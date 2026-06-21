# Niha

نظام مطعم وبيك احترافي عربي RTL مبني كـ modular monolith مع React و NestJS و PostgreSQL على Supabase.

## Architecture

- `apps/web`: واجهة المستخدم React RTL.
- `apps/api`: Backend API مبني بـ NestJS.
- `apps/desktop`: برنامج Electron للكاشير (طباعة صامتة + Print Bridge مدمج).
- `apps/print-bridge`: خدمة طباعة محلية (تُشغَّل تلقائيًا داخل Desktop).
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

## Niha Desktop (Hybrid)

- **الكاشير:** `npm run dev:desktop` — Electron + Print Bridge + Vite
- **Build:** `npm run build:desktop` — يبني الواجهة مع `VITE_API_URL` للـ Render
- **Installer:** `npm run pack:desktop` — ينتج `dist/desktop/Niha Setup.exe`
- **Unpacked:** `npm run pack:desktop:dir` — `dist/desktop/win-unpacked/Niha.exe`
- **Verify:** `npm run verify:desktop`
- **Release + auto-update:** ضع `GH_TOKEN` مرة واحدة في `.env` ثم `npm run release:desktop`
- **Deploy الكل (ويب + API + Desktop):** `npm run deploy:all` — commit + push + release
- **Vercel** يبقى للإدارة والموبايل؛ Desktop يتصل بنفس API على Render.

### تحديث تلقائي (Desktop)

**أمر واحد لكل شيء:**
```bash
npm run deploy:all
```
يرفع patch version تلقائياً، يعمل `git push` (Vercel + Render)، ثم ينشر Desktop على GitHub.

```bash
npm run deploy:all -- --message "وصف التعديل"
npm run deploy:all -- --no-bump   # بدون رفع رقم الإصدار
```

**يدوي:**
1. ارفع رقم الإصدار في `apps/desktop/package.json` (مثلاً `0.1.3`).
2. أنشئ GitHub token بصلاحية `repo` وضعه **مرة واحدة** في `.env`: `GH_TOKEN=ghp_...`
3. من الجذر: `npm run release:desktop` — يرفع `Niha Setup` + `latest.yml` إلى [GitHub Releases](https://github.com/keylanyhotelaswan-cmyk/niha/releases).
4. البرنامج المثبّت يتحقق تلقائياً كل ~4 ساعات (وبعد 10 ثوانٍ من الفتح) وينزّل التحديث ويطلب إعادة التشغيل.

> **ملاحظة:** ملف `.env` محلي ولا يُرفع على Git. لو البناء جاهز وعايز ترفع بس: `npm run publish:desktop`

**رقم الإصدار:** يظهر في شاشة POS كـ `Niha Desktop v0.1.x` وفي عنوان نافذة البرنامج.

## Current Scope

هذه البداية تضع الهيكل الأساسي والوثائق التنفيذية. المرحلة التالية ستكون بناء طبقات auth, users, treasury, inventory, recipes, purchasing, expenses, setup-costs.
