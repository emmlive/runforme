-- RUN-ACCOUNT-CLEANUP-1A
-- Additive account lifecycle status. Existing users remain active.
ALTER TABLE "User"
ADD COLUMN "accountStatus" TEXT NOT NULL DEFAULT 'active';

CREATE INDEX "User_accountStatus_idx"
ON "User"("accountStatus");
