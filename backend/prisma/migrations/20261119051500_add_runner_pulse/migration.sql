CREATE TABLE "RunnerPulseState" (
  "id" SERIAL NOT NULL,
  "runnerId" INTEGER NOT NULL,
  "consecutiveMisses" INTEGER NOT NULL DEFAULT 0,
  "lastMissedRunId" INTEGER,
  "lastPromptedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "RunnerPulseState_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RunnerPulseEvent" (
  "id" SERIAL NOT NULL,
  "runnerId" INTEGER NOT NULL,
  "trigger" TEXT NOT NULL,
  "missCount" INTEGER NOT NULL,
  "runId" INTEGER,
  "dedupeKey" TEXT,
  "reason" TEXT,
  "dismissed" BOOLEAN NOT NULL DEFAULT false,
  "respondedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "RunnerPulseEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RunnerPulseState_runnerId_key"
ON "RunnerPulseState"("runnerId");

CREATE INDEX "RunnerPulseState_lastPromptedAt_idx"
ON "RunnerPulseState"("lastPromptedAt");

CREATE UNIQUE INDEX "RunnerPulseEvent_dedupeKey_key"
ON "RunnerPulseEvent"("dedupeKey");

CREATE INDEX "RunnerPulseEvent_runnerId_idx"
ON "RunnerPulseEvent"("runnerId");

CREATE INDEX "RunnerPulseEvent_createdAt_idx"
ON "RunnerPulseEvent"("createdAt");

ALTER TABLE "RunnerPulseState"
ADD CONSTRAINT "RunnerPulseState_runnerId_fkey"
FOREIGN KEY ("runnerId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RunnerPulseEvent"
ADD CONSTRAINT "RunnerPulseEvent_runnerId_fkey"
FOREIGN KEY ("runnerId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
