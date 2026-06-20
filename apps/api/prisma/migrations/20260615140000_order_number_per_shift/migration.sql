-- Order numbers reset per shift (1, 2, 3…); uniqueness is per shift, not per branch.
DROP INDEX IF EXISTS "Order_branchId_orderNumber_key";

CREATE UNIQUE INDEX "Order_shiftId_orderNumber_key" ON "Order"("shiftId", "orderNumber");
