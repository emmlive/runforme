# RUN-ENGAGE-1A — RUNFORME Pulse Design

Date: 2026-11-19  
Status: Design for owner approval

## Intent

RUNFORME Pulse is a lightweight, behavior-aware check-in system for runners. Its purpose is to make RUNFORME feel attentive and modern while collecting useful marketplace signals when a runner repeatedly passes on available work.

The experience must feel human, brief, and cross-generational. It should not imitate youth slang, shame runners, or imply penalties.

## Goals

- Give runners a low-friction way to explain why recent runs are not a fit.
- Help RUNFORME learn whether distance, pay, availability, task type, or temporary fatigue is the issue.
- Make the product feel responsive to the runner rather than mechanically dispatching jobs.
- Keep prompts optional and quick.
- Preserve runner trust: no hidden ranking penalty, deactivation consequence, or payout consequence from Pulse responses.
- Establish a reusable interaction pattern that can later support broader wellness-style check-ins.

## Non-goals for v1

- No AI-generated free-form coaching.
- No automatic changes to pricing, ranking, dispatch priority, or account status.
- No requester-facing Pulse prompt.
- No generic daily "How are you?" prompt in v1.
- No push notification or SMS prompt.
- No new Google Maps dependency.
- No payment or payout behavior changes.

## Trigger

V1 triggers only from runner offer behavior.

A runner becomes eligible for a Pulse prompt after 3 consecutive job offers are missed, ignored, or otherwise expire without acceptance.

An accepted run resets the consecutive-miss counter.

Explicit decline behavior may be folded into the same counter once the application has a first-class decline action. V1 should not fabricate decline semantics where none exist today.

The prompt must use a cooldown so a runner cannot be repeatedly interrupted. Proposed default: no more than one Pulse prompt in a 24-hour period per runner.

## Experience

The prompt is a compact bottom-sheet/modal surface, not a blocking full-screen flow.

Recommended headline:

**Not seeing the right runs?**

Supporting copy:

**You’ve passed on a few recent requests. What’s getting in the way?**

One-tap response choices:

- Too far away
- Pay could be better
- Busy right now
- Not my type of run
- Taking a break
- Something else

The runner can dismiss the prompt without answering.

Tone rules:

- calm
- direct
- supportive
- no slang that will age quickly
- no guilt or score language
- no references to punishment, acceptance rate, or ranking

## Interaction Behavior

- Prompt appears only when the runner is not in an active run.
- Prompt does not cover a critical action such as Accept, Arrived, receipt proof, delivery PIN, completion, or payout.
- Dismissal is respected.
- A response closes the prompt immediately.
- Acceptance of a run resets the consecutive-miss counter.
- Pulse should not show again until cooldown eligibility is restored.

## Data Model Direction

V1 should use additive, minimal persistence.

Suggested durable fields/events:

- runner user id
- trigger type
- consecutive miss count at trigger
- selected reason
- created timestamp
- dismissed/responded state

Do not store sensitive free-form personal information in v1.

If "Something else" is selected, v1 should record only the categorical value unless a later reviewed design explicitly adds optional text.

## Privacy and Trust

Pulse responses are product feedback, not enforcement signals.

V1 must not:

- alter runner ranking
- block future offers
- reduce earnings
- suspend the account
- affect payout eligibility
- expose the answer to requesters

Any future use of Pulse data for automated marketplace decisions requires a separate design and owner approval.

## Approaches Considered

### 1. Generic scheduled check-ins

Example: "How’s your day going?"

Pros:
- warm and personable
- simple to implement

Tradeoffs:
- weak operational signal
- can feel random or repetitive
- more notification fatigue

Not selected for v1.

### 2. Missed-offer feedback only

Prompt after repeated non-acceptance.

Pros:
- high relevance
- actionable data
- lower interruption rate

Tradeoffs:
- narrower emotional personality

Viable, but selected only as the foundation.

### 3. Adaptive RUNFORME Pulse

A reusable branded interaction system where v1 starts with missed-offer behavior and later expands to other contextual moments.

Pros:
- distinctive product identity
- useful marketplace intelligence
- creates a scalable engagement primitive
- supports future cross-generational human check-ins without redesigning the system

Selected approach.

## Builder Decisions

- Start with one behavior trigger: 3 consecutive non-accepted offers.
- Use one 24-hour cooldown.
- Keep the prompt optional.
- Keep v1 categorical only.
- Do not introduce ranking consequences.
- Do not introduce generic day/mood prompts yet.
- Reuse the existing RUNFORME design system and mobile-first shell.
- Add permanent contract tests for trigger count, reset behavior, cooldown, dismissal, and non-interference with active-run flows.

## Future Phases

Potential later Pulse moments:

- "Still available?" after a long online period
- "How’s your run flow feeling today?"
- post-completion satisfaction pulse
- temporary pause suggestions after repeated misses
- distance/pay preference tuning

These are explicitly outside RUN-ENGAGE-1A.

## Acceptance Criteria

RUN-ENGAGE-1A is complete when:

1. Three consecutive non-accepted offers can trigger one Pulse prompt.
2. Accepting a run resets the miss counter.
3. The prompt never appears during an active run.
4. The prompt can be dismissed.
5. A response can be recorded without affecting ranking, account status, payments, or payouts.
6. Cooldown prevents repeat prompting for 24 hours.
7. Existing runner offer, map, payout, and responsive tests remain green.
8. New Pulse contracts cover trigger, reset, cooldown, dismissal, and trust boundaries.
