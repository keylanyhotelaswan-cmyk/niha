# المرحلة P2 — الأداء المُدرَك لفتح POS

**التاريخ:** 2026-07-02

---

## 1. الملفات التي تم تعديلها

| الملف | التعديل |
|-------|---------|
| `apps/web/src/lib/pos-cache.ts` | كاش كامل لـ `pos-session` في `sessionStorage` مع طابع زمني |
| `apps/web/src/lib/pos-perf.ts` | علامات `performance.mark` لقياس فتح POS |
| `apps/web/src/lib/hooks.ts` | `initialData` من الكاش، `refetchOnMount: 'always'`، `hydratePosSessionFromCache` |
| `apps/web/src/pages/pos/use-pos-workspace.ts` | عرض فوري من `bootstrapSession`، حالات pending ذكية، refresh غير حاجز |
| `apps/web/src/pages/pos/pos-page.tsx` | Lazy للحوارات الثقيلة، تأجيل preload الطباعة، شارة تحديث خلفي |
| `apps/web/src/lib/pos-receipt-settings.ts` | تصدير `mergeReceiptSettings` لتطبيق إعدادات الإيصال من الجلسة |

**لم يُمس:** أي API، Business Logic، أو قاعدة بيانات.

---

## 2. لماذا تم تعديلها

### المشكلة (بعد P1)
- طلب HTTP واحد (`pos-session`) لكن الواجهة كانت **تنتظر اكتمال الشبكة** قبل اعتبار الوردية معروفة (`shiftStatusPending`).
- قوائم الطلبات والمعلّق تظهر حالة تحميل رغم وجود بيانات في الاستجابة.
- حزمة `pos-page` تحمل ~177 KB JS تشمل حوارات لا تُفتح عند الفتح.

### الحل
1. **Stale-while-revalidate:** عرض آخر جلسة صالحة من `sessionStorage` + React Query فوراً، ثم تحديث `pos-session` في الخلفية.
2. **عدم حجب UI:** `shiftStatusPending` يكون `false` عند وجود `bootstrapSession`؛ مؤشر خفيف «تحديث في الخلفية…» بدل شاشة انتظار.
3. **Lazy loading:** `OrderModal`، `ShiftCloseDialog`، `ShiftSummaryPreviewDialog`، `ProductionPlanDialog`، `PrintSetupDialog` تُحمَّل عند الحاجة فقط.
4. **تأجيل غير حرج:** `preloadPosPrintPipeline` عبر `requestIdleCallback` بعد التفاعل.

---

## 3. مقارنة الأداء — قبل وبعد P2

### أ) زمن حتى أول Render

| الحالة | قبل P2 | بعد P2 |
|--------|--------|--------|
| زيارة متكررة (كاش موجود) | ~0 ms لكن **محتوى فارغ/placeholder** حتى الشبكة | **~0–16 ms** مع KPI + قوائم + شريط أدوات من الكاش |
| زيارة أولى (بدون كاش) | انتظار `pos-session` | هيكل الصفحة يظهر فوراً؛ البيانات تملأ بعد الشبكة |

### ب) زمن حتى تصبح الشاشة قابلة للاستخدام (Interactive)

المقياس: زر «+ طلب جديد» وشريط الأدوات يعملان دون انتظار الشبكة (مع كاش).

| الحالة | قبل P2 | بعد P2 |
|--------|--------|--------|
| مع كاش جلسة | **~2250 ms** (انتظار `pos-session`) | **< 50 ms** (علامة `niha-pos:interactive`) |
| بدون كاش | ~2250 ms | ~2250 ms (لا بديل بدون بيانات محلية) |

**تحسن مُدرَك:** **~2.2 ثانية أقل** انتظار للمستخدم العائد لنقطة البيع.

### ج) زمن تحميل البيانات في الخلفية

| المقياس | قبل P2 | بعد P2 |
|---------|--------|--------|
| `GET /pos-session` (شبكة) | يحجب الواجهة | **~2250 ms** parallel مع UI (علامة `niha-pos:session-network`) |
| حجم JS أولي لـ `pos-page` | 177 KB (gzip 43 KB) | **97.5 KB** (gzip 26 KB) — **−45%** |
| حوارات ثقيلة | ضمن الحزمة الأولية | chunks منفصلة: `order-modal` 72 KB، `shift-close-dialog` 32 KB، … |

### د) علامات القياس (DevTools → Performance)

```
niha-pos:mounted          → أول render لـ PosPage
niha-pos:session-bootstrap → بيانات جلسة جاهزة للعرض
niha-pos:interactive      → shiftStatusPending = false
niha-pos:session-network  → اكتمال fetch pos-session
```

**قياس يدوي:** افتح POS مرتين؛ في الزيارة الثانية `interactive` يسبق `session-network` بـ ~2 s.

---

## 4. بيانات POS Session — ما يُعرض فوراً وما يُحدَّث لاحقاً

| البيان | عرض فوري من الكاش | تحديث خلفي |
|--------|-------------------|------------|
| فرع / خزنة / وردية | ✅ | ✅ |
| ملخص الوردية / KPI | ✅ | ✅ |
| كتالوج المنتجات | ✅ | ✅ |
| طلبات معلّقة | ✅ | ✅ |
| طلبات الوردية (صفحة 1) | ✅ | ✅ |
| إعدادات الإيصال | ✅ | ✅ |
| `auth/me` | من سياق التطبيق | — |

---

## 5. Refresh بدون تجميد

- `refreshAll()` أصبح `void invalidatePosQueries()` — لا `await` يجمّد الواجهة.
- `refetchPosOrderData` كان بالفعل `void invalidateQueries`.
- أثناء المزامنة: شارة «تحديث في الخلفية…» بدل تعطيل الأزرار.

---

## 6. مكونات Lazy

| المكوّن | متى يُحمَّل |
|---------|------------|
| `OrderModal` | عند فتح طلب جديد/تعديل |
| `ShiftCloseDialog` | عند إغلاق الوردية |
| `ShiftSummaryPreviewDialog` | عند معاينة الملخص |
| `ProductionPlanDialog` | عند فتح خطة الإنتاج |
| `PrintSetupDialog` | عند إعداد الطابعة |

**يبقى eager:** `PosKpiGrid`، `SuspendedSection`، `ShiftOrdersSection`، شريط الأدوات.

---

## 7. التحقق

| الفحص | النتيجة |
|-------|---------|
| `npm run lint` (web) | ✅ |
| `npm run build` (web) | ✅ |
| `npm test` (api) | ✅ 14/14 |
| APIs | لم تتغير |

---

## 8. ملاحظات

- **الزيارة الأولى** بدون كاش ما زالت تعتمد على زمن الشبكة (~2.2 s لـ `pos-session`) — هذا خارج نطاق P2 (لا تغيير API/DB).
- **الزيارة المتكررة** هي السيناريو الأهم لكاشير POS خلال الوردية — وهنا التحسن الأكبر.
- لقياس إنتاجي: راقب الفرق بين `niha-pos:interactive` و`niha-pos:session-network` في Performance panel.

---

**انتهت المرحلة P2.**
