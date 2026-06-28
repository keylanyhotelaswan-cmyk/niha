-- CreateEnum
CREATE TYPE "VendorLedgerEntryType" AS ENUM ('OPENING', 'INVOICE', 'PAYMENT', 'ADJUSTMENT', 'CREDIT_NOTE');

-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN "openingBalance" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "Vendor" ADD COLUMN "openingBalanceAt" TIMESTAMP(3);
ALTER TABLE "Vendor" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Vendor" ADD COLUMN "taxId" TEXT;
ALTER TABLE "Vendor" ADD COLUMN "address" TEXT;
ALTER TABLE "Vendor" ADD COLUMN "note" TEXT;

-- CreateTable
CREATE TABLE "VendorLedgerEntry" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "entryType" "VendorLedgerEntryType" NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT,
    "credit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "debit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "balanceAfter" DECIMAL(12,2) NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VendorInvoice_vendorId_invoiceDate_idx" ON "VendorInvoice"("vendorId", "invoiceDate");
CREATE INDEX "VendorPayment_vendorId_paidAt_idx" ON "VendorPayment"("vendorId", "paidAt");
CREATE INDEX "VendorLedgerEntry_vendorId_occurredAt_idx" ON "VendorLedgerEntry"("vendorId", "occurredAt");
CREATE INDEX "VendorLedgerEntry_branchId_vendorId_idx" ON "VendorLedgerEntry"("branchId", "vendorId");

-- AddForeignKey
ALTER TABLE "VendorLedgerEntry" ADD CONSTRAINT "VendorLedgerEntry_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VendorLedgerEntry" ADD CONSTRAINT "VendorLedgerEntry_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VendorLedgerEntry" ADD CONSTRAINT "VendorLedgerEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
