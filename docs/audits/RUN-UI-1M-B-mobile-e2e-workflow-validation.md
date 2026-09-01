# RUN-UI-1M-B — Mobile End-to-End Workflow Validation

## Scope

RUN-UI-1M-B validated one complete synthetic requester-to-runner lifecycle against the isolated local RUNFORME E2E environment at a 390 x 844 viewport. Validation used only the local frontend, local backend, isolated local PostgreSQL database, synthetic requester, synthetic runner, and synthetic Run 2. Production was not accessed, and no live payment or provider action occurred.

## Environment

- Frontend: `http://127.0.0.1:5173`
- Backend: `http://localhost:5050`
- Database: `127.0.0.1:55433`, `runforme_e2e_local`
- Frontend Stripe initialization was intentionally disabled for local E2E through the validated R3C guard.

No credential values are recorded in this audit.

## Synthetic Workflow

1. The requester authenticated locally.
2. The runner authenticated locally.
3. Synthetic Run 2 was created.
4. The initial purchase-budget run remained unavailable to the runner before secure-hold placeholder authorization.
5. The requester authorized the local secure-hold placeholder.
6. The runner offer became available.
7. The runner accepted Run 2.
8. The runner marked Arrived.
9. Start was intentionally skipped because the current UI workflow does not require it.
10. The runner submitted synthetic receipt proof for $10.
11. Receipt status became uploaded.
12. Final amount became $18.
13. The requester-authorized delivery PIN was manually entered in the Runner UI without exposing it in audit or log evidence.
14. Delivery confirmation succeeded.
15. Payout status became ready for payout.
16. The runner completed Run 2.
17. Final Run status became completed.

Final nonsecret state:

```text
RUN_ID=2
STATUS=completed
ASSIGNED_RUNNER_ID=2
AUTHORIZATION_STATUS=placeholder_authorized
PAYMENT_STATUS=hold_placeholder
PURCHASE_STATUS=completed
RECEIPT_STATUS=uploaded
PAYOUT_STATUS=ready_for_payout
RECEIPT_AMOUNT=10
FINAL_AMOUNT=18
DELIVERY_CONFIRMED=True
```

## Mobile Validation

Requester manual validation at 390 x 844 confirmed:

- Home shows no active run after completion.
- One completed run appears in history.
- Request remains usable.
- My Runs shows Active 0 / History 1.
- Run 2 is clearly marked completed.
- Menu remains usable.
- Home / Request / My Runs / Menu navigation remains usable.
- No stale lifecycle action remains.
- No horizontal overflow or duplicate legacy Requester UI appears.
- Fixed navigation does not obstruct content or actions.

Runner manual validation at 390 x 844 confirmed:

- Completed Run 2 is no longer active or actionable.
- No Complete Run action remains.
- Home / Earnings / Activity / Menu remain usable.
- No delivery PIN is exposed.
- No horizontal overflow or duplicate legacy Runner UI appears.
- Fixed navigation does not obstruct content or actions.

## Gate 3A Blocker and R7B Correction

At the original Gate 3A, the fixed Runner bottom navigation partially obstructed the Arrived primary action at 390 x 844. Execution stopped before Arrived.

The bounded R7B layout correction was then implemented and regression coverage added. Gate 3A was retested successfully before lifecycle execution resumed. This records only the validated mobile behavior and does not claim a broader redesign.

## Privacy and Provider Safety

- The delivery PIN was requester-only and remained redacted from Runner API responses.
- The PIN value is intentionally absent from audit evidence.
- Receipt proof used a synthetic local image.
- No real purchase or live payment occurred.
- The secure hold remained placeholder-only.
- Stripe provider calls: 0.
- Render requests: 0.
- Google Maps requests: 0.
- External provider calls: 0.
- Production accessed: False.

## Final Database Evidence

```text
USER_COUNT=2
REQUESTER_COUNT=1
RUNNER_COUNT=1
RUN_COUNT=1
RUN_ID=2
STATUS=completed
ASSIGNED_RUNNER_ID=2
AUTHORIZATION_STATUS=placeholder_authorized
PAYMENT_STATUS=hold_placeholder
PURCHASE_STATUS=completed
RECEIPT_STATUS=uploaded
PAYOUT_STATUS=ready_for_payout
RECEIPT_AMOUNT=10
FINAL_AMOUNT=18
DELIVERY_CONFIRMED=True
```

The synthetic database objects are intentionally retained pending separately authorized cleanup.

## Result

```text
REQUESTER_MOBILE_GATE=PASS
RUNNER_MOBILE_GATE=PASS
FINAL_MOBILE_GATE_STATUS=PASS
```

Disposition:

`RUN_UI_1M_B_VALIDATED`

This audit records validation only and does not authorize deployment or production activation.
