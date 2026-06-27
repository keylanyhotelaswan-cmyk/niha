-- Snapshot مبيعات الوردية عند الإغلاق — للتقارير التاريخية (مستقل عن شاشة POS)
ALTER TABLE "ShiftClosing"
  ADD COLUMN "ordersCount" INTEGER,
  ADD COLUMN "totalSales" DECIMAL(12, 2);
