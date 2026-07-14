# Slice: 03-prisma-receipt-proof-search.md

## backend/prisma/schema.prisma

- Pattern 'receipt': 3 match(es)
  - line 60: receiptStatus        String   @default("not_uploaded")
  - line 61: receiptImageUrl      String?
  - line 62: receiptAmount        Int?
- Pattern 'receiptProof': no matches
- Pattern 'receiptProofUrl': no matches
- Pattern 'manualReview': 1 match(es)
  - line 70: requiresManualReview Boolean  @default(false)
- Pattern 'maxRunnerSpend': 1 match(es)
  - line 57: maxRunnerSpend       Int      @default(0)
- Pattern 'Run': 29 match(es)
  - line 17: role      String   // "requester" | "runner"
  - line 25: runs            Run[]    @relation("RequesterRuns")
  - line 26: offers          Offer[]  @relation("RunnerOffers")
  - line 27: assignedRuns    Run[]    @relation("AssignedRuns")
  - line 36: RUN
  - line 38: model Run {
  - line 53: runnerPayout         Int      @default(0)
  - line 57: maxRunnerSpend       Int      @default(0)
  - line 73: /* RUNNER BINDING */
  - line 74: assignedRunnerId  Int?
  - line 75: assignedRunner    User?   @relation("AssignedRuns", fields: [assignedRunnerId], references: [id])
  - line 78: requester         User    @relation("RequesterRuns", fields: [requesterId], references: [id])
  - line 79: offers            Offer[] @relation("RunOffers")
  - line 83: @@index([assignedRunnerId])
  - line 92: runId     Int
  - line 93: runnerId  Int
  - line 98: run       Run   @relation("RunOffers", fields: [runId], references: [id])
  - line 99: runner    User  @relation("RunnerOffers", fields: [runnerId], references: [id])
  - line 101: @@index([runId])
  - line 102: @@index([runnerId])
  - line 110: runId        Int
  - line 112: runnerId     Int
  - line 117: run          Run   @relation(fields: [runId], references: [id])
  - line 119: runner       User  @relation("RatingsReceived", fields: [runnerId], references: [id])
  - line 121: @@unique([runId, requesterId])  // Prevent duplicate rating per run
  - line 122: @@index([runnerId])
  - line 123: @@index([runId])
  - line 132: runId     Int?
  - line 140: @@index([runId])

