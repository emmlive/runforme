-- RUNFORME Smart Handoff additive domain.
-- Stores handoff requirements and eligibility state only.
-- Never stores student ID numbers, government ID numbers,
-- credential images, passwords, barcodes, or similar secrets.

ALTER TABLE "Run"
    ADD COLUMN "handoffRequirement" TEXT NOT NULL DEFAULT 'standard',
    ADD COLUMN "identityRequirement" TEXT NOT NULL DEFAULT 'none',
    ADD COLUMN "handoffEligibility" TEXT NOT NULL DEFAULT 'eligible',
    ADD COLUMN "handoffConfirmed" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "handoffConfirmedAt" TIMESTAMP(3),
    ADD COLUMN "handoffInstructions" TEXT;