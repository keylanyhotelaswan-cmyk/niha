-- CreateTable
CREATE TABLE "ShiftCashHandoff" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "cashBoxId" TEXT NOT NULL,
    "fromShiftId" TEXT NOT NULL,
    "fromShiftNumber" TEXT NOT NULL,
    "handedById" TEXT,
    "handedByName" TEXT,
    "cashAmount" DECIMAL(12,2) NOT NULL,
    "uncollectedCount" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "acceptedShiftId" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShiftCashHandoff_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ShiftCashHandoff_cashBoxId_status_idx" ON "ShiftCashHandoff"("cashBoxId", "status");
CREATE INDEX "ShiftCashHandoff_branchId_createdAt_idx" ON "ShiftCashHandoff"("branchId", "createdAt");
