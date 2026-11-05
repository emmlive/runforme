-- RUN-PAYOUTS-1A: additive runner payout foundation only.
-- No live transfer execution is introduced by this migration.

ALTER TABLE "User"
ADD COLUMN "stripeConnectedAccountId" TEXT,
ADD COLUMN "payoutOnboardingStatus" TEXT NOT NULL DEFAULT 'not_started';

CREATE UNIQUE INDEX "User_stripeConnectedAccountId_key"
ON "User"("stripeConnectedAccountId");

CREATE TABLE "RunnerPayout" (
  "id" SERIAL NOT NULL,
  "runnerId" INTEGER NOT NULL,
  "runId" INTEGER NOT NULL,
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'prepared',
  "idempotencyKey" TEXT NOT NULL,
  "providerTransferId" TEXT,
  "failureCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "RunnerPayout_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RunnerPayout_runId_key"
ON "RunnerPayout"("runId");

CREATE UNIQUE INDEX "RunnerPayout_idempotencyKey_key"
ON "RunnerPayout"("idempotencyKey");

CREATE UNIQUE INDEX "RunnerPayout_providerTransferId_key"
ON "RunnerPayout"("providerTransferId");

CREATE INDEX "RunnerPayout_runnerId_idx"
ON "RunnerPayout"("runnerId");

CREATE INDEX "RunnerPayout_status_idx"
ON "RunnerPayout"("status");

ALTER TABLE "RunnerPayout"
ADD CONSTRAINT "RunnerPayout_runnerId_fkey"
FOREIGN KEY ("runnerId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RunnerPayout"
ADD CONSTRAINT "RunnerPayout_runId_fkey"
FOREIGN KEY ("runId") REFERENCES "Run"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
