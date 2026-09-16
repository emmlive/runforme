# RUN-PAYMENTS-1H Account Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build secure password recovery with hashed single-use reset tokens, JWT session invalidation, inert production delivery, and complete frontend recovery UX.

**Architecture:** Add additive Prisma recovery state, focused backend services for password policy/token lifecycle/delivery, session-version JWT enforcement, and lightweight pathname-based recovery screens. Production delivery remains disabled and cannot create reset credentials; tests use an injected in-memory delivery adapter.

**Tech Stack:** Node.js, Express 4, Prisma 6/PostgreSQL, bcrypt 6, jsonwebtoken 9, Node crypto, React 19, Axios, Vite 7, node:test.

**Spec:** `docs/superpowers/specs/2026-09-16-run-payments-1h-account-recovery-design.md`

## Global Constraints

- Password policy is exactly 12-128 characters with no composition requirements.
- Reset token entropy is exactly 32 random bytes.
- Persist only SHA-256 reset-token hashes.
- Reset tokens expire after 30 minutes.
- Reset tokens are single use.
- Forgot-password responses must not reveal account existence.
- Disabled production delivery must create no reset token and perform no recovery mutation.
- Successful reset increments `User.sessionVersion` and invalidates all prior JWTs.
- Legacy JWTs without `sessionVersion` fail closed.
- No raw reset token or password may be logged.
- No external email provider is activated in this plan.
- No production password reset is used for engineering verification.
- Production migration execution requires a separate explicit authorization gate.

---

## Planned File Structure

### Backend

- Modify `backend/prisma/schema.prisma` — session version + reset-token relation/model.
- Create `backend/prisma/migrations/20260916_account_recovery_session_version/migration.sql` — additive SQL only.
- Create `backend/src/services/passwordPolicy.js` — canonical password validator.
- Create `backend/src/services/recoveryDelivery.js` — disabled adapter + adapter contract.
- Create `backend/src/services/passwordRecovery.js` — token generation/hash/issue/consume lifecycle.
- Create `backend/src/routes/auth.js` — register/login/forgot/reset auth HTTP boundary.
- Modify `backend/src/app.js` — mount auth router and remove duplicate inline auth handlers.
- Modify `backend/src/middleware/auth.js` — sessionVersion database verification.
- Create focused `*.test.js` files beside services/routes/middleware contracts.

### Frontend

- Modify `frontend/src/Login.jsx` — Forgot password navigation.
- Create `frontend/src/ForgotPassword.jsx` — neutral request UX.
- Create `frontend/src/ResetPassword.jsx` — token-based password reset UX.
- Create `frontend/src/lib/authSession.js` — reusable authenticated-401 cleanup behavior.
- Modify `frontend/src/App.jsx` — recovery pathname selection and stale-session handling hookup.
- Create focused frontend contract tests using `node:test`.

---

### Task 1: Additive Prisma recovery schema and migration contract

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/20260916_account_recovery_session_version/migration.sql`
- Create: `backend/src/account-recovery-schema-contract.test.js`

**Interfaces:**
- Produces `User.sessionVersion Int @default(0)`.
- Produces `PasswordResetToken` with `tokenHash`, `expiresAt`, `consumedAt`, `revokedAt`, and `userId` relation.

- [ ] **Step 1: Write RED schema contract tests**

Test exact schema signals: `sessionVersion`, unique `tokenHash`, user relation with cascade delete, user index, expiry index, nullable consumed/revoked timestamps.

- [ ] **Step 2: Run RED test**

Run: `node --test src/account-recovery-schema-contract.test.js` from `backend`.
Expected: FAIL because recovery schema is absent.

- [ ] **Step 3: Add minimal Prisma schema changes**

Add `sessionVersion Int @default(0)` and `passwordResetTokens PasswordResetToken[]` to `User`. Add the approved `PasswordResetToken` model.

- [ ] **Step 4: Add additive migration SQL**

SQL must only add the session-version column/table/indexes/foreign key. It must not update existing password hashes or delete data.

- [ ] **Step 5: Validate without applying migration**

Run: `npx prisma validate`.
Run the schema contract test again.
Expected: PASS.

- [ ] **Step 6: Commit Task 1**

Commit message: `Add account recovery schema contract`.

---

### Task 2: Canonical password policy

**Files:**
- Create: `backend/src/services/passwordPolicy.js`
- Create: `backend/src/services/passwordPolicy.test.js`

**Interfaces:**
- Produces `validatePassword(password)` returning `{ valid, error }`.
- Policy: string length 12 through 128 inclusive.

- [ ] **Step 1: Write RED boundary tests**

Cover 11 rejected, 12 accepted, 128 accepted, 129 rejected, non-string rejected.

- [ ] **Step 2: Run RED test**

Run: `node --test src/services/passwordPolicy.test.js`.

- [ ] **Step 3: Implement minimal validator**

No composition rules. Use stable generic error copy suitable for register/reset API reuse.

- [ ] **Step 4: Run GREEN test**

Expected: all password-policy tests PASS.

- [ ] **Step 5: Commit Task 2**

Commit message: `Add canonical account password policy`.

---

### Task 3: Recovery delivery boundary

**Files:**
- Create: `backend/src/services/recoveryDelivery.js`
- Create: `backend/src/services/recoveryDelivery.test.js`

**Interfaces:**
- Produces disabled default adapter with `isEnabled()` returning false.
- Produces `deliverPasswordReset({ email, resetUrl, expiresAt })` that performs no external operation while disabled.
- Test code may construct an enabled in-memory fake adapter.

- [ ] **Step 1: Write RED adapter tests**

Assert default adapter is disabled, performs no provider/network action, and never logs/reset-token material.

- [ ] **Step 2: Run RED test**

Run: `node --test src/services/recoveryDelivery.test.js`.

- [ ] **Step 3: Implement inert adapter**

Do not add Resend, SendGrid, SES, SMTP, or provider secrets.

- [ ] **Step 4: Run GREEN test**

- [ ] **Step 5: Commit Task 3**

Commit message: `Add inert recovery delivery boundary`.

---

### Task 4: Password reset-token lifecycle service

**Files:**
- Create: `backend/src/services/passwordRecovery.js`
- Create: `backend/src/services/passwordRecovery.test.js`

**Interfaces:**
- Consumes injected Prisma-like persistence and recovery-delivery adapter.
- Produces secure issue/reset operations.
- Uses `crypto.randomBytes(32)` and SHA-256.
- Uses 30-minute expiry.

- [ ] **Step 1: Write RED token-generation tests**

Assert raw token is URL-safe, hash differs from raw token, persisted material contains hash only, expiry is 30 minutes.

- [ ] **Step 2: Write RED disabled-delivery test**

Assert issue request performs no token generation and no recovery mutation when adapter is disabled.

- [ ] **Step 3: Write RED lifecycle tests**

Cover old-token revocation, expired rejection, consumed rejection, revoked rejection, unknown-token rejection, sibling-token revocation after success, and sessionVersion increment.

- [ ] **Step 4: Write RED concurrency test**

Two competing consumes of one token must result in exactly one successful password/session transition.

- [ ] **Step 5: Implement minimal recovery service**

Use guarded Prisma transaction/update conditions so reset consumption cannot succeed twice.

- [ ] **Step 6: Run GREEN recovery service suite**

Run: `node --test src/services/passwordRecovery.test.js`.

- [ ] **Step 7: Commit Task 4**

Commit message: `Implement secure password recovery lifecycle`.

---

### Task 5: Dedicated auth router and enumeration-safe APIs

**Files:**
- Create: `backend/src/routes/auth.js`
- Create: `backend/src/routes/auth-contract.test.js`
- Modify: `backend/src/app.js`

**Interfaces:**
- Mount router at `/api/auth`.
- Preserve `/register` and `/login` behavior while applying canonical password policy.
- Add `/forgot-password` and `/reset-password`.

- [ ] **Step 1: Write RED source/API contract tests**

Assert register and reset import/reuse the same password validator. Assert forgot-password uses neutral response copy and does not return account existence/token. Assert reset uses generic invalid/expired copy.

- [ ] **Step 2: Run RED route contract**

Run: `node --test src/routes/auth-contract.test.js`.

- [ ] **Step 3: Extract register/login into auth router**

Preserve existing status codes and JWT lifetime except for the new session-version claim.

- [ ] **Step 4: Add forgot/reset handlers**

Route handlers delegate lifecycle logic to the recovery service rather than duplicating token/security rules.

- [ ] **Step 5: Remove duplicate inline auth handlers from `app.js` and mount router**

- [ ] **Step 6: Run route and existing backend tests**

- [ ] **Step 7: Commit Task 5**

Commit message: `Add account recovery auth routes`.

---

### Task 6: JWT session-version enforcement

**Files:**
- Modify: `backend/src/middleware/auth.js`
- Create: `backend/src/middleware/auth-session-version.test.js`
- Modify: `backend/src/routes/auth.js`

**Interfaces:**
- Login JWT includes `sessionVersion`.
- Auth middleware verifies current persisted user session version.
- Legacy/missing/stale versions return 401.

- [ ] **Step 1: Write RED middleware tests**

Cover current version accepted, stale rejected, missing legacy version rejected, nonexistent user rejected, malformed/expired JWT rejected.

- [ ] **Step 2: Run RED tests**

- [ ] **Step 3: Add login sessionVersion claim**

- [ ] **Step 4: Make auth middleware database-aware**

After JWT verification, select only current user `id`, `role`, and `sessionVersion`; fail closed on any mismatch.

- [ ] **Step 5: Run GREEN auth/session tests**

- [ ] **Step 6: Commit Task 6**

Commit message: `Enforce JWT session version`.

---

### Task 7: Forgot Password frontend UX

**Files:**
- Modify: `frontend/src/Login.jsx`
- Create: `frontend/src/ForgotPassword.jsx`
- Create: `frontend/src/run-payments-1h-forgot-password-contract.test.js`
- Modify: `frontend/src/App.jsx`

**Interfaces:**
- Login exposes `Forgot password?`.
- `/forgot-password` renders before authenticated shell selection.
- Request POSTs only email and displays neutral completion copy.

- [ ] **Step 1: Write RED frontend contract tests**

Assert login navigation, pathname handling, neutral response copy, no account-existence UI signal, and no token persistence.

- [ ] **Step 2: Run RED tests**

- [ ] **Step 3: Implement minimal Forgot Password screen**

Use existing `VITE_API_URL` pattern. Do not expose adapter enabled/disabled state.

- [ ] **Step 4: Wire pathname selection in `App.jsx`**

Do not introduce a new router dependency for this flow.

- [ ] **Step 5: Run GREEN tests and frontend build**

Run focused `node --test` files.
Run: `npm run build`.

- [ ] **Step 6: Commit Task 7**

Commit message: `Add forgot password frontend flow`.

---

### Task 8: Reset Password frontend UX

**Files:**
- Create: `frontend/src/ResetPassword.jsx`
- Create: `frontend/src/run-payments-1h-reset-password-contract.test.js`
- Modify: `frontend/src/App.jsx`

**Interfaces:**
- Reads token from `window.location.search`.
- Never writes raw token to localStorage/sessionStorage/console.
- Enforces client guidance for 12-128 characters and password confirmation.

- [ ] **Step 1: Write RED reset-screen tests**

Cover missing token, mismatch, boundary guidance, generic invalid link, success copy, and no client persistence.

- [ ] **Step 2: Run RED tests**

- [ ] **Step 3: Implement Reset Password screen**

POST `{ token, newPassword }` to `/api/auth/reset-password`.

- [ ] **Step 4: Add successful reset navigation back to Login**

- [ ] **Step 5: Run GREEN tests and build**

- [ ] **Step 6: Commit Task 8**

Commit message: `Add reset password frontend flow`.

---

### Task 9: Stale-session frontend handling

**Files:**
- Create: `frontend/src/lib/authSession.js`
- Create: `frontend/src/lib/authSession.test.js`
- Modify: `frontend/src/App.jsx`

**Interfaces:**
- Installs a minimal Axios 401 handler for authenticated sessions.
- If a stored token exists and an authenticated request returns 401, clear token/user state and return to Login.
- Login/forgot/reset unauthenticated failures must not cause redirect loops.

- [ ] **Step 1: Write RED stale-session tests**

Assert stored token is cleared exactly once on authenticated 401 and unauthenticated auth-page errors do not loop.

- [ ] **Step 2: Run RED tests**

- [ ] **Step 3: Implement reusable auth-session helper**

- [ ] **Step 4: Wire helper into app lifecycle with cleanup/eject behavior**

- [ ] **Step 5: Run GREEN tests and frontend build**

- [ ] **Step 6: Commit Task 9**

Commit message: `Handle stale authenticated sessions`.

---

### Task 10: Full synthetic recovery lifecycle verification

**Files:**
- Create focused local test harness only if required.
- No production configuration or provider changes.

- [ ] **Step 1: Run complete backend recovery suite**

Run all new schema/password/delivery/recovery/auth/session tests.

- [ ] **Step 2: Run existing backend payment/auth-sensitive regression tests**

Confirm recovery work does not change payment behavior.

- [ ] **Step 3: Run complete frontend recovery/payment contract suite**

- [ ] **Step 4: Run frontend production build**

- [ ] **Step 5: Run local browser visual verification**

Verify Login, Forgot Password, Reset Password on desktop and 390x844 mobile using only synthetic/local data.

- [ ] **Step 6: Verify secret/token hygiene**

Static scan must show no raw-token logging, password logging, provider calls, or provider secret literals.

- [ ] **Step 7: Commit any test-only closure artifact if needed**

---

### Task 11: Migration and production-readiness gate

**Files:**
- Create: `docs/audits/RUN-PAYMENTS-1H-task2-account-recovery-readiness.md`

**Interfaces:**
- Documents exact migration hash/source, application commit, rollout order, rollback boundaries, and disabled-delivery state.

- [ ] **Step 1: Verify migration is additive and unapplied**

- [ ] **Step 2: Verify production delivery adapter remains disabled**

- [ ] **Step 3: Verify no provider dependency/secret was introduced**

- [ ] **Step 4: Verify legacy-session one-time logout is explicitly recorded**

- [ ] **Step 5: Record production sequence**

Sequence must preserve separate explicit authorization for production migration execution.

- [ ] **Step 6: Commit readiness audit**

Commit message: `Record account recovery readiness`.

---

## Plan Self-Review Checklist

- [ ] Every approved spec requirement maps to a task.
- [ ] No unresolved placeholder markers remain.
- [ ] Function/file names are consistent across tasks.
- [ ] Password policy remains exactly 12-128 characters.
- [ ] Delivery-disabled path cannot create reset credentials.
- [ ] Raw tokens remain absent from persistence/logging.
- [ ] SessionVersion behavior includes legacy JWT fail-closed semantics.
- [ ] Production migration remains separately authorized.
- [ ] External email-provider activation remains out of scope.

## Execution Order

Execute Tasks 1 through 11 in order. Each task uses RED -> GREEN -> regression -> review -> commit. Do not combine tasks across review gates.

Before any production migration, deployment, email-provider activation, or production password-reset action, stop for a separate explicit authorization gate.
