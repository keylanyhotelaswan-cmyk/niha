-- One OPEN shift per cash box (prevents race-condition duplicates)
CREATE UNIQUE INDEX IF NOT EXISTS "Shift_one_open_per_cash_box"
ON "Shift" ("cashBoxId")
WHERE status = 'OPEN';
