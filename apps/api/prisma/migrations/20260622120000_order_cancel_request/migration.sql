-- AlterTable
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "cancelRequestedAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "cancelRequestedById" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "cancellationReason" TEXT;
