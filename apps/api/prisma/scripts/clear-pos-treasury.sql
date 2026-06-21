-- مسح الطلبات والخزنة (ورديات + حركات) للبدء من الصفر
-- يُبقي: المستخدمين، المنتجات، الفروع، الخزائن (CashBox)، طرق الدفع، المخزون، المشتريات
--
-- شغّله من Supabase → SQL Editor أو psql متصل بقاعدة البيانات
-- نسخة احتياطية قبل التشغيل إن أمكن

BEGIN;

-- 1) الطلبات وكل ما يتعلق بها
TRUNCATE TABLE
  "OrderItemNote",
  "OrderItem",
  "OrderPayment",
  "SuspendedOrder",
  "Order"
RESTART IDENTITY CASCADE;

-- 2) الخزنة: حركات، عدّ نقدية، إغلاق/فتح ورديات، مصروفات كاشير، الورديات
-- إن فشل السطر الخاص بـ CashierExpense (الجدول غير موجود) احذفه وشغّل الباقي
TRUNCATE TABLE
  "TreasuryTransaction",
  "CashCount",
  "CashierExpense",
  "ShiftClosing",
  "ShiftOpening",
  "Shift"
RESTART IDENTITY CASCADE;

-- 3) إعدادات تقسيم الخزنة اليومية (إن وُجدت)
TRUNCATE TABLE "DailySafeSplitSetting" RESTART IDENTITY CASCADE;

-- 4) إعادة تعيين أرقام الطلبات والورديات
DELETE FROM "Sequence" WHERE code IN ('ORDER', 'SHIFT');

COMMIT;

-- تحقق سريع (اختياري):
-- SELECT COUNT(*) FROM "Order";
-- SELECT COUNT(*) FROM "Shift";
-- SELECT COUNT(*) FROM "TreasuryTransaction";
