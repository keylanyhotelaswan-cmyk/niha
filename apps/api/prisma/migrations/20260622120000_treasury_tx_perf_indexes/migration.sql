-- Improve treasury workspace query performance
CREATE INDEX IF NOT EXISTS "TreasuryTransaction_branchId_approvalStatus_idx"
  ON "TreasuryTransaction" ("branchId", "approvalStatus");

CREATE INDEX IF NOT EXISTS "TreasuryTransaction_shiftId_idx"
  ON "TreasuryTransaction" ("shiftId");

CREATE INDEX IF NOT EXISTS "TreasuryTransaction_branchId_transactionType_occurredAt_idx"
  ON "TreasuryTransaction" ("branchId", "transactionType", "occurredAt");
