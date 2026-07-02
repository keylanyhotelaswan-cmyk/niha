# PostgreSQL Execution Plan Audit — Niha v1

> **للقراءة الأسهل:** افتح `database-execution-plan-audit.html` في المتصفح إن وُجد.

**تاريخ القياس:** 2026-07-02T14:12:20.015Z  
**مصدر البيانات:** `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` عبر Prisma `$queryRawUnsafe` من `apps/api`  
**قاعدة البيانات:** PostgreSQL via Prisma (Supabase remote)  
**القيد:** لم يُعدَّل التطبيق — قياس فقط.

---

## 1. معرفات العينة المستخدمة في القياس

- branchId: `a33633ba-aad8-41c9-80cf-9cdf91baa575`
- shiftId: `4b3bd7d3-0027-438e-9341-d40277dcebb9`
- organizationId: `28334772-b6a8-476b-8d71-1f3a2519e227`
- dateKey: `2026-07-02`

## 2. أحجام الجداول عند القياس (COUNT فعلي)

| الجدول / المقياس | الصفوف |
|------------------|--------|
| TreasuryTransaction (branch + APPROVED) | 158 |
| TreasuryTransaction (shiftId sample) | 0 |
| Order (branch) | 334 |
| Shift (اليوم في النطاق) | 1 |

## 3. إحصائيات PostgreSQL (pg_stat_user_tables) — مقاس

| table_name | estimated_live_rows | seq_scan | seq_tup_read | idx_scan | idx_tup_fetch |
|------------|---------------------|----------|--------------|----------|---------------|
| CashierExpense | 14 | 4583 | 22332 | 1 | 4 |
| Order | 334 | 3959 | 422446 | 23302 | 119323 |
| OrderItem | 813 | 4699 | 1126188 | 44707 | 112267 |
| PaymentMethod | 4 | 0 | 0 | 8171 | 15505 |
| Product | 56 | 4899 | 238713 | 55832 | 56543 |
| ProductCategory | 11 | 0 | 0 | 2167 | 21879 |
| Shift | 48 | 3300 | 75029 | 12534 | 22595 |
| StockItem | 1 | 110 | 100 | 27 | 23 |
| TreasuryTransaction | 818 | 4323 | 216052 | 8416 | 101833 |

**ملاحظة قياس:** `Execution Time` في EXPLAIN هو زمن تنفيذ PostgreSQL على الخادم. `clientWallMs` يشمل زمن الشبكة (Supabase بعيد) وغالباً ~400ms إضافية لكل استعلام.

---

## 4. ملخص تنفيذي للخطط (مرتب حسب Execution Time على الخادم)

| ID | Execution Time (ms) | Planning Time (ms) | Client Wall (ms) | Actual Rows | Seq Scan | Index Used |
|----|---------------------|--------------------|------------------|-------------|----------|------------|
| RPT-004-operations-top-products | 4.807 | 0.453 | 443 | 10 | true | OrderItem_orderId_idx |
| RPT-003-operations-kpi | 0.367 | 0.169 | 462 | 1 | true | Seq Scan |
| TRS-001-branch-treasury-balance | 0.141 | 0.119 | 422 | 158 | false | TreasuryTransaction_branchId_approvalStatus_idx |
| RPT-005-treasury-report-balance | 0.14 | 0.132 | 422 | 158 | false | TreasuryTransaction_branchId_approvalStatus_idx |
| CAT-002-products | 0.128 | 0.112 | 409 | 56 | true | Seq Scan |
| RPT-006-treasury-transactions-list | 0.105 | 0.118 | 433 | 100 | false | TreasuryTransaction_branchId_occurredAt_idx |
| PLAN-001-orderitem-groupby-sold | 0.098 | 0.362 | 449 | 1 | false | Order_branchId_status_closedAt_idx |
| CAT-001-product-categories | 0.079 | 0.079 | 449 | 12 | false | ProductCategory_branchId_name_key |
| CAT-003-payment-methods | 0.076 | 0.09 | 418 | 3 | false | PaymentMethod_branchId_code_key |
| SHF-002-batch-shift-transactions | 0.069 | 0.285 | 441 | 0 | false | Shift_branchId_openedAt_idx |
| RPT-001-dashboard-orders-today | 0.067 | 0.163 | 428 | 1 | false | Order_branchId_status_closedAt_idx |
| TRS-002c-closed-orders-aggregate | 0.062 | 0.178 | 422 | 1 | false | Order_shiftId_status_collectionStatus_closedAt_idx |
| TRS-002d-uncollected-aggregate | 0.058 | 0.162 | 434 | 1 | false | Order_shiftId_status_collectionStatus_closedAt_idx |
| TRS-002f-shift-find-unique | 0.057 | 0.124 | 411 | 1 | false | Shift_pkey |
| RPT-002-dashboard-open-shift-treasury-entries | 0.057 | 0.168 | 469 | 0 | false | Shift_one_open_per_cash_box |
| POS-CTX-002-open-shift | 0.053 | 0.118 | 414 | 1 | false | Shift_one_open_per_cash_box |
| TRS-002a-shift-all-transactions | 0.049 | 0.149 | 415 | 0 | false | TreasuryTransaction_shiftId_idx |
| TRS-002e-uncollected-orders-list | 0.049 | 0.17 | 410 | 1 | false | Order_shiftId_status_closedAt_idx |
| POS-CTX-001-branch-by-org | 0.044 | 0.092 | 421 | 1 | true | Seq Scan |
| ORD-001-by-shift-uncollected-open | 0.044 | 0.176 | 421 | 1 | false | Order_shiftId_status_closedAt_idx |
| ORD-002-shift-lookup | 0.043 | 0.078 | 444 | 1 | false | Shift_pkey |
| TRS-002b-shift-expenses | 0.042 | 0.1 | 410 | 0 | true | Seq Scan |
| SHF-001-list-shifts | 0.042 | 0.114 | 419 | 1 | false | Shift_branchId_openedAt_idx |
| RPT-008-inventory-all-stock | 0.041 | 0.066 | 414 | 1 | true | Seq Scan |
| PLAN-002-daily-plan | 0.038 | 0.084 | 421 | 0 | false | ProductDailyPlan_branchId_dateKey_idx |
| POS-CTX-003-cashbox-fallback | 0.037 | 0.087 | 408 | 1 | false | CashBox_branchId_code_key |
| RPT-007-get-treasury-today | 0.036 | 0.121 | 411 | 0 | false | TreasuryTransaction_branchId_occurredAt_idx |

---

## 5. تفاصيل كل استعلام ساخن (أدلة مقاسة)

### TreasuryService.getBranchTreasuryBalance()

#### TRS-001-branch-treasury-balance

- **الملف:** apps/api/src/modules/treasury/treasury.service.ts
- **الدالة:** TreasuryService.getBranchTreasuryBalance
- **موقع Prisma:** treasury.service.ts:1194 — prisma.treasuryTransaction.findMany
- **الجداول:** TreasuryTransaction
- **صفوف مقدرة (COUNT):** 158

**SQL المكافئ:**

```sql
SELECT amount, "transactionType", "paymentMethod", "safeType", "sourceType", "affectsCash"
       FROM "TreasuryTransaction"
       WHERE "branchId" = 'a33633ba-aad8-41c9-80cf-9cdf91baa575'
         AND "approvalStatus" = 'APPROVED'::"ApprovalStatus"
```

**EXPLAIN ANALYZE — ملخص مقاس:**

- Planning Time: **0.119 ms**
- Execution Time: **0.141 ms**
- Client round-trip (wall): **422 ms**
- Root Node Type: **Index Scan**
- Actual Rows (root): **158**
- Plan Rows (root): **154**
- Startup Cost / Total Cost: **0.15 / 31.59**
- Shared Hit Blocks (root): **29**
- Shared Read Blocks (root): **0**

**عقد الخطة المكتشفة:**

```
Sequential Scan: false
Index Scan: true
Bitmap Scan: false
Hash Join: false
Nested Loop: false
Merge Join: false
Sort: false
Group/Aggregate: false
```

**شجرة الخطة (مقاسة):**

```
- Index Scan | on TreasuryTransaction | index=TreasuryTransaction_branchId_approvalStatus_idx | actual_rows=158 | actual_time=0.106ms | shared_hit=29 | shared_read=0
```

---

#### RPT-005-treasury-report-balance

- **الملف:** apps/api/src/modules/reports/reports.service.ts
- **الدالة:** ReportsService.treasury
- **موقع Prisma:** reports.service.ts:108 — getBranchTreasuryBalance
- **الجداول:** TreasuryTransaction
- **صفوف مقدرة (COUNT):** 158

**SQL المكافئ:**

```sql
SELECT amount, "transactionType", "paymentMethod", "safeType", "sourceType", "affectsCash"
       FROM "TreasuryTransaction"
       WHERE "branchId" = 'a33633ba-aad8-41c9-80cf-9cdf91baa575' AND "approvalStatus" = 'APPROVED'::"ApprovalStatus"
```

**EXPLAIN ANALYZE — ملخص مقاس:**

- Planning Time: **0.132 ms**
- Execution Time: **0.14 ms**
- Client round-trip (wall): **422 ms**
- Root Node Type: **Index Scan**
- Actual Rows (root): **158**
- Plan Rows (root): **154**
- Startup Cost / Total Cost: **0.15 / 31.59**
- Shared Hit Blocks (root): **29**
- Shared Read Blocks (root): **0**

**عقد الخطة المكتشفة:**

```
Sequential Scan: false
Index Scan: true
Bitmap Scan: false
Hash Join: false
Nested Loop: false
Merge Join: false
Sort: false
Group/Aggregate: false
```

**شجرة الخطة (مقاسة):**

```
- Index Scan | on TreasuryTransaction | index=TreasuryTransaction_branchId_approvalStatus_idx | actual_rows=158 | actual_time=0.105ms | shared_hit=29 | shared_read=0
```

---

### TreasuryService.getShiftSummaryLight()

#### TRS-002a-shift-all-transactions

- **الملف:** apps/api/src/modules/treasury/treasury.service.ts
- **الدالة:** TreasuryService.getShiftSummaryLight
- **موقع Prisma:** treasury.service.ts:1270 — findMany where shiftId orderBy occurredAt desc
- **الجداول:** TreasuryTransaction
- **صفوف مقدرة (COUNT):** 0

**SQL المكافئ:**

```sql
SELECT id, amount, "transactionType", "paymentMethod", "safeType", "approvalStatus",
                "affectsCash", "sourceType", "sourceId", note, "occurredAt"
         FROM "TreasuryTransaction"
         WHERE "shiftId" = '4b3bd7d3-0027-438e-9341-d40277dcebb9'
         ORDER BY "occurredAt" DESC
```

**EXPLAIN ANALYZE — ملخص مقاس:**

- Planning Time: **0.149 ms**
- Execution Time: **0.049 ms**
- Client round-trip (wall): **415 ms**
- Root Node Type: **Sort**
- Actual Rows (root): **0**
- Plan Rows (root): **1**
- Startup Cost / Total Cost: **2.38 / 2.38**
- Shared Hit Blocks (root): **1**
- Shared Read Blocks (root): **0**

**عقد الخطة المكتشفة:**

```
Sequential Scan: false
Index Scan: true
Bitmap Scan: false
Hash Join: false
Nested Loop: false
Merge Join: false
Sort: true
Group/Aggregate: false
```

**شجرة الخطة (مقاسة):**

```
- Sort | actual_rows=0 | actual_time=0.019ms | shared_hit=1 | shared_read=0
  - Index Scan | on TreasuryTransaction | index=TreasuryTransaction_shiftId_idx | actual_rows=0 | actual_time=0.013ms | shared_hit=1 | shared_read=0
```

---

#### TRS-002b-shift-expenses

- **الملف:** apps/api/src/modules/treasury/treasury.service.ts
- **الدالة:** TreasuryService.getShiftSummaryLight
- **موقع Prisma:** treasury.service.ts:1275
- **الجداول:** CashierExpense

**SQL المكافئ:**

```sql
SELECT amount, "paymentMethod" FROM "CashierExpense" WHERE "shiftId" = '4b3bd7d3-0027-438e-9341-d40277dcebb9'
```

**EXPLAIN ANALYZE — ملخص مقاس:**

- Planning Time: **0.1 ms**
- Execution Time: **0.042 ms**
- Client round-trip (wall): **410 ms**
- Root Node Type: **Seq Scan**
- Actual Rows (root): **0**
- Plan Rows (root): **1**
- Startup Cost / Total Cost: **0 / 13.5**
- Shared Hit Blocks (root): **1**
- Shared Read Blocks (root): **0**

**عقد الخطة المكتشفة:**

```
Sequential Scan: true
Index Scan: false
Bitmap Scan: false
Hash Join: false
Nested Loop: false
Merge Join: false
Sort: false
Group/Aggregate: false
```

**شجرة الخطة (مقاسة):**

```
- Seq Scan | on CashierExpense | actual_rows=0 | actual_time=0.018ms | shared_hit=1 | shared_read=0 | filter=("shiftId" = '4b3bd7d3-0027-438e-9341-d40277dcebb9'::text)
```

---

#### TRS-002c-closed-orders-aggregate

- **الملف:** apps/api/src/modules/treasury/treasury.service.ts
- **الدالة:** TreasuryService.getShiftSummaryLight
- **موقع Prisma:** treasury.service.ts:1279 — order.aggregate
- **الجداول:** Order

**SQL المكافئ:**

```sql
SELECT COUNT(*)::bigint AS cnt, COALESCE(SUM("totalAmount"), 0) AS sales
         FROM "Order"
         WHERE "shiftId" = '4b3bd7d3-0027-438e-9341-d40277dcebb9' AND status = 'CLOSED'::"OrderStatus"
```

**EXPLAIN ANALYZE — ملخص مقاس:**

- Planning Time: **0.178 ms**
- Execution Time: **0.062 ms**
- Client round-trip (wall): **422 ms**
- Root Node Type: **Aggregate**
- Actual Rows (root): **1**
- Plan Rows (root): **1**
- Startup Cost / Total Cost: **2.46 / 2.47**
- Shared Hit Blocks (root): **3**
- Shared Read Blocks (root): **0**

**عقد الخطة المكتشفة:**

```
Sequential Scan: false
Index Scan: true
Bitmap Scan: false
Hash Join: false
Nested Loop: false
Merge Join: false
Sort: false
Group/Aggregate: false
```

**شجرة الخطة (مقاسة):**

```
- Aggregate | actual_rows=1 | actual_time=0.026ms | shared_hit=3 | shared_read=0
  - Index Scan | on Order | index=Order_shiftId_status_collectionStatus_closedAt_idx | actual_rows=1 | actual_time=0.018ms | shared_hit=3 | shared_read=0
```

---

#### TRS-002d-uncollected-aggregate

- **الملف:** apps/api/src/modules/treasury/treasury.service.ts
- **الدالة:** TreasuryService.getShiftSummaryLight
- **موقع Prisma:** treasury.service.ts:1284 — order.aggregate uncollectedWhere
- **الجداول:** Order

**SQL المكافئ:**

```sql
SELECT COUNT(*)::bigint AS cnt, COALESCE(SUM("totalAmount"), 0) AS total
         FROM "Order"
         WHERE "shiftId" = '4b3bd7d3-0027-438e-9341-d40277dcebb9'
           AND status = 'CLOSED'::"OrderStatus"
           AND ("collectionStatus" = 'UNCOLLECTED'::"CollectionStatus"
                OR "paymentStatus" = 'PENDING'::"PaymentStatus")
```

**EXPLAIN ANALYZE — ملخص مقاس:**

- Planning Time: **0.162 ms**
- Execution Time: **0.058 ms**
- Client round-trip (wall): **434 ms**
- Root Node Type: **Aggregate**
- Actual Rows (root): **1**
- Plan Rows (root): **1**
- Startup Cost / Total Cost: **2.47 / 2.48**
- Shared Hit Blocks (root): **3**
- Shared Read Blocks (root): **0**

**عقد الخطة المكتشفة:**

```
Sequential Scan: false
Index Scan: true
Bitmap Scan: false
Hash Join: false
Nested Loop: false
Merge Join: false
Sort: false
Group/Aggregate: false
```

**شجرة الخطة (مقاسة):**

```
- Aggregate | actual_rows=1 | actual_time=0.025ms | shared_hit=3 | shared_read=0
  - Index Scan | on Order | index=Order_shiftId_status_collectionStatus_closedAt_idx | actual_rows=1 | actual_time=0.018ms | shared_hit=3 | shared_read=0 | filter=(("collectionStatus" = 'UNCOLLECTED'::"CollectionStatus") OR ("paymentStatus" = 'PENDING'::"PaymentStatus"))
```

---

#### TRS-002e-uncollected-orders-list

- **الملف:** apps/api/src/modules/treasury/treasury.service.ts
- **الدالة:** TreasuryService.getShiftSummaryLight
- **موقع Prisma:** treasury.service.ts:1289
- **الجداول:** Order

**SQL المكافئ:**

```sql
SELECT "orderNumber", "totalAmount", "customerName"
         FROM "Order"
         WHERE "shiftId" = '4b3bd7d3-0027-438e-9341-d40277dcebb9'
           AND status = 'CLOSED'::"OrderStatus"
           AND ("collectionStatus" = 'UNCOLLECTED'::"CollectionStatus"
                OR "paymentStatus" = 'PENDING'::"PaymentStatus")
         ORDER BY "closedAt" DESC
         LIMIT 25
```

**EXPLAIN ANALYZE — ملخص مقاس:**

- Planning Time: **0.17 ms**
- Execution Time: **0.049 ms**
- Client round-trip (wall): **410 ms**
- Root Node Type: **Limit**
- Actual Rows (root): **1**
- Plan Rows (root): **1**
- Startup Cost / Total Cost: **0.27 / 2.46**
- Shared Hit Blocks (root): **4**
- Shared Read Blocks (root): **0**

**عقد الخطة المكتشفة:**

```
Sequential Scan: false
Index Scan: true
Bitmap Scan: false
Hash Join: false
Nested Loop: false
Merge Join: false
Sort: false
Group/Aggregate: false
```

**شجرة الخطة (مقاسة):**

```
- Limit | actual_rows=1 | actual_time=0.022ms | shared_hit=4 | shared_read=0
  - Index Scan | on Order | index=Order_shiftId_status_closedAt_idx | actual_rows=1 | actual_time=0.021ms | shared_hit=4 | shared_read=0 | filter=(("collectionStatus" = 'UNCOLLECTED'::"CollectionStatus") OR ("paymentStatus" = 'PENDING'::"PaymentStatus"))
```

---

#### TRS-002f-shift-find-unique

- **الملف:** apps/api/src/modules/treasury/treasury.service.ts
- **الدالة:** TreasuryService.getShiftSummaryLight
- **موقع Prisma:** treasury.service.ts:1244 — shift.findUnique + include cashBox, openedBy
- **الجداول:** Shift, CashBox, User
- **ملاحظة:** Prisma adds JOINs for include; this EXPLAIN is PK lookup only

**SQL المكافئ:**

```sql
SELECT s.* FROM "Shift" s WHERE s.id = '4b3bd7d3-0027-438e-9341-d40277dcebb9'
```

**EXPLAIN ANALYZE — ملخص مقاس:**

- Planning Time: **0.124 ms**
- Execution Time: **0.057 ms**
- Client round-trip (wall): **411 ms**
- Root Node Type: **Index Scan**
- Actual Rows (root): **1**
- Plan Rows (root): **1**
- Startup Cost / Total Cost: **0.14 / 2.36**
- Shared Hit Blocks (root): **2**
- Shared Read Blocks (root): **0**

**عقد الخطة المكتشفة:**

```
Sequential Scan: false
Index Scan: true
Bitmap Scan: false
Hash Join: false
Nested Loop: false
Merge Join: false
Sort: false
Group/Aggregate: false
```

**شجرة الخطة (مقاسة):**

```
- Index Scan | on Shift | index=Shift_pkey | actual_rows=1 | actual_time=0.024ms | shared_hit=2 | shared_read=0
```

---

### ShiftsService.getPosContext()

#### POS-CTX-001-branch-by-org

- **الملف:** apps/api/src/modules/shifts/shifts.service.ts
- **الدالة:** ShiftsService.getPosContext
- **موقع Prisma:** shifts.service.ts:69 — branch.findFirst
- **الجداول:** Branch

**SQL المكافئ:**

```sql
SELECT id, name, "organizationId", "createdAt"
         FROM "Branch"
         WHERE "organizationId" = '28334772-b6a8-476b-8d71-1f3a2519e227'
         ORDER BY "createdAt" ASC
         LIMIT 1
```

**EXPLAIN ANALYZE — ملخص مقاس:**

- Planning Time: **0.092 ms**
- Execution Time: **0.044 ms**
- Client round-trip (wall): **421 ms**
- Root Node Type: **Limit**
- Actual Rows (root): **1**
- Plan Rows (root): **1**
- Startup Cost / Total Cost: **1.02 / 1.03**
- Shared Hit Blocks (root): **1**
- Shared Read Blocks (root): **0**

**عقد الخطة المكتشفة:**

```
Sequential Scan: true
Index Scan: false
Bitmap Scan: false
Hash Join: false
Nested Loop: false
Merge Join: false
Sort: true
Group/Aggregate: false
```

**شجرة الخطة (مقاسة):**

```
- Limit | actual_rows=1 | actual_time=0.023ms | shared_hit=1 | shared_read=0
  - Sort | actual_rows=1 | actual_time=0.022ms | shared_hit=1 | shared_read=0
    - Seq Scan | on Branch | actual_rows=1 | actual_time=0.015ms | shared_hit=1 | shared_read=0 | filter=("organizationId" = '28334772-b6a8-476b-8d71-1f3a2519e227'::text)
```

---

#### POS-CTX-002-open-shift

- **الملف:** apps/api/src/modules/shifts/shifts.service.ts
- **الدالة:** ShiftsService.getPosContext
- **موقع Prisma:** shifts.service.ts:88 — shift.findFirst OPEN
- **الجداول:** Shift

**SQL المكافئ:**

```sql
SELECT s.id FROM "Shift" s
         WHERE s."branchId" = 'a33633ba-aad8-41c9-80cf-9cdf91baa575' AND s.status = 'OPEN'::"ShiftStatus"
         ORDER BY s."openedAt" DESC
         LIMIT 1
```

**EXPLAIN ANALYZE — ملخص مقاس:**

- Planning Time: **0.118 ms**
- Execution Time: **0.053 ms**
- Client round-trip (wall): **414 ms**
- Root Node Type: **Limit**
- Actual Rows (root): **1**
- Plan Rows (root): **1**
- Startup Cost / Total Cost: **2.35 / 2.36**
- Shared Hit Blocks (root): **2**
- Shared Read Blocks (root): **0**

**عقد الخطة المكتشفة:**

```
Sequential Scan: false
Index Scan: true
Bitmap Scan: false
Hash Join: false
Nested Loop: false
Merge Join: false
Sort: true
Group/Aggregate: false
```

**شجرة الخطة (مقاسة):**

```
- Limit | actual_rows=1 | actual_time=0.019ms | shared_hit=2 | shared_read=0
  - Sort | actual_rows=1 | actual_time=0.018ms | shared_hit=2 | shared_read=0
    - Index Scan | on Shift | index=Shift_one_open_per_cash_box | actual_rows=1 | actual_time=0.012ms | shared_hit=2 | shared_read=0 | filter=("branchId" = 'a33633ba-aad8-41c9-80cf-9cdf91baa575'::text)
```

---

#### POS-CTX-003-cashbox-fallback

- **الملف:** apps/api/src/modules/shifts/shifts.service.ts
- **الدالة:** ShiftsService.getPosContext
- **موقع Prisma:** shifts.service.ts:123
- **الجداول:** CashBox

**SQL المكافئ:**

```sql
SELECT id, name FROM "CashBox"
         WHERE "branchId" = 'a33633ba-aad8-41c9-80cf-9cdf91baa575'
         ORDER BY code ASC
         LIMIT 1
```

**EXPLAIN ANALYZE — ملخص مقاس:**

- Planning Time: **0.087 ms**
- Execution Time: **0.037 ms**
- Client round-trip (wall): **408 ms**
- Root Node Type: **Limit**
- Actual Rows (root): **1**
- Plan Rows (root): **1**
- Startup Cost / Total Cost: **0.15 / 1.82**
- Shared Hit Blocks (root): **2**
- Shared Read Blocks (root): **0**

**عقد الخطة المكتشفة:**

```
Sequential Scan: false
Index Scan: true
Bitmap Scan: false
Hash Join: false
Nested Loop: false
Merge Join: false
Sort: false
Group/Aggregate: false
```

**شجرة الخطة (مقاسة):**

```
- Limit | actual_rows=1 | actual_time=0.015ms | shared_hit=2 | shared_read=0
  - Index Scan | on CashBox | index=CashBox_branchId_code_key | actual_rows=1 | actual_time=0.014ms | shared_hit=2 | shared_read=0
```

---

### ShiftsService.getPosCatalog() + ProductionPlanService

#### CAT-001-product-categories

- **الملف:** apps/api/src/modules/shifts/shifts.service.ts
- **الدالة:** ShiftsService.getPosCatalog
- **موقع Prisma:** shifts.service.ts:1123
- **الجداول:** ProductCategory

**SQL المكافئ:**

```sql
SELECT * FROM "ProductCategory" WHERE "branchId" = 'a33633ba-aad8-41c9-80cf-9cdf91baa575' ORDER BY name ASC
```

**EXPLAIN ANALYZE — ملخص مقاس:**

- Planning Time: **0.079 ms**
- Execution Time: **0.079 ms**
- Client round-trip (wall): **449 ms**
- Root Node Type: **Sort**
- Actual Rows (root): **12**
- Plan Rows (root): **3**
- Startup Cost / Total Cost: **4.47 / 4.48**
- Shared Hit Blocks (root): **2**
- Shared Read Blocks (root): **0**

**عقد الخطة المكتشفة:**

```
Sequential Scan: false
Index Scan: false
Bitmap Scan: true
Hash Join: false
Nested Loop: false
Merge Join: false
Sort: true
Group/Aggregate: false
```

**شجرة الخطة (مقاسة):**

```
- Sort | actual_rows=12 | actual_time=0.052ms | shared_hit=2 | shared_read=0
  - Bitmap Heap Scan | on ProductCategory | actual_rows=12 | actual_time=0.019ms | shared_hit=2 | shared_read=0
    - Bitmap Index Scan | index=ProductCategory_branchId_name_key | actual_rows=13 | actual_time=0.009ms | shared_hit=1 | shared_read=0
```

---

#### CAT-002-products

- **الملف:** apps/api/src/modules/shifts/shifts.service.ts
- **الدالة:** ShiftsService.getPosCatalog
- **موقع Prisma:** shifts.service.ts:1127
- **الجداول:** Product

**SQL المكافئ:**

```sql
SELECT * FROM "Product" WHERE "branchId" = 'a33633ba-aad8-41c9-80cf-9cdf91baa575' ORDER BY name ASC
```

**EXPLAIN ANALYZE — ملخص مقاس:**

- Planning Time: **0.112 ms**
- Execution Time: **0.128 ms**
- Client round-trip (wall): **409 ms**
- Root Node Type: **Sort**
- Actual Rows (root): **56**
- Plan Rows (root): **46**
- Startup Cost / Total Cost: **3.85 / 3.96**
- Shared Hit Blocks (root): **2**
- Shared Read Blocks (root): **0**

**عقد الخطة المكتشفة:**

```
Sequential Scan: true
Index Scan: false
Bitmap Scan: false
Hash Join: false
Nested Loop: false
Merge Join: false
Sort: true
Group/Aggregate: false
```

**شجرة الخطة (مقاسة):**

```
- Sort | actual_rows=56 | actual_time=0.1ms | shared_hit=2 | shared_read=0
  - Seq Scan | on Product | actual_rows=56 | actual_time=0.033ms | shared_hit=2 | shared_read=0 | filter=("branchId" = 'a33633ba-aad8-41c9-80cf-9cdf91baa575'::text)
```

---

#### CAT-003-payment-methods

- **الملف:** apps/api/src/modules/shifts/shifts.service.ts
- **الدالة:** ShiftsService.getPosCatalog
- **موقع Prisma:** shifts.service.ts:1131
- **الجداول:** PaymentMethod

**SQL المكافئ:**

```sql
SELECT * FROM "PaymentMethod"
       WHERE "branchId" = 'a33633ba-aad8-41c9-80cf-9cdf91baa575' AND "isActive" = true
       ORDER BY "sortOrder" ASC
```

**EXPLAIN ANALYZE — ملخص مقاس:**

- Planning Time: **0.09 ms**
- Execution Time: **0.076 ms**
- Client round-trip (wall): **418 ms**
- Root Node Type: **Sort**
- Actual Rows (root): **3**
- Plan Rows (root): **1**
- Startup Cost / Total Cost: **3.41 / 3.41**
- Shared Hit Blocks (root): **2**
- Shared Read Blocks (root): **0**

**عقد الخطة المكتشفة:**

```
Sequential Scan: false
Index Scan: false
Bitmap Scan: true
Hash Join: false
Nested Loop: false
Merge Join: false
Sort: true
Group/Aggregate: false
```

**شجرة الخطة (مقاسة):**

```
- Sort | actual_rows=3 | actual_time=0.03ms | shared_hit=2 | shared_read=0
  - Bitmap Heap Scan | on PaymentMethod | actual_rows=3 | actual_time=0.023ms | shared_hit=2 | shared_read=0 | filter="isActive"
    - Bitmap Index Scan | index=PaymentMethod_branchId_code_key | actual_rows=4 | actual_time=0.008ms | shared_hit=1 | shared_read=0
```

---

#### PLAN-001-orderitem-groupby-sold

- **الملف:** apps/api/src/modules/production-plan/production-plan.service.ts
- **الدالة:** ProductionPlanService.soldQuantitiesForDay / getSummaryMap
- **موقع Prisma:** production-plan.service.ts:63 — orderItem.groupBy
- **الجداول:** OrderItem, Order

**SQL المكافئ:**

```sql
SELECT oi."productId", SUM(oi.quantity) AS qty
       FROM "OrderItem" oi
       INNER JOIN "Order" o ON o.id = oi."orderId"
       WHERE o."branchId" = 'a33633ba-aad8-41c9-80cf-9cdf91baa575'
         AND o.status = 'CLOSED'::"OrderStatus"
         AND o."closedAt" >= '2026-07-02 00:00:00'::timestamp
         AND o."closedAt" <= '2026-07-02 23:59:59'::timestamp
       GROUP BY oi."productId"
```

**EXPLAIN ANALYZE — ملخص مقاس:**

- Planning Time: **0.362 ms**
- Execution Time: **0.098 ms**
- Client round-trip (wall): **449 ms**
- Root Node Type: **Aggregate**
- Actual Rows (root): **1**
- Plan Rows (root): **3**
- Startup Cost / Total Cost: **6.1 / 6.16**
- Shared Hit Blocks (root): **6**
- Shared Read Blocks (root): **0**

**عقد الخطة المكتشفة:**

```
Sequential Scan: false
Index Scan: true
Bitmap Scan: true
Hash Join: false
Nested Loop: true
Merge Join: false
Sort: true
Group/Aggregate: false
```

**شجرة الخطة (مقاسة):**

```
- Aggregate | actual_rows=1 | actual_time=0.052ms | shared_hit=6 | shared_read=0
  - Sort | actual_rows=1 | actual_time=0.044ms | shared_hit=6 | shared_read=0
    - Nested Loop | actual_rows=1 | actual_time=0.031ms | shared_hit=6 | shared_read=0
      - Index Scan | on Order | index=Order_branchId_status_closedAt_idx | actual_rows=1 | actual_time=0.014ms | shared_hit=3 | shared_read=0
      - Bitmap Heap Scan | on OrderItem | actual_rows=1 | actual_time=0.014ms | shared_hit=3 | shared_read=0
        - Bitmap Index Scan | index=OrderItem_orderId_idx | actual_rows=1 | actual_time=0.005ms | shared_hit=2 | shared_read=0
```

---

#### PLAN-002-daily-plan

- **الملف:** apps/api/src/modules/production-plan/production-plan.service.ts
- **الدالة:** ProductionPlanService.getDailyPlan
- **موقع Prisma:** production-plan.service.ts:85
- **الجداول:** ProductDailyPlan

**SQL المكافئ:**

```sql
SELECT "productId", "plannedQuantity" FROM "ProductDailyPlan"
       WHERE "branchId" = 'a33633ba-aad8-41c9-80cf-9cdf91baa575' AND "dateKey" = '2026-07-02'
```

**EXPLAIN ANALYZE — ملخص مقاس:**

- Planning Time: **0.084 ms**
- Execution Time: **0.038 ms**
- Client round-trip (wall): **421 ms**
- Root Node Type: **Index Scan**
- Actual Rows (root): **0**
- Plan Rows (root): **1**
- Startup Cost / Total Cost: **0.15 / 2.37**
- Shared Hit Blocks (root): **1**
- Shared Read Blocks (root): **0**

**عقد الخطة المكتشفة:**

```
Sequential Scan: false
Index Scan: true
Bitmap Scan: false
Hash Join: false
Nested Loop: false
Merge Join: false
Sort: false
Group/Aggregate: false
```

**شجرة الخطة (مقاسة):**

```
- Index Scan | on ProductDailyPlan | index=ProductDailyPlan_branchId_dateKey_idx | actual_rows=0 | actual_time=0.013ms | shared_hit=1 | shared_read=0
```

---

### ShiftsService.listShifts() + TreasuryService.listShiftsForWorkspace()

#### SHF-001-list-shifts

- **الملف:** apps/api/src/modules/shifts/shifts.service.ts
- **الدالة:** ShiftsService.listShifts
- **موقع Prisma:** shifts.service.ts:162 — shift.findMany
- **الجداول:** Shift
- **صفوف مقدرة (COUNT):** 1
- **ملاحظة:** Each row then triggers getShiftSummary N+1 in app — not single SQL

**SQL المكافئ:**

```sql
SELECT s.id, s."shiftNumber", s."openedAt", s.status
       FROM "Shift" s
       WHERE s."branchId" = 'a33633ba-aad8-41c9-80cf-9cdf91baa575'
         AND s."openedAt" >= '2026-07-01T21:00:00.000Z'::timestamptz
         AND s."openedAt" <= '2026-07-02T20:59:59.999Z'::timestamptz
       ORDER BY s."openedAt" DESC
```

**EXPLAIN ANALYZE — ملخص مقاس:**

- Planning Time: **0.114 ms**
- Execution Time: **0.042 ms**
- Client round-trip (wall): **419 ms**
- Root Node Type: **Index Scan**
- Actual Rows (root): **1**
- Plan Rows (root): **1**
- Startup Cost / Total Cost: **0.14 / 2.36**
- Shared Hit Blocks (root): **3**
- Shared Read Blocks (root): **0**

**عقد الخطة المكتشفة:**

```
Sequential Scan: false
Index Scan: true
Bitmap Scan: false
Hash Join: false
Nested Loop: false
Merge Join: false
Sort: false
Group/Aggregate: false
```

**شجرة الخطة (مقاسة):**

```
- Index Scan | on Shift | index=Shift_branchId_openedAt_idx | actual_rows=1 | actual_time=0.018ms | shared_hit=3 | shared_read=0
```

---

#### SHF-002-batch-shift-transactions

- **الملف:** apps/api/src/modules/treasury/treasury.service.ts
- **الدالة:** TreasuryService.listShiftsForWorkspace
- **موقع Prisma:** treasury.service.ts:806 — listShiftsForWorkspace batch
- **الجداول:** TreasuryTransaction, Shift

**SQL المكافئ:**

```sql
SELECT "shiftId", amount, "transactionType", "paymentMethod", "approvalStatus", "affectsCash"
       FROM "TreasuryTransaction"
       WHERE "shiftId" IN (
         SELECT id FROM "Shift"
         WHERE "branchId" = 'a33633ba-aad8-41c9-80cf-9cdf91baa575'
           AND "openedAt" >= '2026-07-01T21:00:00.000Z'::timestamptz
           AND "openedAt" <= '2026-07-02T20:59:59.999Z'::timestamptz
         ORDER BY "openedAt" DESC
         LIMIT 50
       )
```

**EXPLAIN ANALYZE — ملخص مقاس:**

- Planning Time: **0.285 ms**
- Execution Time: **0.069 ms**
- Client round-trip (wall): **441 ms**
- Root Node Type: **Nested Loop**
- Actual Rows (root): **0**
- Plan Rows (root): **34**
- Startup Cost / Total Cost: **3.89 / 30.32**
- Shared Hit Blocks (root): **4**
- Shared Read Blocks (root): **0**

**عقد الخطة المكتشفة:**

```
Sequential Scan: false
Index Scan: true
Bitmap Scan: true
Hash Join: false
Nested Loop: true
Merge Join: false
Sort: false
Group/Aggregate: false
```

**شجرة الخطة (مقاسة):**

```
- Nested Loop | actual_rows=0 | actual_time=0.03ms | shared_hit=4 | shared_read=0
  - Aggregate | actual_rows=1 | actual_time=0.02ms | shared_hit=3 | shared_read=0
    - Limit | actual_rows=1 | actual_time=0.015ms | shared_hit=3 | shared_read=0
      - Index Scan | on Shift | index=Shift_branchId_openedAt_idx | actual_rows=1 | actual_time=0.014ms | shared_hit=3 | shared_read=0
  - Bitmap Heap Scan | on TreasuryTransaction | actual_rows=0 | actual_time=0.008ms | shared_hit=1 | shared_read=0
    - Bitmap Index Scan | index=TreasuryTransaction_shiftId_idx | actual_rows=0 | actual_time=0.002ms | shared_hit=1 | shared_read=0
```

---

### OrdersService.listOrdersByShift()

#### ORD-001-by-shift-uncollected-open

- **الملف:** apps/api/src/modules/orders/orders.service.ts
- **الدالة:** OrdersService.listOrdersByShift
- **موقع Prisma:** orders.service.ts:1056 — listOrdersByShift filter=uncollected OPEN shift
- **الجداول:** Order

**SQL المكافئ:**

```sql
SELECT id, "orderNumber", "totalAmount", "closedAt", "collectionStatus", "paymentStatus"
         FROM "Order"
         WHERE "shiftId" = '4b3bd7d3-0027-438e-9341-d40277dcebb9'
           AND status = 'CLOSED'::"OrderStatus"
           AND ("collectionStatus" = 'UNCOLLECTED'::"CollectionStatus"
                OR "paymentStatus" = 'PENDING'::"PaymentStatus")
         ORDER BY "closedAt" DESC
         LIMIT 26
```

**EXPLAIN ANALYZE — ملخص مقاس:**

- Planning Time: **0.176 ms**
- Execution Time: **0.044 ms**
- Client round-trip (wall): **421 ms**
- Root Node Type: **Limit**
- Actual Rows (root): **1**
- Plan Rows (root): **1**
- Startup Cost / Total Cost: **0.27 / 2.46**
- Shared Hit Blocks (root): **4**
- Shared Read Blocks (root): **0**

**عقد الخطة المكتشفة:**

```
Sequential Scan: false
Index Scan: true
Bitmap Scan: false
Hash Join: false
Nested Loop: false
Merge Join: false
Sort: false
Group/Aggregate: false
```

**شجرة الخطة (مقاسة):**

```
- Limit | actual_rows=1 | actual_time=0.021ms | shared_hit=4 | shared_read=0
  - Index Scan | on Order | index=Order_shiftId_status_closedAt_idx | actual_rows=1 | actual_time=0.019ms | shared_hit=4 | shared_read=0 | filter=(("collectionStatus" = 'UNCOLLECTED'::"CollectionStatus") OR ("paymentStatus" = 'PENDING'::"PaymentStatus"))
```

---

#### ORD-002-shift-lookup

- **الملف:** apps/api/src/modules/orders/orders.service.ts
- **الدالة:** OrdersService.listOrdersByShift
- **موقع Prisma:** orders.service.ts:1008
- **الجداول:** Shift

**SQL المكافئ:**

```sql
SELECT "branchId", "cashBoxId", status FROM "Shift" WHERE id = '4b3bd7d3-0027-438e-9341-d40277dcebb9'
```

**EXPLAIN ANALYZE — ملخص مقاس:**

- Planning Time: **0.078 ms**
- Execution Time: **0.043 ms**
- Client round-trip (wall): **444 ms**
- Root Node Type: **Index Scan**
- Actual Rows (root): **1**
- Plan Rows (root): **1**
- Startup Cost / Total Cost: **0.14 / 2.36**
- Shared Hit Blocks (root): **2**
- Shared Read Blocks (root): **0**

**عقد الخطة المكتشفة:**

```
Sequential Scan: false
Index Scan: true
Bitmap Scan: false
Hash Join: false
Nested Loop: false
Merge Join: false
Sort: false
Group/Aggregate: false
```

**شجرة الخطة (مقاسة):**

```
- Index Scan | on Shift | index=Shift_pkey | actual_rows=1 | actual_time=0.02ms | shared_hit=2 | shared_read=0
```

---

### ReportsService + ReportsAnalyticsService

#### RPT-001-dashboard-orders-today

- **الملف:** apps/api/src/modules/reports/reports.service.ts
- **الدالة:** ReportsService.dashboard
- **موقع Prisma:** reports.service.ts:18 — order.aggregate
- **الجداول:** Order

**SQL المكافئ:**

```sql
SELECT COUNT(*)::bigint AS cnt, COALESCE(SUM("totalAmount"), 0) AS sales
       FROM "Order"
       WHERE "branchId" = 'a33633ba-aad8-41c9-80cf-9cdf91baa575'
         AND status = 'CLOSED'::"OrderStatus"
         AND "closedAt" >= '2026-07-01T21:00:00.000Z'::timestamptz
```

**EXPLAIN ANALYZE — ملخص مقاس:**

- Planning Time: **0.163 ms**
- Execution Time: **0.067 ms**
- Client round-trip (wall): **428 ms**
- Root Node Type: **Aggregate**
- Actual Rows (root): **1**
- Plan Rows (root): **1**
- Startup Cost / Total Cost: **2.5 / 2.51**
- Shared Hit Blocks (root): **5**
- Shared Read Blocks (root): **0**

**عقد الخطة المكتشفة:**

```
Sequential Scan: false
Index Scan: true
Bitmap Scan: false
Hash Join: false
Nested Loop: false
Merge Join: false
Sort: false
Group/Aggregate: false
```

**شجرة الخطة (مقاسة):**

```
- Aggregate | actual_rows=1 | actual_time=0.033ms | shared_hit=5 | shared_read=0
  - Index Scan | on Order | index=Order_branchId_status_closedAt_idx | actual_rows=6 | actual_time=0.023ms | shared_hit=5 | shared_read=0
```

---

#### RPT-002-dashboard-open-shift-treasury-entries

- **الملف:** apps/api/src/modules/reports/reports.service.ts
- **الدالة:** ReportsService.dashboard
- **موقع Prisma:** reports.service.ts:26 — shift.findFirst include treasuryEntries
- **الجداول:** Shift, TreasuryTransaction

**SQL المكافئ:**

```sql
SELECT tt.id, tt.amount, tt."transactionType", tt."approvalStatus", tt."affectsCash"
         FROM "TreasuryTransaction" tt
         WHERE tt."shiftId" = (
           SELECT id FROM "Shift"
           WHERE "branchId" = 'a33633ba-aad8-41c9-80cf-9cdf91baa575' AND status = 'OPEN'::"ShiftStatus"
           LIMIT 1
         )
```

**EXPLAIN ANALYZE — ملخص مقاس:**

- Planning Time: **0.168 ms**
- Execution Time: **0.057 ms**
- Client round-trip (wall): **469 ms**
- Root Node Type: **Bitmap Heap Scan**
- Actual Rows (root): **0**
- Plan Rows (root): **34**
- Startup Cost / Total Cost: **3.86 / 29.94**
- Shared Hit Blocks (root): **3**
- Shared Read Blocks (root): **0**

**عقد الخطة المكتشفة:**

```
Sequential Scan: false
Index Scan: true
Bitmap Scan: true
Hash Join: false
Nested Loop: false
Merge Join: false
Sort: false
Group/Aggregate: false
```

**شجرة الخطة (مقاسة):**

```
- Bitmap Heap Scan | on TreasuryTransaction | actual_rows=0 | actual_time=0.028ms | shared_hit=3 | shared_read=0
  - Limit | actual_rows=1 | actual_time=0.012ms | shared_hit=2 | shared_read=0
    - Index Scan | on Shift | index=Shift_one_open_per_cash_box | actual_rows=1 | actual_time=0.011ms | shared_hit=2 | shared_read=0 | filter=("branchId" = 'a33633ba-aad8-41c9-80cf-9cdf91baa575'::text)
  - Bitmap Index Scan | index=TreasuryTransaction_shiftId_idx | actual_rows=0 | actual_time=0.024ms | shared_hit=3 | shared_read=0
```

---

#### RPT-003-operations-kpi

- **الملف:** apps/api/src/modules/reports/reports-analytics.service.ts
- **الدالة:** ReportsAnalyticsService.getOperationsBreakdown
- **موقع Prisma:** reports-analytics.service.ts:491 — getOperationsBreakdown kpi
- **الجداول:** Order

**SQL المكافئ:**

```sql
SELECT COUNT(*)::bigint AS cnt, COALESCE(SUM(o."totalAmount"), 0) AS sales
       FROM "Order" o
       WHERE o."branchId" = 'a33633ba-aad8-41c9-80cf-9cdf91baa575'
         AND o.status = 'CLOSED'::"OrderStatus"
         AND COALESCE(o."closedAt", o."openedAt") >= (NOW() - INTERVAL '90 days')
         AND COALESCE(o."closedAt", o."openedAt") <= NOW()
```

**EXPLAIN ANALYZE — ملخص مقاس:**

- Planning Time: **0.169 ms**
- Execution Time: **0.367 ms**
- Client round-trip (wall): **462 ms**
- Root Node Type: **Aggregate**
- Actual Rows (root): **1**
- Plan Rows (root): **1**
- Startup Cost / Total Cost: **26.08 / 26.09**
- Shared Hit Blocks (root): **17**
- Shared Read Blocks (root): **0**

**عقد الخطة المكتشفة:**

```
Sequential Scan: true
Index Scan: false
Bitmap Scan: false
Hash Join: false
Nested Loop: false
Merge Join: false
Sort: false
Group/Aggregate: false
```

**شجرة الخطة (مقاسة):**

```
- Aggregate | actual_rows=1 | actual_time=0.331ms | shared_hit=17 | shared_read=0
  - Seq Scan | on Order | actual_rows=291 | actual_time=0.285ms | shared_hit=17 | shared_read=0 | filter=(("branchId" = 'a33633ba-aad8-41c9-80cf-9cdf91baa575'::text) AND (status = 'CLOSED'::"OrderStatus") AND (COALESCE("closedAt", "openedAt") <= now()) AND (COALESCE("closedAt", "openedAt") >= (now() - '90 days'::interval)))
```

---

#### RPT-004-operations-top-products

- **الملف:** apps/api/src/modules/reports/reports-analytics.service.ts
- **الدالة:** ReportsAnalyticsService.getOperationsBreakdown
- **موقع Prisma:** reports-analytics.service.ts:504
- **الجداول:** OrderItem, Order, Product

**SQL المكافئ:**

```sql
SELECT p.name, SUM(oi.quantity) AS quantity, SUM(oi."lineTotal") AS revenue
       FROM "OrderItem" oi
       JOIN "Order" o ON o.id = oi."orderId"
       JOIN "Product" p ON p.id = oi."productId"
       WHERE o."branchId" = 'a33633ba-aad8-41c9-80cf-9cdf91baa575'
         AND o.status = 'CLOSED'::"OrderStatus"
         AND COALESCE(o."closedAt", o."openedAt") >= (NOW() - INTERVAL '90 days')
         AND COALESCE(o."closedAt", o."openedAt") <= NOW()
       GROUP BY p.name
       ORDER BY SUM(oi."lineTotal") DESC
       LIMIT 10
```

**EXPLAIN ANALYZE — ملخص مقاس:**

- Planning Time: **0.453 ms**
- Execution Time: **4.807 ms**
- Client round-trip (wall): **443 ms**
- Root Node Type: **Limit**
- Actual Rows (root): **10**
- Plan Rows (root): **3**
- Startup Cost / Total Cost: **30.26 / 30.27**
- Shared Hit Blocks (root): **2384**
- Shared Read Blocks (root): **0**

**عقد الخطة المكتشفة:**

```
Sequential Scan: true
Index Scan: true
Bitmap Scan: true
Hash Join: false
Nested Loop: true
Merge Join: false
Sort: true
Group/Aggregate: false
```

**شجرة الخطة (مقاسة):**

```
- Limit | actual_rows=10 | actual_time=4.749ms | shared_hit=2384 | shared_read=0
  - Sort | actual_rows=10 | actual_time=4.746ms | shared_hit=2384 | shared_read=0
    - Aggregate | actual_rows=36 | actual_time=4.723ms | shared_hit=2384 | shared_read=0
      - Sort | actual_rows=742 | actual_time=4.503ms | shared_hit=2384 | shared_read=0
        - Nested Loop | actual_rows=742 | actual_time=3.606ms | shared_hit=2384 | shared_read=0
          - Nested Loop | actual_rows=742 | actual_time=2.052ms | shared_hit=900 | shared_read=0
            - Seq Scan | on Order | actual_rows=291 | actual_time=0.394ms | shared_hit=17 | shared_read=0 | filter=(("branchId" = 'a33633ba-aad8-41c9-80cf-9cdf91baa575'::text) AND (status = 'CLOSED'::"OrderStatus") AND (COALESCE("closedAt", "openedAt") <= now()) AND (COALESCE("closedAt", "openedAt") >= (now() - '90 days'::interval)))
            - Bitmap Heap Scan | on OrderItem | actual_rows=3 | actual_time=0.004ms | shared_hit=883 | shared_read=0
              - Bitmap Index Scan | index=OrderItem_orderId_idx | actual_rows=3 | actual_time=0.003ms | shared_hit=582 | shared_read=0
          - Index Scan | on Product | index=Product_pkey | actual_rows=1 | actual_time=0.002ms | shared_hit=1484 | shared_read=0
```

---

#### RPT-006-treasury-transactions-list

- **الملف:** apps/api/src/modules/reports/reports.service.ts
- **الدالة:** ReportsService.treasury
- **موقع Prisma:** reports.service.ts:113
- **الجداول:** TreasuryTransaction

**SQL المكافئ:**

```sql
SELECT id, amount, "transactionType", "occurredAt"
       FROM "TreasuryTransaction"
       WHERE "branchId" = 'a33633ba-aad8-41c9-80cf-9cdf91baa575'
       ORDER BY "occurredAt" DESC
       LIMIT 100
```

**EXPLAIN ANALYZE — ملخص مقاس:**

- Planning Time: **0.118 ms**
- Execution Time: **0.105 ms**
- Client round-trip (wall): **433 ms**
- Root Node Type: **Limit**
- Actual Rows (root): **100**
- Plan Rows (root): **100**
- Startup Cost / Total Cost: **0.28 / 8.94**
- Shared Hit Blocks (root): **14**
- Shared Read Blocks (root): **0**

**عقد الخطة المكتشفة:**

```
Sequential Scan: false
Index Scan: true
Bitmap Scan: false
Hash Join: false
Nested Loop: false
Merge Join: false
Sort: false
Group/Aggregate: false
```

**شجرة الخطة (مقاسة):**

```
- Limit | actual_rows=100 | actual_time=0.077ms | shared_hit=14 | shared_read=0
  - Index Scan | on TreasuryTransaction | index=TreasuryTransaction_branchId_occurredAt_idx | actual_rows=100 | actual_time=0.066ms | shared_hit=14 | shared_read=0
```

---

#### RPT-007-get-treasury-today

- **الملف:** apps/api/src/modules/treasury/treasury.service.ts
- **الدالة:** TreasuryService.getTreasuryToday
- **موقع Prisma:** treasury.service.ts:578 — getTreasuryToday
- **الجداول:** TreasuryTransaction

**SQL المكافئ:**

```sql
SELECT amount, "paymentMethod", "safeType", "approvalStatus", "transactionType", "sourceType"
       FROM "TreasuryTransaction"
       WHERE "branchId" = 'a33633ba-aad8-41c9-80cf-9cdf91baa575'
         AND "occurredAt" >= '2026-07-02 00:00:00'::timestamp
         AND "occurredAt" <= '2026-07-02 23:59:59'::timestamp
```

**EXPLAIN ANALYZE — ملخص مقاس:**

- Planning Time: **0.121 ms**
- Execution Time: **0.036 ms**
- Client round-trip (wall): **411 ms**
- Root Node Type: **Index Scan**
- Actual Rows (root): **0**
- Plan Rows (root): **1**
- Startup Cost / Total Cost: **0.28 / 2.5**
- Shared Hit Blocks (root): **2**
- Shared Read Blocks (root): **0**

**عقد الخطة المكتشفة:**

```
Sequential Scan: false
Index Scan: true
Bitmap Scan: false
Hash Join: false
Nested Loop: false
Merge Join: false
Sort: false
Group/Aggregate: false
```

**شجرة الخطة (مقاسة):**

```
- Index Scan | on TreasuryTransaction | index=TreasuryTransaction_branchId_occurredAt_idx | actual_rows=0 | actual_time=0.011ms | shared_hit=2 | shared_read=0
```

---

#### RPT-008-inventory-all-stock

- **الملف:** apps/api/src/modules/reports/reports.service.ts
- **الدالة:** ReportsService.inventory
- **موقع Prisma:** reports.service.ts:172
- **الجداول:** StockItem

**SQL المكافئ:**

```sql
SELECT id, name, "onHandQuantity", "averageCost" FROM "StockItem" WHERE "branchId" = 'a33633ba-aad8-41c9-80cf-9cdf91baa575'
```

**EXPLAIN ANALYZE — ملخص مقاس:**

- Planning Time: **0.066 ms**
- Execution Time: **0.041 ms**
- Client round-trip (wall): **414 ms**
- Root Node Type: **Seq Scan**
- Actual Rows (root): **1**
- Plan Rows (root): **1**
- Startup Cost / Total Cost: **0 / 13.5**
- Shared Hit Blocks (root): **1**
- Shared Read Blocks (root): **0**

**عقد الخطة المكتشفة:**

```
Sequential Scan: true
Index Scan: false
Bitmap Scan: false
Hash Join: false
Nested Loop: false
Merge Join: false
Sort: false
Group/Aggregate: false
```

**شجرة الخطة (مقاسة):**

```
- Seq Scan | on StockItem | actual_rows=1 | actual_time=0.017ms | shared_hit=1 | shared_read=0 | filter=("branchId" = 'a33633ba-aad8-41c9-80cf-9cdf91baa575'::text)
```

---

## 6. استعلامات متعددة غير مدمجة في SQL واحد (وصف من الكود — بدون EXPLAIN موحّد)

### ShiftsService.listShifts() — N+1 على مستوى التطبيق

- **الملف:** `apps/api/src/modules/shifts/shifts.service.ts`
- **الدالة:** `listShifts()` سطر 150–182
- **SQL الأول (مقاس):** SHF-001-list-shifts — Execution **0.042 ms**
- **لكل صف وردية:** يستدعي `TreasuryService.getShiftSummary(id)` = `getShiftSummaryLight` = **6 استعلامات** (TRS-002a … TRS-002f)
- **عند 1 وردية في النطاق اليوم:** 1 × 6 = **6** استعلام إضافي مُقدَّر من بنية الكود
- **مقارنة:** SHF-002-batch-shift-transactions (listShiftsForWorkspace) — Execution **0.069 ms** — يجلب txs لكل الورديات في استعلام واحد

### ShiftsService.getPosContext() مع وردية مفتوحة

عند وجود وردية OPEN يستدعي `getPosShiftSummary()` الذي يستدعي `getShiftSummaryLight` + `cashierExpense.findMany` — مجموع الاستعلامات = POS-CTX-* + TRS-002*

---

## 7. الفهارس ذات الصلة (من pg_indexes — مقاس)

| Table | Index | Definition |
|-------|-------|------------|
| Branch | Branch_organizationId_code_key | `CREATE UNIQUE INDEX "Branch_organizationId_code_key" ON public."Branch" USING btree ("organizationId", code)` |
| Branch | Branch_pkey | `CREATE UNIQUE INDEX "Branch_pkey" ON public."Branch" USING btree (id)` |
| CashBox | CashBox_branchId_code_key | `CREATE UNIQUE INDEX "CashBox_branchId_code_key" ON public."CashBox" USING btree ("branchId", code)` |
| CashBox | CashBox_pkey | `CREATE UNIQUE INDEX "CashBox_pkey" ON public."CashBox" USING btree (id)` |
| CashierExpense | CashierExpense_pkey | `CREATE UNIQUE INDEX "CashierExpense_pkey" ON public."CashierExpense" USING btree (id)` |
| Order | Order_branchId_cashBoxId_status_closedAt_idx | `CREATE INDEX "Order_branchId_cashBoxId_status_closedAt_idx" ON public."Order" USING btree ("branchId", "cashBoxId", status, "closedAt")` |
| Order | Order_branchId_openedAt_idx | `CREATE INDEX "Order_branchId_openedAt_idx" ON public."Order" USING btree ("branchId", "openedAt")` |
| Order | Order_branchId_status_closedAt_idx | `CREATE INDEX "Order_branchId_status_closedAt_idx" ON public."Order" USING btree ("branchId", status, "closedAt")` |
| Order | Order_cancelRequestedAt_idx | `CREATE INDEX "Order_cancelRequestedAt_idx" ON public."Order" USING btree ("cancelRequestedAt" DESC NULLS LAST) WHERE ("cancelRequestedAt" IS NOT NULL)` |
| Order | Order_customerId_idx | `CREATE INDEX "Order_customerId_idx" ON public."Order" USING btree ("customerId")` |
| Order | Order_pkey | `CREATE UNIQUE INDEX "Order_pkey" ON public."Order" USING btree (id)` |
| Order | Order_shiftId_orderNumber_key | `CREATE UNIQUE INDEX "Order_shiftId_orderNumber_key" ON public."Order" USING btree ("shiftId", "orderNumber")` |
| Order | Order_shiftId_status_closedAt_idx | `CREATE INDEX "Order_shiftId_status_closedAt_idx" ON public."Order" USING btree ("shiftId", status, "closedAt")` |
| Order | Order_shiftId_status_collectionStatus_closedAt_idx | `CREATE INDEX "Order_shiftId_status_collectionStatus_closedAt_idx" ON public."Order" USING btree ("shiftId", status, "collectionStatus", "closedAt" DESC)` |
| OrderItem | OrderItem_orderId_idx | `CREATE INDEX "OrderItem_orderId_idx" ON public."OrderItem" USING btree ("orderId")` |
| OrderItem | OrderItem_pkey | `CREATE UNIQUE INDEX "OrderItem_pkey" ON public."OrderItem" USING btree (id)` |
| Product | Product_branchId_sku_key | `CREATE UNIQUE INDEX "Product_branchId_sku_key" ON public."Product" USING btree ("branchId", sku)` |
| Product | Product_pkey | `CREATE UNIQUE INDEX "Product_pkey" ON public."Product" USING btree (id)` |
| ProductDailyPlan | ProductDailyPlan_branchId_dateKey_idx | `CREATE INDEX "ProductDailyPlan_branchId_dateKey_idx" ON public."ProductDailyPlan" USING btree ("branchId", "dateKey")` |
| ProductDailyPlan | ProductDailyPlan_branchId_productId_dateKey_key | `CREATE UNIQUE INDEX "ProductDailyPlan_branchId_productId_dateKey_key" ON public."ProductDailyPlan" USING btree ("branchId", "productId", "dateKey")` |
| ProductDailyPlan | ProductDailyPlan_pkey | `CREATE UNIQUE INDEX "ProductDailyPlan_pkey" ON public."ProductDailyPlan" USING btree (id)` |
| Shift | Shift_branchId_openedAt_idx | `CREATE INDEX "Shift_branchId_openedAt_idx" ON public."Shift" USING btree ("branchId", "openedAt")` |
| Shift | Shift_one_open_per_cash_box | `CREATE UNIQUE INDEX "Shift_one_open_per_cash_box" ON public."Shift" USING btree ("cashBoxId") WHERE (status = 'OPEN'::"ShiftStatus")` |
| Shift | Shift_pkey | `CREATE UNIQUE INDEX "Shift_pkey" ON public."Shift" USING btree (id)` |
| Shift | Shift_shiftNumber_key | `CREATE UNIQUE INDEX "Shift_shiftNumber_key" ON public."Shift" USING btree ("shiftNumber")` |
| TreasuryTransaction | TreasuryTransaction_branchId_approvalStatus_idx | `CREATE INDEX "TreasuryTransaction_branchId_approvalStatus_idx" ON public."TreasuryTransaction" USING btree ("branchId", "approvalStatus")` |
| TreasuryTransaction | TreasuryTransaction_branchId_occurredAt_idx | `CREATE INDEX "TreasuryTransaction_branchId_occurredAt_idx" ON public."TreasuryTransaction" USING btree ("branchId", "occurredAt")` |
| TreasuryTransaction | TreasuryTransaction_branchId_safeType_occurredAt_idx | `CREATE INDEX "TreasuryTransaction_branchId_safeType_occurredAt_idx" ON public."TreasuryTransaction" USING btree ("branchId", "safeType", "occurredAt")` |
| TreasuryTransaction | TreasuryTransaction_branchId_transactionType_occurredAt_idx | `CREATE INDEX "TreasuryTransaction_branchId_transactionType_occurredAt_idx" ON public."TreasuryTransaction" USING btree ("branchId", "transactionType", "occurredAt")` |
| TreasuryTransaction | TreasuryTransaction_pkey | `CREATE UNIQUE INDEX "TreasuryTransaction_pkey" ON public."TreasuryTransaction" USING btree (id)` |
| TreasuryTransaction | TreasuryTransaction_shiftId_idx | `CREATE INDEX "TreasuryTransaction_shiftId_idx" ON public."TreasuryTransaction" USING btree ("shiftId")` |
| TreasuryTransaction | TreasuryTransaction_sourceType_sourceId_idx | `CREATE INDEX "TreasuryTransaction_sourceType_sourceId_idx" ON public."TreasuryTransaction" USING btree ("sourceType", "sourceId")` |

---

## 8. أبطأ تنفيذ على الخادم (Top 5 — مقاس)

1. **RPT-004-operations-top-products** — Execution **4.807 ms**, Planning **0.453 ms**, Rows **10**, SeqScan=true
2. **RPT-003-operations-kpi** — Execution **0.367 ms**, Planning **0.169 ms**, Rows **1**, SeqScan=true
3. **TRS-001-branch-treasury-balance** — Execution **0.141 ms**, Planning **0.119 ms**, Rows **158**, SeqScan=false
4. **RPT-005-treasury-report-balance** — Execution **0.14 ms**, Planning **0.132 ms**, Rows **158**, SeqScan=false
5. **CAT-002-products** — Execution **0.128 ms**, Planning **0.112 ms**, Rows **56**, SeqScan=true

---

## 9. استعلامات استخدمت Sequential Scan (مقاس)

### TRS-002b-shift-expenses
- Execution Time: **0.042 ms**
- Seq Scan on **CashierExpense** | actual_rows=0 | filter: `("shiftId" = '4b3bd7d3-0027-438e-9341-d40277dcebb9'::text)`

### POS-CTX-001-branch-by-org
- Execution Time: **0.044 ms**
- Seq Scan on **Branch** | actual_rows=1 | filter: `("organizationId" = '28334772-b6a8-476b-8d71-1f3a2519e227'::text)`

### CAT-002-products
- Execution Time: **0.128 ms**
- Seq Scan on **Product** | actual_rows=56 | filter: `("branchId" = 'a33633ba-aad8-41c9-80cf-9cdf91baa575'::text)`

### RPT-003-operations-kpi
- Execution Time: **0.367 ms**
- Seq Scan on **Order** | actual_rows=291 | filter: `(("branchId" = 'a33633ba-aad8-41c9-80cf-9cdf91baa575'::text) AND (status = 'CLOSED'::"OrderStatus") AND (COALESCE("closedAt", "openedAt") <= now()) AND (COALESCE("closedAt", "openedAt") >= (now() - '90 days'::interval)))`

### RPT-004-operations-top-products
- Execution Time: **4.807 ms**
- Seq Scan on **Order** | actual_rows=291 | filter: `(("branchId" = 'a33633ba-aad8-41c9-80cf-9cdf91baa575'::text) AND (status = 'CLOSED'::"OrderStatus") AND (COALESCE("closedAt", "openedAt") <= now()) AND (COALESCE("closedAt", "openedAt") >= (now() - '90 days'::interval)))`

### RPT-008-inventory-all-stock
- Execution Time: **0.041 ms**
- Seq Scan on **StockItem** | actual_rows=1 | filter: `("branchId" = 'a33633ba-aad8-41c9-80cf-9cdf91baa575'::text)`


---

## 10. ملف الأدلة الخام

النتائج الكاملة بصيغة JSON (تتضمن `explainJson` لكل استعلام):

`apps/database-explain-results.json`

---

*نهاية التقرير — measured database evidence only. لا توصيات تحسين.*
