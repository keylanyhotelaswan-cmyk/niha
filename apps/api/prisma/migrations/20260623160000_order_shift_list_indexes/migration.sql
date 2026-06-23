-- CreateIndex
CREATE INDEX "Order_shiftId_status_closedAt_idx" ON "Order"("shiftId", "status", "closedAt");

-- CreateIndex
CREATE INDEX "Order_branchId_cashBoxId_status_closedAt_idx" ON "Order"("branchId", "cashBoxId", "status", "closedAt");
