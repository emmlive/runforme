-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "averageRating" DOUBLE PRECISION,
    "totalRatings" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Run" (
    "id" SERIAL NOT NULL,
    "requesterId" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "payout" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentIntentId" TEXT,
    "paymentStatus" TEXT,
    "authorizationStatus" TEXT NOT NULL DEFAULT 'not_required_dev',
    "itemBudgetEstimate" INTEGER NOT NULL DEFAULT 0,
    "runnerPayout" INTEGER NOT NULL DEFAULT 0,
    "platformFee" INTEGER NOT NULL DEFAULT 0,
    "bufferAmount" INTEGER NOT NULL DEFAULT 0,
    "holdAmount" INTEGER NOT NULL DEFAULT 0,
    "maxRunnerSpend" INTEGER NOT NULL DEFAULT 0,
    "purchaseStatus" TEXT NOT NULL DEFAULT 'not_required',
    "receiptStatus" TEXT NOT NULL DEFAULT 'not_uploaded',
    "receiptImageUrl" TEXT,
    "receiptAmount" INTEGER,
    "finalAmount" INTEGER,
    "deliveryPin" TEXT,
    "deliveryConfirmedAt" TIMESTAMP(3),
    "riskScore" INTEGER NOT NULL DEFAULT 0,
    "riskFlags" TEXT NOT NULL DEFAULT '[]',
    "requiresManualReview" BOOLEAN NOT NULL DEFAULT false,
    "payoutStatus" TEXT NOT NULL DEFAULT 'not_started',
    "assignedRunnerId" INTEGER,

    CONSTRAINT "Run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" SERIAL NOT NULL,
    "runId" INTEGER NOT NULL,
    "runnerId" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rating" (
    "id" SERIAL NOT NULL,
    "runId" INTEGER NOT NULL,
    "requesterId" INTEGER NOT NULL,
    "runnerId" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Rating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StripeWebhookEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "runId" INTEGER,
    "applied" BOOLEAN NOT NULL DEFAULT false,
    "rawEvent" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StripeWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "Run_requesterId_idx" ON "Run"("requesterId");

-- CreateIndex
CREATE INDEX "Run_assignedRunnerId_idx" ON "Run"("assignedRunnerId");

-- CreateIndex
CREATE INDEX "Run_paymentIntentId_idx" ON "Run"("paymentIntentId");

-- CreateIndex
CREATE INDEX "Offer_runId_idx" ON "Offer"("runId");

-- CreateIndex
CREATE INDEX "Offer_runnerId_idx" ON "Offer"("runnerId");

-- CreateIndex
CREATE INDEX "Rating_runnerId_idx" ON "Rating"("runnerId");

-- CreateIndex
CREATE INDEX "Rating_runId_idx" ON "Rating"("runId");

-- CreateIndex
CREATE UNIQUE INDEX "Rating_runId_requesterId_key" ON "Rating"("runId", "requesterId");

-- CreateIndex
CREATE INDEX "StripeWebhookEvent_applied_idx" ON "StripeWebhookEvent"("applied");

-- CreateIndex
CREATE INDEX "StripeWebhookEvent_runId_idx" ON "StripeWebhookEvent"("runId");

-- AddForeignKey
ALTER TABLE "Run" ADD CONSTRAINT "Run_assignedRunnerId_fkey" FOREIGN KEY ("assignedRunnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Run" ADD CONSTRAINT "Run_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_runnerId_fkey" FOREIGN KEY ("runnerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_runnerId_fkey" FOREIGN KEY ("runnerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

