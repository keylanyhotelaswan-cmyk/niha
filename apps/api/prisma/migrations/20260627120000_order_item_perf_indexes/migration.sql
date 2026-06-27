-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItemNote_orderItemId_idx" ON "OrderItemNote"("orderItemId");

-- CreateIndex
CREATE INDEX "Order_shiftId_status_collectionStatus_closedAt_idx" ON "Order"("shiftId", "status", "collectionStatus", "closedAt" DESC);

-- CreateIndex
CREATE INDEX "Order_cancelRequestedAt_idx" ON "Order"("cancelRequestedAt" DESC NULLS LAST) WHERE "cancelRequestedAt" IS NOT NULL;
