-- CreateEnum
CREATE TYPE "SafeType" AS ENUM ('PROFITS', 'EXPENSES');

-- AlterTable
ALTER TABLE "TreasuryTransaction" ADD COLUMN "safeType" "SafeType" NOT NULL DEFAULT 'EXPENSES';

-- CreateTable
CREATE TABLE "DailySafeSplitSetting" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "expensesPercentage" DECIMAL(5,2) NOT NULL DEFAULT 50,
    "profitsPercentage" DECIMAL(5,2) NOT NULL DEFAULT 50,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailySafeSplitSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailySafeSplitSetting_branchId_dateKey_key" ON "DailySafeSplitSetting"("branchId", "dateKey");

-- CreateIndex
CREATE INDEX "DailySafeSplitSetting_branchId_dateKey_idx" ON "DailySafeSplitSetting"("branchId", "dateKey");

-- CreateIndex
CREATE INDEX "TreasuryTransaction_branchId_safeType_occurredAt_idx" ON "TreasuryTransaction"("branchId", "safeType", "occurredAt");

-- AddForeignKey
ALTER TABLE "DailySafeSplitSetting" ADD CONSTRAINT "DailySafeSplitSetting_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailySafeSplitSetting" ADD CONSTRAINT "DailySafeSplitSetting_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
