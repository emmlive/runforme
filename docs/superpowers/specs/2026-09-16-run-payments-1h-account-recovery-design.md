# RUN-PAYMENTS-1H Task 2 — Account Recovery Design

Date: 2026-09-16
Status: Approved design
Base commit: `aba263cf6274ae003ffc5917bb2c456cbd814f73`

## 1. Purpose

Add secure self-service password recovery to RUNFORME while keeping external email delivery disabled in this phase.

The complete reset-token, password-reset, session-revocation, frontend recovery, and testing architecture will be implemented now. Email delivery remains behind an inert adapter and will be activated only in a separate future phase.

## 2. Approved Architecture

- Add secure single-use password reset tokens.
- Persist only cryptographic token hashes.
- Add user `sessionVersion` for immediate JWT revocation.
- Invalidate all existing sessions after a successful password reset.
- Intentionally reject legacy JWTs that do not contain `sessionVersion`.
- Use one canonical password validator for registration and reset.
- Add Forgot Password and Reset Password frontend screens.
- Do not add React Router solely for recovery.
- Keep production recovery email delivery disabled.
- Do not create production reset-token records while delivery is disabled.

## 3. Canonical Password Policy

The backend owns one password validation rule reused by registration and password reset:

- minimum 12 characters;
- maximum 128 characters;
- no mandatory uppercase rule;
- no mandatory lowercase rule;
- no mandatory number rule;
- no mandatory symbol rule.

Frontend validation may mirror this policy for usability, but the backend remains authoritative.

## 4. User Session Version

Add to the Prisma `User` model:

```prisma
sessionVersion Int @default(0)
```

Every newly issued login JWT contains the current `sessionVersion`.

After JWT signature verification, authentication middleware loads the current user and requires the JWT version to exactly equal the stored user version.

A successful password reset increments `sessionVersion`, immediately invalidating every previously issued JWT.

Legacy JWTs without `sessionVersion` fail closed after rollout. Users will sign in again once.

## 5. Password Reset Token Model

Add a dedicated `PasswordResetToken` model with:

- unique token hash;
- user relation;
- expiration timestamp;
- consumed timestamp;
- revoked timestamp;
- creation timestamp;
- user and expiry indexes.

Conceptual shape:

```prisma
model PasswordResetToken {
  id         Int       @id @default(autoincrement())
  userId     Int
  tokenHash  String    @unique
  expiresAt  DateTime
  consumedAt DateTime?
  revokedAt  DateTime?
  createdAt  DateTime  @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expiresAt])
}
```

## 6. Token Security

Reset tokens use:

- Node `crypto.randomBytes(32)`;
- URL-safe encoding;
- SHA-256 for persisted token hashes;
- 30-minute expiration;
- single-use semantics.

The raw token must never be persisted or logged.

A token is invalid if it is unknown, expired, consumed, or revoked.

Public reset responses must not distinguish among those failure reasons.

## 7. Recovery Delivery Boundary

Introduce a small injectable recovery-delivery interface with two responsibilities:

- report whether delivery is enabled;
- deliver a reset URL when enabled.

The default production adapter is disabled and performs no external operation.

When delivery is disabled:

- forgot-password still returns the neutral public response;
- no raw reset token is generated;
- no reset-token row is created;
- no recovery database mutation occurs;
- no email provider call occurs.

Tests and development may inject an enabled in-memory fake adapter that captures the reset URL without sending external email.

## 8. Forgot Password Endpoint

Endpoint:

`POST /api/auth/forgot-password`

Request:

```json
{
  "email": "user@example.com"
}
```

The public response is identical whether the email exists or not:

> If an account exists for that email and recovery is available, instructions will be sent.

This prevents account enumeration.

When delivery is enabled and a user exists, the backend:

1. validates and normalizes the email;
2. generates 32 random bytes;
3. creates a URL-safe raw token;
4. hashes it with SHA-256;
5. revokes older unused tokens for the user;
6. stores only the hash with a 30-minute expiration;
7. constructs the reset URL;
8. hands the URL to the delivery adapter;
9. returns the same neutral response.

The raw token is never returned in the API response.

## 9. Reset Password Endpoint

Endpoint:

`POST /api/auth/reset-password`

Request:

```json
{
  "token": "<raw reset token>",
  "newPassword": "<new password>"
}
```

The backend:

1. validates required input;
2. enforces the canonical 12-128 character password policy;
3. SHA-256 hashes the supplied token;
4. locates the matching token record;
5. verifies active, unused, unrevoked, unexpired state;
6. bcrypt-hashes the new password;
7. completes the security transition atomically.

The successful transaction must:

- update the password hash;
- increment `sessionVersion`;
- mark the used token consumed;
- revoke all other active reset tokens for that user.

Invalid token states return one generic error:

`Invalid or expired reset link`

## 10. Concurrent Reset Safety

Token consumption must fail closed under concurrent requests.

Exactly one request may transition a reset token from active to consumed.

A competing request must fail without changing the password or incrementing the session version.

Implementation must use guarded transactional state rather than a read-then-unconditionally-write sequence.

## 11. Login JWT Contract

Successful login signs:

```json
{
  "userId": "<id>",
  "role": "<role>",
  "sessionVersion": "<current version>"
}
```

The existing seven-day JWT lifetime may remain unchanged.

## 12. Authentication Middleware

After cryptographic verification, middleware loads minimal current user state:

- id;
- role;
- sessionVersion.

The request is authorized only when:

- the user still exists;
- the JWT contains `sessionVersion`;
- the JWT version equals the database version;
- the current role remains valid.

Missing or stale versions return unauthorized.

## 13. Frontend Navigation

RUNFORME does not currently require a routing library.

This phase will not introduce React Router solely for recovery.

`App.jsx` will recognize recovery paths before rendering the normal authenticated shell:

- `/forgot-password`
- `/reset-password?token=<raw-token>`

## 14. Login UX

The login page adds a `Forgot password?` control below the password field.

It navigates to `/forgot-password`.

## 15. Forgot Password UX

The page includes:

- email input;
- submit action;
- loading state;
- neutral completion state;
- link back to Login.

It must not reveal:

- whether the email exists;
- whether delivery is enabled;
- whether a token was created.

## 16. Reset Password UX

The reset page reads the raw token from the URL query string.

It includes:

- new password;
- confirm password;
- 12-128 character guidance;
- mismatch validation;
- loading state;
- generic invalid-link handling;
- success state.

Success copy:

> Password reset successfully. Please sign in again.

The raw token must not be written to localStorage, sessionStorage, console logs, or analytics.

## 17. Stale Session UX

When an existing JWT is rejected because `sessionVersion` is missing or stale, the frontend must:

- clear the local token;
- clear authenticated user state;
- return the user to Login;
- avoid repeated unauthorized-request loops.

The implementation should use the smallest reusable mechanism compatible with the current frontend architecture.

## 18. Migration

The migration is additive:

- add `User.sessionVersion` with default `0`;
- create `PasswordResetToken`;
- create required relations and indexes.

Existing password hashes are unchanged.

The schema change must remain compatible with the currently deployed pre-feature application until the application rollout occurs.

## 19. Security Requirements

- cryptographically secure tokens;
- persisted hashes only;
- no password logging;
- no raw-token logging;
- no account enumeration;
- short token lifetime;
- single-use reset;
- old-token revocation;
- immediate session invalidation after successful reset;
- backend-authoritative password policy;
- disabled external delivery until separately activated.

## 20. Testing

Required test coverage includes:

- 11-character password rejected;
- 12-character password accepted;
- 128-character password accepted;
- 129-character password rejected;
- registration and reset share the same validator;
- SHA-256 token hash persistence;
- 30-minute expiration;
- old-token revocation;
- consumed-token rejection;
- revoked-token rejection;
- unknown-token rejection;
- concurrent double-consumption allows one success only;
- enumeration-safe forgot-password responses;
- disabled adapter creates no token;
- disabled adapter performs no delivery;
- fake adapter receives reset URL;
- successful reset changes bcrypt password hash;
- successful reset consumes token;
- successful reset revokes sibling tokens;
- successful reset increments `sessionVersion`;
- current-version JWT accepted;
- stale-version JWT rejected;
- legacy JWT rejected;
- nonexistent-user JWT rejected;
- login shows Forgot Password;
- recovery paths render outside authenticated shell;
- raw token is not persisted client-side;
- stale-session UX clears local authentication.

## 21. Verification Boundaries

Engineering verification uses only local or synthetic recovery flows.

This phase does not perform:

- production password reset;
- production recovery-token creation;
- external recovery email;
- production email-provider activation.

## 22. Deployment Sequence

Implementation rollout is gated:

1. schema and migration implementation;
2. backend reset-token service and delivery boundary;
3. session-version JWT implementation;
4. frontend recovery UX;
5. full local synthetic lifecycle verification;
6. migration and compatibility review;
7. normal PR review and merge;
8. separately authorized production migration;
9. controlled application rollout;
10. production health/login verification without creating a production reset token.

## 23. Future Email Provider Phase

External email delivery is a separate future phase.

That phase will define:

- provider choice;
- sender/domain configuration;
- provider secret handling;
- reset-email template;
- reset URL origin;
- retry/failure behavior;
- abuse controls and rate limiting;
- production activation verification.

The recovery service contract defined here should not require redesign when a provider is connected.

## 24. Acceptance Criteria

Task 2 implementation is complete only when:

- `sessionVersion` is implemented;
- reset-token storage is implemented;
- the canonical password policy is shared;
- forgot-password is enumeration-safe;
- disabled production delivery creates no recovery credential;
- fake delivery supports complete non-production lifecycle tests;
- raw reset tokens are never persisted or logged;
- reset tokens are single use and time limited;
- concurrent reuse fails closed;
- successful reset invalidates all prior JWT sessions;
- legacy JWTs fail closed;
- frontend recovery works without an unnecessary router dependency;
- stale sessions return cleanly to Login;
- all approved tests and builds pass;
- no external email provider is activated by this phase.
