# RUN-DB-RECOVERY-1I — Migration History Source Repair

Date: 2026-08-21

## Baseline

- Branch: main
- Starting HEAD: 10e3213
- Authoritative schema SHA256: 45e884d03320d6bb46326e0ca2e23d6d6904a0b2b3712b82bc426a26dfd34503
- Verified recovery baseline SHA256: 78e4b70ee4b7d05f4640a381141eb5d20f85fd851e67906dbc3ceb4ce1bd4c44

## Historical Migration

- Name: 20260212182521_init_step7
- SHA256: a1664b52191e0e94151d70dec36c78b12d26ad1986abd681172e0ec429d0a152
- Classification: incomplete historical three-table migration
- Tables represented: Offer, Run, User
- Active Prisma status after 1I: removed from active migration directory
- Preservation: docs\audits\RUN-DB-RECOVERY\historical-migrations\20260212182521_init_step7.sql

## Recovery Baseline

- Name: 20260821_recovery_baseline_current_schema
- SHA256: 78e4b70ee4b7d05f4640a381141eb5d20f85fd851e67906dbc3ceb4ce1bd4c44
- Tables: 5
- Explicit indexes: 12
- Foreign keys: 7
- Tables represented: Offer, Rating, Run, StripeWebhookEvent, User

## Recovery Decision

The historical migration does not represent the current authoritative Prisma schema and must not remain the active fresh-database baseline.

The exact full-schema artifact independently verified during RUN-DB-RECOVERY-1G and RUN-DB-RECOVERY-1H is now the sole active Prisma baseline.

The historical migration is preserved byte-for-byte outside the active Prisma migration directory for recovery/audit evidence.

## Production Boundary

RUN-DB-RECOVERY-1I performs repository source repair only.

It does NOT:

- connect to the production database;
- modify _prisma_migrations;
- execute prisma migrate resolve;
- execute prisma migrate deploy;
- create application accounts;
- change Render environment variables;
- deploy;
- commit;
- push.

## Next Gate

READY_FOR_RUN_DB_RECOVERY_1J_MIGRATION_HISTORY_SOURCE_VALIDATION