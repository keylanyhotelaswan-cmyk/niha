# تنفيذ المرحلة P0 — تحسين الأداء دون تغيير السلوك

**التاريخ:** 2026-07-02  
**النطاق:** تحسينات قراءة فقط + إزالة طلبات/استعلامات مكررة + تضييق invalidation في POS.

---

## 1. الملفات التي تم تعديلها

| الملف | التعديل |
|-------|---------|
| `apps/api/src/modules/treasury/treasury.service.ts` | قراءة/كتابة `BranchBalanceSnapshot` و`ShiftSummarySnapshot` مع fallback؛ إبطال snapshots عند الكتابة |
| `apps/api/src/modules/shifts/shifts.service.ts` | إزالة استدعاء `getShiftSummary` المكرر داخل `getPosContext` / `getPosShiftSummary` |
| `apps/api/src/modules/orders/orders.service.ts` | إبطال snapshot الوردية عند إنشاء طلب غير محصّل |
| `apps/web/src/lib/hooks.ts` | `useBranches` مع بذرة من `pos-context`؛ دالة `invalidatePosSuspendedOrders` |
| `apps/web/src/pages/pos/use-pos-workspace.ts` | تخطي `shift-current` و`branches` عند توفر بيانات `pos-context` |
| `apps/web/src/pages/pos/use-pos-order-session.ts` | استبدال `invalidatePosQueries` بـ `invalidatePosSuspendedOrders` عند التعليق |
| `scripts/phase-p0-benchmark.mjs` | سكربت قياس بعد التنفيذ (جديد) |

---

## 2. لماذا تم تعديل كل ملف

### `treasury.service.ts`
- **المشكلة (من التدقيق):** `getBranchTreasuryBalance` و`getShiftSummaryLight` يعيدان حساب البيانات من `TreasuryTransaction` في كل قراءة.
- **الحل:** إذا وُجد snapshot صالح (`v: 1` في JSON) يُعاد منه؛ وإلا يُنفَّذ المنطق القديم كاملاً ثم يُحدَّث الـ snapshot في الخلفية.
- **الأمان:** عند أي كتابة خزنة (`recordTransaction`، تحويل داخلي، اعتماد/رفض) يُحذف الـ snapshot المتأثر عبر `invalidateReadSnapshots`.

### `shifts.service.ts`
- **المشكلة:** `getPosContext` كان يستدعي `getPosShiftSummary` الذي يستدعي `getShiftSummary` مرة ثانية رغم أن الوردية محمّلة مسبقاً.
- **الحل:** تمرير `preloadedShift` و`treasurySummary` لتجنب استعلام الوردية والملخص المكرر. شكل الـ response لم يتغير.

### `orders.service.ts`
- **المشكلة:** طلب `UNCOLLECTED` يغيّر تجميعات الوردية دون حركة خزنة فورية.
- **الحل:** إبطال snapshot الوردية بعد الإنشاء حتى لا تُقرأ بيانات قديمة.

### `hooks.ts` + `use-pos-workspace.ts`
- **المشكلة:** عند فتح POS كانت تُجلب `branches` و`shift-current` رغم أن `pos-context` يحتوي الفرع والوردية والملخص.
- **الحل:** `useBranches(posContext.branch)` لا يطلب الشبكة عند وجود فرع في السياق؛ `skipShiftCurrent` يوقف `shift-current` عندما يكون السياق كافياً (وردية مفتوحة + ملخص، أو وردية مغلقة مؤكدة من السياق).

### `use-pos-order-session.ts`
- **المشكلة:** `invalidatePosQueries` كان يعيد جلب 7 عائلات React Query + يمسح كتالوج IndexedDB بعد كل تعليق.
- **الحل:** `invalidatePosSuspendedOrders` يحدّث قائمة المعلّق فقط — بيانات الطلبات/الملخص/الكتالوج تبقى حديثة لأن التعليق لا يغيّرها.

---

## 3. ماذا تحسّن

| المجال | التحسين |
|--------|---------|
| قراءة الخزنة | مسار snapshot مع fallback كامل للمنطق القديم |
| `getPosContext()` | استعلام واحد لملخص الوردية بدل اثنين عند وجود وردية مفتوحة |
| فتح POS (شبكة) | −2 طلب HTTP في الحالة الشائعة (وردية مفتوحة): `branches` + `shift-current` |
| فتح POS (وردية مغلقة) | −1 طلب: `shift-current` غير ضروري عندما `pos-context` يؤكد الإغلاق |
| تعليق طلب | invalidation من 7 عائلات إلى 1 (`orders-suspended`) |
| الكتالوج | لم يعد يُمسح من IndexedDB عند التعليق |

---

## 4. مقارنة الأداء — قبل وبعد

### مصدر «قبل»
من `runtime-performance-audit.md` (قياسات على نفس البيئة — Supabase cloud، مستخدم `cashier`).

### مصدر «بعد»
`node scripts/phase-p0-benchmark.mjs` بتاريخ 2026-07-02 بعد البناء والتشغيل (`API :4000`, `Web :5173`).  
**ملاحظة:** الوردية كانت **مغلقة** في جلسة القياس؛ فوائد snapshot الوردية و`getShiftSummary` لم تُقاس مباشرة (تظهر عند وردية مفتوحة وقراءة ثانية).

| المقياس | قبل | بعد | ملاحظة |
|---------|-----|-----|--------|
| `getPosContext()` بارد | 3474 ms | 3672 ms | نفس نطاق RTT؛ لا تحسن متوقع بارد بدون وردية |
| `getPosContext()` دافئ | 1706 ms | 1732 ms | مماثل؛ التحسين الداخلي يظهر مع وردية مفتوحة |
| طلبات فتح POS (وردية مفتوحة) | 8 متوازية | **6** متوازية | إزالة `branches` + `shift-current` (+ `pos-summary` إن وُجد في السياق) |
| طلبات فتح POS (وردية مغلقة) | 8 | **5** | إزالة `branches` + `shift-current` |
| جدار زمني POS (سياق بارد + دفعة متوازية) | ~1.7–3.5 s | **5.76 s** بارد / **~3.2 s** دافئ* | *القياس يجمع سياق بارد ثم دفعة؛ الدفعة المحسّنة ~1.9 s لـ 4 طلبات |
| `getShiftSummary()` | ثقيل (5–6 queries) | snapshot على القراءة الثانية | يتطلب وردية مفتوحة + snapshot مملوء |
| `getBranchTreasuryBalance()` | مسح كامل 818 صف | snapshot على القراءة الثانية | يتطلب صلاحية `treasury.manage` للقياس المباشر |
| React Query invalidations عند التعليق | **7** عائلات + مسح كتالوج | **1** عائلة | تقليل ~86% من إعادة الجلب |

### تفصيل طلبات POS بعد التنفيذ (وردية مغلقة)

| الطلب | قبل (ms) | بعد — محسّن (ms) |
|-------|----------|------------------|
| `pos-context` | 3672 | 1732 (دافئ) |
| `branches` | 866 | **محذوف** |
| `shift-current` | 1439 | **محذوف** |
| `cash-boxes` | 897 | 1933 |
| `pos-catalog` | 2091 | 1883 |
| `orders-suspended` | 1441 | 1458 |
| `receipt-settings` | 1461 | 1459 |

---

## 5. التحقق من الاستقرار

| الفحص | النتيجة |
|-------|---------|
| `apps/api` — `npm run build` | نجح |
| `apps/web` — `npm run lint` | نجح |
| `apps/web` — `npm run build` | نجح |
| API `GET /api/health` | 200 |
| Web `http://localhost:5173` | 200 |
| تسجيل دخول `cashier` + POS APIs | نجح |

لم يُحذف أي endpoint ولم تُضف migrations ولم يتغير شكل أي response عام.

---

## 6. مشاكل تبقى لمرحلة P1 (خارج P0)

1. **`listShifts` N+1** — كل وردية تستدعي `getShiftSummary` كاملاً (مذكور في التدقيق).
2. **RTT Supabase** — معظم زمن POS ما زال شبكة (~400 ms/استعلام).
3. **`getShiftSummaryLight` بارد** — أول قراءة ما زالت ثقيلة حتى مع snapshot (الملء يحدث بعد الحساب).
4. **RPT-004** — Seq Scan على `Order` في تقارير top products.
5. **فهرس `CashierExpense.shiftId`** — غير موجود (من تدقيق execution plans).
6. **قياس snapshot الوردية** — يحتاج وردية مفتوحة + قراءة ثانية؛ يُوصى بإعادة القياس في بيئة تشغيل حقيقية.

---

## 7. كيفية إعادة القياس

```bash
# تشغيل API + Web
npm run dev

# قياس P0
node scripts/phase-p0-benchmark.mjs
```

---

**انتهت المرحلة P0.** لم يُبدأ أي عمل من P1.
