-- CreateTable
CREATE TABLE "ProductDailyPlan" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "plannedQuantity" INTEGER NOT NULL,
    "note" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductDailyPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductDailyPlan_branchId_dateKey_idx" ON "ProductDailyPlan"("branchId", "dateKey");

-- CreateIndex
CREATE UNIQUE INDEX "ProductDailyPlan_branchId_productId_dateKey_key" ON "ProductDailyPlan"("branchId", "productId", "dateKey");

-- AddForeignKey
ALTER TABLE "ProductDailyPlan" ADD CONSTRAINT "ProductDailyPlan_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductDailyPlan" ADD CONSTRAINT "ProductDailyPlan_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductDailyPlan" ADD CONSTRAINT "ProductDailyPlan_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
