# المرحلة P1 — `GET /shifts/pos-session`

**التاريخ:** 2026-07-02

---

## 1. الملفات التي تم تعديلها

| الملف | التعديل |
|-------|---------|
| `apps/api/src/modules/shifts/shifts.controller.ts` | إضافة `GET /shifts/pos-session` |
| `apps/api/src/modules/shifts/shifts.service.ts` | دالة `getPosSession()` تجمع كل بيانات فتح POS |
| `apps/api/src/modules/shifts/shifts.module.ts` | استيراد `OrdersModule` |
| `apps/web/src/lib/hooks.ts` | `usePosSession`، `seedPosSessionCaches`، `PosSessionData`، تضييق `enabled` في hooks الفرعية |
| `apps/web/src/pages/pos/use-pos-workspace.ts` | الاعتماد على `usePosSession` بدل طلبات متعددة |
| `apps/web/src/pages/pos/use-pos-catalog.ts` | `skipFetch` عند وجود كتالوج في الجلسة |
| `apps/web/src/pages/pos/pos-page.tsx` | تمرير `catalogFromSession` |
| `apps/web/src/lib/pos-receipt-settings.ts` | تصدير `mergeReceiptSettings` |
| `apps/api/src/modules/shifts/shifts.service.spec.ts` | mock لـ `OrdersService` |
| `apps/api/src/modules/treasury/treasury.service.spec.ts` | mock لـ snapshots (إصلاح اختبارات P0) |
| `apps/api/src/modules/orders/orders.service.spec.ts` | mock لـ `invalidateReadSnapshots` |
| `scripts/phase-p1-benchmark.mjs` | سكربت قياس قبل/بعد |

**لم يُحذف أو يُعدَّل أي endpoint قديم.** `pos-context`، `pos-catalog`، `shift-current`، وغيرها ما زالت تعمل لبقية الشاشات.

---

## 2. لماذا تم تعديلها

### Backend — `getPosSession`
يجمع في **طلب HTTP واحد** ما كانت الواجهة تجلبه بـ 6–8 round trips:

- سياق POS (`getPosContext`: فرع، خزنة، وردية، ملخص خزنة، `posSummary`)
- كتالوج POS (`getPosCatalog`)
- الخزائن (`cashBox.findMany`)
- الطلبات المعلّقة (`listSuspended`)
- إعدادات الإيصال (`receiptSettings`)
- الصفحة الأولى من الطلبات غير المحصّلة (`take: 25`) والمحصّلة (`take: 10`) عند وجود وردية

التنفيذ الداخلي: `getPosContext` ثم `Promise.all` لبقية الأجزاء — نفس منطق الأعمال، بدون تغيير قاعدة البيانات.

### Frontend
- `usePosSession` يستبدل سلسلة `usePosContext` + طلبات متوازية عند فتح الشاشة.
- `seedPosSessionCaches` يملأ React Query حتى لا تُعاد الطلبات الفرعية.
- Hooks الفرعية (`useCashBoxes`، `usePosCatalog`، `useSuspendedOrders`، قوائم الطلبات) تُعطَّل عند توفر البيانات في الجلسة؛ تبقى نشطة للـ pagination والـ invalidation لاحقاً.

---

## 3. مقارنة الأداء قبل وبعد

**بيئة القياس:** API جديد على `:4001`، مستخدم `cashier`، وردية مغلقة، Supabase cloud (2026-07-02).

| المقياس | قبل (طلبات متعددة) | بعد (`pos-session`) | الفرق |
|---------|-------------------|---------------------|-------|
| **عدد Requests** | **6** | **1** | −5 (−83%) |
| **زمن فتح POS (جدار زمني)** | **5621 ms** | **2252 ms** (بارد) / **2274 ms** (دافئ median) | **~−3.4 s (−60%)** |
| **حجم الاستجابة** | 18 262 B (مجموع) | 18 349 B (طلب واحد) | مماثل (نفس البيانات) |
| **زمن Endpoint الجديد** | — | 2252 ms بارد / 2274 ms دافئ | — |

### تفصيل الطلبات القديمة (قبل)

| Endpoint | ms | bytes |
|----------|-----|-------|
| `pos-context` | 3566 | 262 |
| `pos-catalog` | 2057 | 17 219 |
| `cash-boxes` | 839 | 201 |
| `orders-suspended` | 1446 | 2 |
| `receipt-settings` | 1523 | 531 |
| `shift-current` | 1429 | 47 |

مع وردية مفتوحة كان العدد **8** طلبات (يُضاف `orders-uncollected` + `orders-collected` + غالباً `pos-summary`).

### استعلامات قاعدة البيانات داخل `pos-session`

تقدير من مسار التنفيذ (بدون migration):

| الحالة | Queries تقريبية |
|--------|-----------------|
| وردية مغلقة | ~12–16 |
| وردية مفتوحة | ~18–24 |

نفس الاستعلامات كانت تُنفَّذ سابقاً موزّعة على عدة endpoints مع **6–8 round trips شبكة**؛ الربح الرئيسي هو إزالة RTT المتكرر (~400 ms × 5).

---

## 4. عدد Requests قبل وبعد

| سيناريو | قبل P1 | بعد P1 |
|---------|--------|--------|
| فتح POS — وردية مغلقة | 6 HTTP | **1 HTTP** |
| فتح POS — وردية مفتوحة | 8 HTTP | **1 HTTP** |
| بعد تعليق طلب (P0) | 1 HTTP (`orders-suspended`) | 1 HTTP (بدون تغيير) |
| `refreshAll` في POS | 8 عائلات invalidation | 8 عائلات + `pos-session` |

---

## 5. هل ما زالت توجد طلبات يمكن دمجها لاحقاً؟

| الطلب | الحالة | ملاحظة |
|-------|--------|--------|
| `auth/me` | خارج نطاق POS workspace | يُجلب من `auth-context` عالمياً |
| `production-plan` | غير مطلوب عند الفتح | مدمج جزئياً في `pos-catalog` (`dailyPlan`) |
| `pos-expense-stock-items` | عند فتح نافذة المصروف فقط | لا داعي لدمجه في الجلسة |
| صفحات إضافية من الطلبات (`fetchNextPage`) | pagination | يبقى `GET /orders/by-shift` |
| `GET /shifts/pos-context` وغيره | legacy | تبقى لشاشات أخرى و`refresh` الانتقائي |

**الخلاصة:** دمج بيانات **فتح POS** اكتمل. التحسين التالي (خارج P1) هو تقليل **زمن الاستعلامات الداخلية** (snapshots P0، `listShifts` N+1) وليس دمج HTTP إضافي عند الفتح.

---

## 6. التحقق

| الفحص | النتيجة |
|-------|---------|
| `apps/api` build | ✅ |
| `apps/web` lint + build | ✅ |
| `apps/api` tests (14) | ✅ |
| `GET /shifts/pos-session` | ✅ 200 |
| Endpoints القديمة | ✅ لم تُحذف |

**إعادة القياس:** `API_URL=http://localhost:4001/api node scripts/phase-p1-benchmark.mjs`

---

**انتهت المرحلة P1.**
