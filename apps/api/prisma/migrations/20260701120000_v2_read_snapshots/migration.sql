-- V2 read-optimized snapshot tables

CREATE TABLE "ShiftSummarySnapshot" (
    "shiftId" TEXT NOT NULL,
    "openingFloat" DECIMAL(12,2) NOT NULL,
    "incoming" DECIMAL(12,2) NOT NULL,
    "outgoing" DECIMAL(12,2) NOT NULL,
    "expectedCash" DECIMAL(12,2) NOT NULL,
    "pendingCashInCustody" DECIMAL(12,2) NOT NULL,
    "totalSales" DECIMAL(12,2) NOT NULL,
    "expensesTotal" DECIMAL(12,2) NOT NULL,
    "ordersCount" INTEGER NOT NULL DEFAULT 0,
    "uncollectedCount" INTEGER NOT NULL DEFAULT 0,
    "uncollectedTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "suspendedCount" INTEGER NOT NULL DEFAULT 0,
    "summaryJson" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftSummarySnapshot_pkey" PRIMARY KEY ("shiftId")
);

CREATE TABLE "BranchBalanceSnapshot" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "cashBoxId" TEXT,
    "expectedCash" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "physicalCash" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "profitsSafe" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "expensesSafe" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "balanceJson" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BranchBalanceSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VendorBalanceSnapshot" (
    "vendorId" TEXT NOT NULL,
    "balance" DECIMAL(12,2) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorBalanceSnapshot_pkey" PRIMARY KEY ("vendorId")
);

CREATE UNIQUE INDEX "BranchBalanceSnapshot_branchId_cashBoxId_key" ON "BranchBalanceSnapshot"("branchId", "cashBoxId");
CREATE INDEX "BranchBalanceSnapshot_branchId_idx" ON "BranchBalanceSnapshot"("branchId");

ALTER TABLE "ShiftSummarySnapshot" ADD CONSTRAINT "ShiftSummarySnapshot_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BranchBalanceSnapshot" ADD CONSTRAINT "BranchBalanceSnapshot_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VendorBalanceSnapshot" ADD CONSTRAINT "VendorBalanceSnapshot_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
