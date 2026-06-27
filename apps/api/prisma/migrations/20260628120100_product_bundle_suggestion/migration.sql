-- CreateTable
CREATE TABLE "ProductBundleSuggestion" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "productAId" TEXT NOT NULL,
    "productBId" TEXT NOT NULL,
    "productAName" TEXT NOT NULL,
    "productBName" TEXT NOT NULL,
    "pairOrders" INTEGER NOT NULL,
    "support" DECIMAL(10,6) NOT NULL,
    "confidenceAtoB" DECIMAL(10,6) NOT NULL,
    "lift" DECIMAL(10,4) NOT NULL,
    "suggestedPrice" DECIMAL(12,2),
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductBundleSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductBundleSuggestion_branchId_productAId_productBId_key" ON "ProductBundleSuggestion"("branchId", "productAId", "productBId");

-- CreateIndex
CREATE INDEX "ProductBundleSuggestion_branchId_computedAt_idx" ON "ProductBundleSuggestion"("branchId", "computedAt");

-- CreateIndex
CREATE INDEX "ProductBundleSuggestion_branchId_lift_idx" ON "ProductBundleSuggestion"("branchId", "lift");

-- AddForeignKey
ALTER TABLE "ProductBundleSuggestion" ADD CONSTRAINT "ProductBundleSuggestion_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
