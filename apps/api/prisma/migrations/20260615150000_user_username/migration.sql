-- Rename email to username for login identity
ALTER TABLE "User" RENAME COLUMN "email" TO "username";

-- Convert legacy seed emails (manager@niha.local → manager)
UPDATE "User"
SET "username" = SPLIT_PART("username", '@', 1)
WHERE "username" LIKE '%@%';
