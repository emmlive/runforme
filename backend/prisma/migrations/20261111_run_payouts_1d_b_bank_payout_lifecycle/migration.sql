-- RUN-PAYOUTS-1D-B: connected-account bank payout lifecycle tracking.
-- Additive only. Does not create or trigger Stripe payouts.

CREATE TABLE "RunnerBankPayout" (
  "id" SERIAL NOT NULL,
  "runnerId" INTEGER NOT NULL,
  "providerPayoutId" TEXT NOT NULL,
  "amountMinor" INTEGER NOT NULL,
  "currency" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "arrivalDate" TIMESTAMP(3),
  "failureCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "RunnerBankPayout_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RunnerBankPayout_providerPayoutId_key"
ON "RunnerBankPayout"("providerPayoutId");

CREATE INDEX "RunnerBankPayout_runnerId_idx"
ON "RunnerBankPayout"("runnerId");

CREATE INDEX "RunnerBankPayout_status_idx"
ON "RunnerBankPayout"("status");

ALTER TABLE "RunnerBankPayout"
ADD CONSTRAINT "RunnerBankPayout_runnerId_fkey"
FOREIGN KEY ("runnerId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
