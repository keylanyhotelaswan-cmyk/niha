-- CreateIndex
CREATE INDEX "Order_branchId_status_closedAt_idx" ON "Order"("branchId", "status", "closedAt");
