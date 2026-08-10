# PolicyWallet — Canonical Business Event Architecture

**Status:** **implemented** (2026-08-10). Migration `20260810120000_business_events`
applied to dev, **not to prod**.

| Spec section | Shipped as |
|---|---|
| §2 envelope | `BusinessEvent` — subject/actor, occurredAt/recordedAt, correlation/causation, idempotency, sequence, isReplay |
| §3 outbox | `lib/events/publish.ts` + `dispatcher.ts`; `BusinessEventDelivery` per subscriber |
| §4 subscriber contract | `decision_engine` subscriber; at-least-once with per-delivery retry and dead-letter |
| §5 fact vs derived | `EventKind` on every catalog entry, enforced by test |
| §6 ordering | per-aggregate `sequence`; no global ordering |
| §7 policy classes | folded into the decision rules and the notification registry |
| §8 catalog | `lib/events/catalog.ts` — 27 events live, claims declared `planned` |
| §9 extensibility | additive payloads, versioned, replay-guarded |
| §10 migration | steps 1–6 done; step 7 (webhook subscriber) not started |

**Not built:** external webhook subscriber, event replay/backfill tooling,
`advisor.unlinked` publisher (the termination paths must be unified first).
**Companion:** [event-architecture-audit-2026-08.md](../audits/event-architecture-audit-2026-08.md) — the audit this answers.

---

## 0. The one rule

> **A business event is a fact that happened in the insurance domain, stated in
> the past tense, that would still be true if PolicyWallet had no notifications,
> no AI and no advisors.**

Everything else — a notification, a recommendation, an advisor task, a score
recomputation, an audit row, an analytics counter — is a **consumer's reaction**
to that fact. Producers never know their consumers exist.

Two corollaries that decide most modelling questions:

- **If it would not be true without the feature, it is not a business event.**
  `NotificationDelivered` is a *platform* event, not a business event. Both are
  useful; they live in different namespaces and obey different rules.
- **An event per value of a field is a modelling smell.** There is no
  `ProtectionScoreImproved` *and* `ProtectionScoreDeclined` — there is
  `ProtectionScoreChanged` carrying `direction`. A consumer that cares filters;
  a consumer that does not is not forced to subscribe twice.

---

## 1. Why this exists

The audit found PolicyWallet is notification-driven: at 43 call sites the
business code composes customer-facing copy, and every *other* reaction to the
same fact is a separate direct function call at the same site. `runGapEngine` is
called from eight places, each a different business fact, and is in truth an
unnamed event handler. The consequences were three real defects, one user-visible.

This specification names the facts, so the reactions can subscribe to them.

**It does not discard the notification layer.** The registry, channels, retry,
templates and admin console all survive unchanged. They stop being the *entry
point* and become one subscriber.

---

## 2. The event envelope

Every event, business or platform, is one immutable record.

| Field | Purpose | Notes |
|---|---|---|
| `eventId` | Unique identity | UUIDv7 — time-ordered, so it sorts naturally |
| `eventName` | `aggregate.verb-past` | `policy.analysis_completed`. Never a channel or a feature name |
| `eventVersion` | Payload schema version | Starts at 1. See §9 |
| `occurredAt` | When the FACT happened | **Not** when the row was written. A life event declared today may have occurred last year |
| `recordedAt` | When we learned it | The two differ constantly in insurance |
| `aggregate` | `{ type, id }` | The thing the event is about |
| `sequence` | Per-aggregate monotonic counter | The only ordering guarantee (§6) |
| `subject.userId` | **Whose data this is** | The GDPR/DSR anchor. Erasure and export walk this |
| `actor` | `{ type: customer \| advisor \| system \| admin, id }` | Who caused it |
| `correlationId` | The whole causal chain | One upload's chain spans ~12 events |
| `causationId` | The event that directly caused this | Makes the chain a tree, not a list |
| `idempotencyKey` | Natural key of the fact | Built from the thing, never the clock |
| `payload` | The facts | Additive-only (§9) |
| `metadata` | `{ source, tenantId?, locale? }` | `tenantId` reserved now, unused today |

### 2.1 `subject` versus `actor` — the field most systems omit and insurance cannot

An advisor uploads a policy **for** a customer. `actor` is the advisor; `subject`
is the customer. Collapsing them breaks three things at once: the DSR export
would attribute the record to the wrong person, the notification would go to the
wrong party, and the GDPR access log (`ActivityLog.targetUserId`, which already
exists for exactly this) would lose the "who looked at whose data" answer.

### 2.2 `occurredAt` versus `recordedAt`

An insurance product is full of facts learned long after they happened: a
marriage declared at renewal, a policy uploaded three years into its term, a
claim registered weeks after the incident. Every date-dependent rule reads
`occurredAt`; every operational rule (retry, expiry, SLA) reads `recordedAt`.

All calendar arithmetic uses **Europe/Athens**, via the existing
`calendarDaysUntil` in `lib/policy-status.ts`. This is settled: a UTC day
boundary already caused a live "expires in 0 days" defect on a policy still in
force.

---

## 3. Transport: an outbox, not an emitter

```
       business transaction
   ┌──────────────────────────────┐
   │  write the fact              │   e.g. PolicyAnalysisRun → completed
   │  write the outbox row        │   SAME transaction — this is the point
   └──────────────────────────────┘
                 │
                 ▼  drained by cron / QStash
        ┌────────────────┐
        │  event log     │  append-only, replayable
        └────────────────┘
                 │  fan-out, one delivery row per (event, subscriber)
   ┌─────────┬───────────┬────────────┬───────────┬──────────┐
   ▼         ▼           ▼            ▼           ▼          ▼
RiskEngine  Notification AdvisorQueue Analytics  Audit    Webhook
```

**Why an outbox and not an in-process emitter.** The audit found risk
notifications riding a floating promise (`void import(...).then(...)`) on the
upload path, which a serverless function may terminate before it runs. An
in-process emitter has exactly that failure mode by construction. An outbox row
committed *with* the fact cannot be lost: either both happened or neither did.

**Reuse, do not invent.** `ProcessedWebhookEvent` plus
`claimWebhookEvent`/`markWebhookEventProcessed` already implement claim-based
exactly-once processing for Stripe. Subscriber delivery is the same problem and
should use the same mechanism.

### 3.1 Delivery semantics

**At-least-once.** Every subscriber must be idempotent — stated as a contract,
not a hope, and testable: replaying an event twice must produce the same end
state. `dedupeKey` already gives the notification bus this property.

---

## 4. Subscriber contract

| Property | Rule |
|---|---|
| Idempotent | Same event twice ⇒ same end state |
| Independent | One subscriber failing never blocks another |
| Non-authoritative | A subscriber may not veto the fact; it already happened |
| Bounded | Declares max runtime; exceeded ⇒ retried, not hung |
| Ordered per aggregate | Sees events for one aggregate in `sequence` order |
| Explicit | Declares which events it consumes; the set is the subscription registry |

**A subscriber may publish new events** — that is how derived facts arise (§5) —
but with `causationId` set, and the chain depth is capped to make cycles a
detectable error rather than an outage.

---

## 5. Fact events and derived events

The distinction that organises the whole catalog.

**Fact events** are things that happened to a customer or their portfolio.
Producers are user actions, webhooks and schedules.

**Derived events** are conclusions a computation reached. Their producer is
always a subscriber, never a controller.

```
policy.document_uploaded          (fact — the customer did something)
        └─► ai.assessment_completed          (derived — extraction concluded)
                └─► risk_profile.recalculated     (derived — assessment changed)
                        ├─► coverage_gap.opened        (derived — a risk transitioned)
                        ├─► protection_score.changed   (derived — the score moved)
                        └─► recommendation.generated   (derived — advice produced)
```

**PolicyWallet already builds this machinery and has not named it.**
`RiskProfileVersion.contextHash` fingerprints an assessment so an unchanged
recalculation writes nothing — that is *materiality detection*, the precondition
for a derived event. `diffVersions()` turns two consecutive versions into
`RiskTransition[]` — that is a *derived event generator*. The gap is a name and a
publisher, not an algorithm.

**Rule:** a derived event is published only when the underlying computation is
**materially** different. A nightly cron over a stable book must publish nothing.
A system that emits `protection_score.changed` every night with an unchanged
number has trained everyone to ignore it by the second week.

---

## 6. Ordering, and what is deliberately not guaranteed

**Guaranteed:** per-aggregate ordering via `sequence`.
**Not guaranteed:** global ordering across aggregates.

Cross-aggregate ordering is the guarantee that quietly forces everything through
one queue and caps throughput for a benefit almost nothing needs. Where a
consumer genuinely needs an ordered pair, it reads `causationId` and follows the
chain — which is the honest expression of the dependency.

---

## 7. Policy classes

Referenced by every event rather than restated, so a change to "how we retry"
happens once. This mirrors `NO_RETRY`/`STANDARD_RETRY`/`PERSISTENT_RETRY` in the
existing notification registry.

### Retry (subscriber-side)

| Class | Policy | For |
|---|---|---|
| **R0** | No retry | Derived events that will recompute anyway |
| **R1** | 3× exponential from 15m | Normal reactions |
| **R2** | 5× exponential from 30m | Money, legal, safety |
| **R3** | R2 + dead-letter + admin alert | Cannot be silently lost |

### Escalation

| Class | Rule |
|---|---|
| **E0** | None |
| **E1** | Unread by customer after N days ⇒ advisor |
| **E2** | N consecutive delivery failures ⇒ admin |
| **E3** | Immediate admin alert |
| **E4** | Unactioned by advisor after N days ⇒ admin (accountability, not delivery) |

### Logging

| Class | Rule |
|---|---|
| **L1** | Event log only |
| **L2** | + `ActivityLog` |
| **L3** | + `ActivityLog` with `targetUserId` — **GDPR access record** |
| **L4** | + `SecurityEvent` |
| **L5** | + `ConsentAudit` — lawful-basis record |

### Analytics

| Class | Rule |
|---|---|
| **A0** | Not measured |
| **A1** | Counter |
| **A2** | Funnel step |
| **A3** | Cohort / retention |
| **A4** | Advisory-impact — protection recoverable, people reached. **Never premium or commission**, per the risk-DNA rule that a conversion-ranked queue sinks the household that needs help most |

### Standing consumers

`AUDIT` (every event) · `ANALYTICS` (per class) · `TIMELINE` (customer-visible
history) · `NOTIFY` (the existing bus) · `RISK` (gap engine) · `ADVISOR`
(advisory work queue) · `WEBHOOK` (external, §9.4).

---

## 8. The catalog

Priority: **P0** legal/financial/safety · **P1** core promise · **P2** engagement · **P3** analytics.
✅ exists today · ⚠️ partial · ❌ new. `[F]` fact · `[D]` derived.

---

### 8.1 Customer

**`customer.registered`** `[F]` P1 ✅
Producer: signup · Consumers: NOTIFY, ANALYTICS, TIMELINE, AUDIT
Business: one per identity; email uniqueness is the constraint, not the event.
Automation: start onboarding drip; create empty risk profile.
Notification: welcome, transactional. E0 · R1 · L2 · A2

**`customer.email_verified`** `[F]` P1 ✅
Producer: verification flow · Consumers: NOTIFY, ANALYTICS, AUDIT
Business: gates full access when `ENFORCE_EMAIL_VERIFICATION`.
Automation: unlock gated surfaces. E0 · R1 · L2 · A2

**`customer.profile_updated`** `[F]` P1 ⚠️
Producer: profile write paths · Consumers: **RISK**, TIMELINE, AUDIT, ANALYTICS
Business: carries a changed-fields list; only risk-relevant fields reach RISK.
Automation: recompute the risk profile.
Notification: **none to self** — telling someone what they just did is noise.
Notify the *subject* only when the *actor* differs (advisor edited it). E0 · R1 · L2/L3 · A1

**`customer.preferences_changed`** `[F]` P2 ✅
Producer: settings · Consumers: NOTIFY (channel resolution), AUDIT
Business: transactional events ignore preferences — the registry decides, not this event. E0 · R0 · L2 · A1

**`customer.became_inactive`** `[D]` P2 ✅
Producer: engagement scoring (scheduled) · Consumers: NOTIFY, **ADVISOR**, ANALYTICS
Business: inactivity is measured on *meaningful* activity, not page loads.
Automation: re-engagement ladder; surface the household to its advisor.
Notification: suppressible; ladder day 7/14/30/60. E0 · R1 · L1 · A3

**`customer.reactivated`** `[D]` P3 ❌
Producer: engagement scoring · Consumers: ANALYTICS, ADVISOR
Business: closes the inactivity episode; cancels pending ladder steps. E0 · R0 · L1 · A3

**`customer.credentials_changed`** `[F]` **P0** ✅
Producer: auth · Consumers: NOTIFY, AUDIT, SECURITY
Business: **never suppressible.** This is how an account takeover is discovered.
Notification: all channels, both old and new address on email change. E3 · **R2** · **L4** · A1

**`customer.consent_granted` / `.consent_withdrawn`** `[F]` **P0** ⚠️
Producer: consent flows (cookie, AI, terms) · Consumers: AUDIT, **AI gate**, NOTIFY
Business: consent is versioned and per-purpose; withdrawal takes effect **before**
the acknowledgement is sent. Lawful-basis record is the point.
Automation: withdrawal halts the dependent processing immediately. E0 · **R2** · **L5** · A1

**`customer.data_export_requested` / `.ready`** `[F]`/`[D]` **P0** ⚠️
Producer: DSR pipeline · Consumers: NOTIFY, AUDIT
Business: statutory clock starts at `occurredAt`. Export enumerates by
`subject.userId` — **any new personal-data store must be reachable from it.**
Escalation: **E4** if unfulfilled inside the statutory window. R2 · L3 · A1

**`customer.erasure_requested` / `.completed`** `[F]`/`[D]` **P0** ⚠️
Producer: DSR pipeline · Consumers: NOTIFY, AUDIT, all data owners
Business: the decision log records what is **deliberately retained** and why
(legal retention beats erasure, and must be stated).
Automation: cascade; confirm on completion. E4 · R2 · L3 · A1

---

### 8.2 Household

**`household.composition_changed`** `[F]` P1 ⚠️
Producer: profile/questionnaire · Consumers: **RISK**, TIMELINE, ADVISOR
Business: dependants, partner, members. The single largest driver of life-cover need.
Automation: recompute; a *new dependant* is a candidate `life_event.declared`.
Notification: none directly — the derived risk events speak. E0 · R1 · L2 · A1

**`household.asset_acquired` / `.asset_disposed`** `[F]` P1 ⚠️
Producer: profile/questionnaire · Consumers: **RISK**, ADVISOR, TIMELINE
Business: property or vehicle. Acquisition usually creates an *uninsured* window —
that window is the value.
Automation: recompute; prompt for the matching cover; motor is compulsory in Greece.
Notification: via the derived gap. E0 · R1 · L2 · A1

**`household.obligation_added` / `.cleared`** `[F]` P1 ⚠️
Producer: profile · Consumers: **RISK**, TIMELINE
Business: mortgage or loan — drives `life_debt`. Clearing one *reduces* need,
which the system must be willing to say. E0 · R1 · L2 · A1

---

### 8.3 Life Event

**`life_event.declared`** `[F]` P1 ✅
Producer: `declareLifeEvent` · Consumers: **RISK**, NOTIFY, TIMELINE, ADVISOR, AUDIT
Business: append-only — a correction is a new event superseding the old, never an
update. `occurredAt` may long predate `recordedAt`.
Automation: **full** recompute — score cache, recommendations, version. *(Today the
life-event path records a version but refreshes neither score nor recommendations,
and the dashboard reads the cache. Audit §7.1.)*
Notification: confirm receipt only. The consequence is a separate derived event —
"we recorded this" and "this changed your exposure" are different claims.
E0 · R1 · L2 · A1

**`life_event.retracted`** `[F]` P1 ❌
Producer: customer/advisor correction · Consumers: RISK, TIMELINE, AUDIT
Business: reverses the applied patch using the stored `appliedPatch` rather than
guessing the prior state. Automation: recompute. E0 · R1 · L2 · A1

**`life_event.inferred`** `[D]` P2 ❌
Producer: questionnaire/extraction inference · Consumers: RISK, NOTIFY
Business: an inference is **never** a declaration. It carries lower confidence and
must be confirmable by the customer before it drives advice.
Notification: ask, do not assert. E0 · R1 · L1 · A1

---

### 8.4 Risk Profile

**`risk_profile.recalculated`** `[D]` P1 ⚠️
Producer: **RiskEngine subscriber** (never a controller) · Consumers: SCORE, GAP, RECOMMENDATION, TIMELINE
Business: published **only when `contextHash` moves.** Carries `trigger`,
optional `lifeEventId`, the per-risk snapshot and the previous version.
Automation: the fan-out below — score cache, recommendation sync, version row.
Notification: none. This is an internal fact; its *consequences* notify.
E0 · R1 · L1 · A1

**`risk_profile.became_indeterminate`** `[D]` P1 ❌
Producer: RiskEngine · Consumers: NOTIFY, ADVISOR, UI
Business: below ~⅓ assessment coverage the score measures *what we could answer*,
not the customer's cover, and every surface must say "not enough information"
rather than show a number.
Automation: suppress score-movement notifications while indeterminate.
Notification: explain what is missing and how to fix it. E0 · R1 · L1 · A1

**`risk_profile.factor_answered`** `[F]` P3 ✅
Producer: questionnaire/profile · Consumers: ANALYTICS, RISK
Business: measures assessment coverage growth. E0 · R0 · L1 · A2

---

### 8.5 Protection Score

**`protection_score.changed`** `[D]` P2 ⚠️
Producer: RiskEngine · Consumers: NOTIFY, ADVISOR, ANALYTICS, TIMELINE
Business: `{ previous, current, delta, direction, cause }`. Published only when
`|delta| ≥ materiality` (admin-tunable, default 5). **Never** across an
indeterminate boundary — a delta against a number never shown is a movement that
never happened. `cause` comes from the causing event, not a guess.
Automation: a sustained decline over N recalculations opens advisory work.
Notification: suppressible; must state the cause. E0 · R1 · L1 · A3

**`protection_score.threshold_crossed`** `[D]` P1 ❌
Producer: RiskEngine · Consumers: NOTIFY, **ADVISOR**
Business: crossing a band (e.g. below 40) is qualitatively different from drifting
within one, and is the honest trigger for human contact.
Escalation: **E1**. R1 · L1 · A3

---

### 8.6 Coverage Gap

**`coverage_gap.opened`** `[D]` P1 ✅
Producer: RiskEngine via `diffVersions` · Consumers: NOTIFY, **ADVISOR**, RECOMMENDATION, TIMELINE
Business: a risk transitioned into an open state. **Never** raised because a
product is absent — only because an *exposure* is unmet. Carries severity,
the evidence (which node, which policy) and the causing event.
Automation: generate a recommendation; **critical severity creates advisor work**
*(missing today — `userTask.create` has two call sites, neither of them this)*.
Notification: batched — one notification for a run naming up to N gaps, never one
per gap. E0 (E1 if critical and unread 7d) · R1 · L1 · A1

**`coverage_gap.closed`** `[D]` P2 ✅
Producer: RiskEngine · Consumers: NOTIFY, ADVISOR, RECOMMENDATION, TIMELINE
Business: closes the linked recommendation as `auto:gap_resolved`, never as a
user dismissal — the distinction is what lets a dismissal stay respected.
Notification: good news, in-app only. E0 · R0 · L1 · A1

**`coverage_gap.severity_changed`** `[D]` P2 ❌
Producer: RiskEngine · Consumers: ADVISOR, NOTIFY
Business: only an *increase* notifies. A decrease is recorded. E0 · R0 · L1 · A1

**`coverage_gap.acknowledged` / `.dismissed`** `[F]` P2 ⚠️
Producer: customer · Consumers: RECOMMENDATION, ADVISOR, ANALYTICS
Business: a dismissal is the clearest signal a customer ever gives. It is
**permanent for that finding** and must survive re-runs; a re-worded claim about
the same risk is a *different* finding and may be raised again. E0 · R0 · L2 · A2

---

### 8.7 Insurance Portfolio

**`portfolio.line_added` / `.line_dropped`** `[D]` P1 ⚠️
Producer: RiskEngine · Consumers: ADVISOR, ANALYTICS, NOTIFY
Business: the portfolio gained or lost a whole line of business — coarser and more
meaningful than one policy arriving. E0 · R1 · L1 · A4

**`portfolio.duplicate_coverage_detected`** `[D]` P2 ✅
Producer: RiskEngine · Consumers: NOTIFY, ADVISOR
Business: paying twice for one exposure. A saving, not a gap — the product must be
as willing to say "cancel this" as "buy that". E0 · R1 · L1 · A4

**`portfolio.review_due`** `[D]` P2 ❌
Producer: scheduler · Consumers: NOTIFY, **ADVISOR**
Business: needs a cadence policy before it is wired — annually, on renewal, or on
material change. *A review reminder on the wrong cadence trains people to ignore it.*
Escalation: E4. R1 · L1 · A3

---

### 8.8 Policy

**`policy.document_uploaded`** `[F]` P2 ⚠️
Producer: upload route · Consumers: **AI**, NOTIFY, AUDIT
Business: the document exists and is stored; extraction has not started.
Automation: enqueue extraction (QStash).
Notification: acknowledge receipt — currently silent on failure. E0 · R1 · L2 · A2

**`policy.upload_failed`** `[F]` P1 ❌
Producer: upload route · Consumers: NOTIFY, ADVISOR, ANALYTICS
Business: distinguishes a rejected file (format, size, encrypted) from a system
failure — the customer can fix the first. E2 · R1 · L2 · A2

**`policy.created`** `[F]` P1 ✅
Producer: policy service · Consumers: **RISK**, NOTIFY, ADVISOR, TIMELINE, AUDIT
Business: when the actor is an advisor, the notification must state plainly what
they can now see.
Automation: recompute. E0 · R1 · **L3** (advisor-created) · A2

**`policy.coverage_changed`** `[F]` P1 ⚠️
Producer: policy update · Consumers: **RISK**, NOTIFY, TIMELINE, AUDIT
Business: cover, dates or premium moved. A cosmetic edit is not this event.
Notification: to the *subject* when the *actor* differs. E0 · R1 · L2/L3 · A1

**`policy.deleted`** `[F]` **P0** ✅
Producer: delete path · Consumers: **RISK**, NOTIFY, AUDIT
Business: destructive, and a managing advisor can do it. The owner is always told.
Notification: transactional; **no deep link** — the record is gone. E0 · **R2** · **L3** · A1

**`policy.shared` / `.access_revoked`** `[F]` **P0** ✅/❌
Producer: sharing flow · Consumers: NOTIFY (both parties), AUDIT, ADVISOR
Business: this is another person gaining or losing sight of insurance records.
Revocation is currently **unnotified** — the customer is never told access ended.
E0 · R2 · **L3** · A1

**`policy.merge_requested` / `.merged` / `.merge_rejected`** `[F]` P2 ✅
Producer: merge service · Consumers: NOTIFY, RISK, AUDIT
Business: merging needs both uploaders' consent; never a silent overwrite.
E0 · R1 · L2 · A1

**`policy.renewal_approaching`** `[D]` P1 ✅
Producer: renewal scheduler · Consumers: NOTIFY, **ADVISOR**, OPPORTUNITY
Business: milestone ladder 90/60/30/15/7 (full ladder is a paid feature; 30 only
on the basic tier). One reminder collapses all passed milestones.
Automation: advisor task; draft an opportunity *(the opportunity step is missing)*.
Notification: expires before the milestone does — a reminder for a renewal that
has passed is worse than none. E0 · R1 · L1 · A2

**`policy.renewed`** `[F]` P1 ❌
Producer: renewal resolution · Consumers: RISK, NOTIFY, ADVISOR, ANALYTICS
Business: closes the renewal cycle and the linked advisory work. E0 · R1 · L2 · A2

**`policy.lapsed`** `[D]` **P0** ✅
Producer: renewal scheduler · Consumers: NOTIFY, **ADVISOR**, **RISK**
Business: the end date passed unrenewed. **For motor in Greece the customer may
now be driving unlawfully.** Not suppressible.
Automation: recompute risk *(missing — a lapse does not currently recompute)*;
advisor task.
Escalation: **E1** at 3 days. **R2** · L2 · A1

**`policy.extraction_flagged`** `[F]` P1 ⚠️
Producer: reviewer or confidence floor · Consumers: **ADVISOR**, NOTIFY, AI
Business: the reading could not be trusted. Today it notifies the flagging agent
and creates no queue item, so flagged extractions accumulate unowned.
Escalation: E4. R1 · L2 · A1

**`policy.review_confirmed`** `[F]` P2 ✅
Producer: reviewer · Consumers: RISK, ANALYTICS, AUDIT
Business: a human vouched for the extracted values; confidence becomes certainty
and the risk engine may rely on it. E0 · R1 · L2 · A2

---

### 8.9 AI Assessment

**`ai.assessment_requested`** `[F]` P2 ✅
Producer: analysis entry points · Consumers: AI, METERING, AUDIT
Business: blocked without AI-processing consent; consent is checked here, once.
Automation: budget check before dispatch. E0 · R1 · L2 · A2

**`ai.assessment_completed`** `[D]` P1 ✅
Producer: orchestrator · Consumers: **RISK**, NOTIFY, METERING, ADVISOR, TIMELINE
Business: carries model, provider, confidence and token cost. The payoff moment of
the product, and often minutes after the customer navigated away — the strongest
case for push.
Automation: recompute risk; bill tokens.
Notification: owner **and** initiator when they differ. E0 · R1 · L2 · A2

**`ai.assessment_failed`** `[F]` P1 ✅
Producer: orchestrator · Consumers: NOTIFY, ADVISOR, ADMIN, ANALYTICS
Business: the customer handed us a document and is owed the outcome. Silence reads
as "still working".
Automation: one automatic retry, then advisor work *(retry missing)*.
Escalation: **E2** at 3. R1 · L2 · A2

**`ai.low_confidence`** `[D]` P1 ⚠️
Producer: orchestrator · Consumers: **ADVISOR**, NOTIFY, RISK
Business: extraction succeeded but a field is below the floor. The risk engine must
degrade that risk to `needs_review` rather than treat the value as known.
E4 · R1 · L1 · A1

**`ai.provider_degraded` / `.failed_over`** `[F]` P2 ❌
Producer: provider health · Consumers: **ADMIN**, ROUTER, ANALYTICS
Business: failover currently happens silently; cost and quality change without
anyone knowing. E3 · R1 · L1 · A1

**`ai.budget_exhausted`** `[D]` P2 ⚠️
Producer: metering · Consumers: NOTIFY, GATE, ANALYTICS
Business: warn **before** the wall, not at it. E0 · R1 · L2 · A2

---

### 8.10 Questionnaire

**`questionnaire.sent`** `[F]` P1 ✅ · Producer: advisor · Consumers: NOTIFY, ADVISOR
Automation: reminder if unstarted after N days. Escalation: **E1**. R1 · L2 · A2

**`questionnaire.started`** `[F]` P3 ❌ · Consumers: ANALYTICS, ADVISOR
Business: separates "not seen" from "seen and abandoned" — different problems. E0 · R0 · L1 · A2

**`questionnaire.completed`** `[F]` P1 ✅
Producer: customer · Consumers: **RISK**, **HOUSEHOLD**, NOTIFY, ADVISOR, TIMELINE
Business: answers may *backfill* life events and household facts, but must never
overwrite a fact already given more precisely.
Automation: full recompute; notify advisor. E0 · R1 · L2 · A2

**`questionnaire.abandoned` / `.expired`** `[D]` P2 ❌
Producer: scheduler · Consumers: ADVISOR, NOTIFY, ANALYTICS
Business: partial answers are still usable and must not be discarded. E1 · R1 · L1 · A2

---

### 8.11 Recommendation

**`recommendation.generated`** `[D]` P2 ✅
Producer: RiskEngine · Consumers: NOTIFY, ADVISOR, TIMELINE, ANALYTICS
Business: derived from an **exposure**, never from a missing product. Carries the
nine required fields including `urgency` (a real deadline) separate from
`priority` (how much the loss would hurt) — *a list where everything is urgent has
no urgency in it.*
Notification: **one per run**, never one per card. E0 · R0 · L1 · A2

**`recommendation.presented`** `[F]` P3 ❌ · Consumers: ANALYTICS
Business: separates "never seen" from "seen and ignored". E0 · R0 · L1 · A2

**`recommendation.accepted`** `[F]` P2 ⚠️
Producer: customer · Consumers: **ADVISOR**, **OPPORTUNITY**, ANALYTICS, TIMELINE
Business: under IDD / Law 4583/2018 the regulated act is the **advice**, not our
analysis. Acceptance hands off to a human; the platform does not transact.
Automation: open advisory work *(missing)*. E0 · R1 · L2 · A2

**`recommendation.dismissed`** `[F]` P3 ✅
Producer: customer · Consumers: ENGINE, ADVISOR, ANALYTICS
Business: permanent for that finding; `auto:*` dismissals remain ours to reverse.
Notification: none — notifying someone about their own click is noise. E0 · R0 · L2 · A2

**`recommendation.superseded`** `[D]` P3 ❌
Producer: RiskEngine · Consumers: ANALYTICS
Business: the finding was restated; not a dismissal and not a new finding. E0 · R0 · L1 · A2

---

### 8.12 Advisor

**`advisor.linked`** `[F]` **P0** ✅
Producer: relationship activation · Consumers: NOTIFY (**both**), AUDIT, BOOK
Business: the moment another person gains sight of a customer's policies. A
relationship is **not** consent to see self-uploaded policies — visibility stays
grant-scoped. E0 · R2 · **L3** · A1

**`advisor.unlinked`** `[F]` **P0** ❌
Producer: termination · Consumers: NOTIFY (**both**), AUDIT, BOOK
Business: currently silent. The customer must be told their data is no longer
visible. Automation: revoke grants; close open advisory work. E0 · R2 · **L3** · A1

**`advisor.customer_transferred`** `[F]` P1 ✅
Consumers: NOTIFY (all three parties), AUDIT, BOOK. E0 · R2 · L3 · A1

**`advisor.message_sent`** `[F]` P1 ✅
Consumers: NOTIFY, TIMELINE. Automation: chase if unread. Escalation: **E1**. R1 · L2 · A1

**`advisor.action_assigned` / `.action_overdue`** `[F]`/`[D]` P1 ✅
Consumers: NOTIFY, ADVISOR. Escalation: **E4**. R1 · L2 · A4

**`advisor.proposal_issued` / `.accepted` / `.declined` / `.counter_offered`** `[F]` P1 ✅
Consumers: NOTIFY, OPPORTUNITY, ANALYTICS, TIMELINE
Business: a proposal is a regulated communication — content is the advisor's, not
the platform's. Escalation: E1 on unread. R1 · L2 · A4

**`advisor.opportunity_created` / `.stage_changed` / `.closed`** `[F]`/`[D]` P2 ✅
Consumers: ADVISOR, ANALYTICS (`OpportunityStageHistory` already records stages)
Business: ranked by **advisory impact** — protection recoverable, exposure open,
people reached, human-only judgement. Never by conversion likelihood. E0 · R1 · L2 · **A4**

**`advisor.document_requested` / `.document_provided`** `[F]` P1 ✅
Consumers: NOTIFY, ADVISOR. Escalation: E1. R1 · L2 · A2

**`advisor.ai_consent_requested` / `.granted`** `[F]` **P0** ✅
Consumers: NOTIFY, AUDIT, AI gate
Business: a GDPR consent request. One standing request per policy. E0 · R2 · **L5** · A2

---

### 8.13 Claim — **requires a new aggregate**

No claims model exists: no table, no thread category, nothing that could produce
these. They are specified so the shape is agreed, and marked ❌ throughout.
*Inventing an emitter for an unreachable state would be worse than the gap.*

Prerequisite: a `Claim` aggregate — `{ policyId, subjectUserId, incidentAt,
registeredAt, status, amountClaimed, amountSettled, insurerReference }`.

**`claim.registered`** `[F]` **P0** ❌
Producer: customer or advisor · Consumers: NOTIFY, **ADVISOR**, RISK, TIMELINE, AUDIT
Business: `incidentAt` ≠ `registeredAt`, often by weeks — every deadline runs from
the incident. A claim is the moment insurance stops being theoretical, and the
single highest-stakes interaction in the product.
Automation: advisor task immediately; surface the policy's claim terms.
Escalation: **E3**. **R3** · L2 · A1

**`claim.status_changed`** `[F]` **P0** ❌
Consumers: NOTIFY, ADVISOR, TIMELINE, ANALYTICS
Business: carries `{ from, to, reason }`. A rejection must carry its reason —
"rejected" without one is the worst notification an insurance product can send.
Escalation: E1. **R3** · L2 · A1

**`claim.document_added`** `[F]` P1 ❌ · Consumers: NOTIFY, ADVISOR. E0 · R2 · L2 · A1

**`claim.settled`** `[F]` **P0** ❌
Consumers: NOTIFY, **RISK**, ADVISOR, ANALYTICS
Business: settlement is the ground truth for whether cover was adequate — the only
real feedback the risk engine ever gets, and the seed of the prediction model the
architecture has a seam for but no data for. E0 · **R3** · L2 · **A4**

**`claim.rejected` / `.withdrawn` / `.reopened`** `[F]` P0/P1 ❌
Consumers: NOTIFY, ADVISOR, RISK, TIMELINE. E1 · R3 · L2 · A1

---

### 8.14 Subscription & Payment

**`subscription.started` / `.upgraded` / `.downgraded`** `[F]` P1 ✅
Producer: Stripe lifecycle · Consumers: NOTIFY, ENTITLEMENTS, ANALYTICS, AUDIT
Business: entitlements change at the event, not at the next page load. E0 · R2 · L2 · A2

**`subscription.renewing_soon`** `[D]` P1 ❌
Producer: scheduler · Consumers: NOTIFY
Business: **the customer is forewarned before being charged.** Only failure is
notified today; the upcoming charge never is. E0 · R1 · L1 · A2

**`subscription.expired`** `[F]` **P0** ✅
Consumers: NOTIFY, ENTITLEMENTS, ANALYTICS
Business: state plainly that policies and data remain. E0 · R2 · L2 · A2

**`subscription.paused_for_dunning`** `[D]` **P0** ⚠️
Consumers: NOTIFY, ENTITLEMENTS, **ADMIN**
Business: features are paused, not lost. E2 · R2 · L2 · A2

**`payment.failed`** `[F]` **P0** ✅
Producer: Stripe webhook · Consumers: NOTIFY, ENTITLEMENTS, **DUNNING**, ADMIN, AUDIT
Business: not suppressible. Idempotent on the Stripe event id.
Automation: **dunning ladder day 1/3/7, then downgrade with notice** *(today: one
notification, no ladder)*.
Escalation: **E2** at 3. **R2** · L2 · A2

**`payment.succeeded`** `[F]` P1 ✅ · Consumers: NOTIFY, ENTITLEMENTS, ANALYTICS
Business: restores access; closes any dunning episode. E0 · R2 · L2 · A2

**`payment.method_expiring`** `[D]` P1 ❌
Producer: scheduler · Consumers: NOTIFY
Business: prevents the failure rather than reporting it. E0 · R1 · L1 · A2

**`payment.refunded`** `[F]` P1 ❌ · Consumers: NOTIFY, ENTITLEMENTS, AUDIT. E0 · R2 · L2 · A1

**`payment.credits_granted` / `.credits_exhausted`** `[F]`/`[D]` P2 ✅/⚠️
Consumers: NOTIFY, GATE, ANALYTICS. E0 · R1 · L2 · A2

---

### 8.15 Platform events (not business events)

Namespaced separately because they are about **the system**, not the domain.
They may not drive domain automation — that inversion is how a delivery failure
would come to change a customer's risk profile.

`notification.queued` · `.delivered` · `.failed` · `.skipped` (with reason) ·
`.read` · `.expired` · `.escalated` · `device.registered` / `.removed` ·
`admin.rule_changed` · `admin.template_changed` · `admin.setting_changed` ·
`admin.acted_on_account` (**L3** — GDPR access record) · `job.started` /
`.completed` / `.failed`.

All: E0/E2 · R0/R1 · L1/L2 · A1.

---

## 9. Designing for extensibility

### 9.1 Payload evolution — additive only

Within a major `eventVersion`, fields may be **added**; never removed, renamed or
narrowed. Consumers ignore unknown fields. A breaking change is a new
`eventVersion` with an **upcaster** from the previous — so replay of a
two-year-old event still works, which is the property that makes an event log
worth keeping.

### 9.2 Adding an event

1. Declare it in the schema registry (name, version, payload, aggregate, priority, classes).
2. Publish it. **No consumer required** — an event with no subscribers is valid and normal.
3. Subscribe when a reaction is wanted.

The registry is CI-enforced, exactly as the notification registry is today:
unknown event published ⇒ fail; declared-live-with-no-producer ⇒ fail. The
existing guard test is the template.

### 9.3 Adding a consumer — the whole point

One subscription row. **No producer changes.** This is the property the current
architecture lacks and the reason `runGapEngine` is hand-wired at eight sites.

### 9.4 External consumers

`WEBHOOK` is a subscriber like any other, with per-tenant filters, HMAC-signed
delivery and its own retry (R2) and dead-letter. **Partner integrations become a
subscription, not an integration project.** The event names are the public
contract — which is why they are domain language, not internal function names.

### 9.5 Deprecating an event

Announce → dual-emit old and new for one release cycle → remove producers →
remove the declaration. The registry carries `deprecatedAt` and `supersededBy`;
a deprecated event still replays.

### 9.6 Replay and backfill

The log is append-only, so a new consumer can be **backfilled** by replaying from
a point in time. Two guards make that safe: idempotent subscribers (§4), and
`isReplay` on the envelope so NOTIFY can refuse to send. *Replaying two years of
events must never email two years of notifications.*

### 9.7 Multi-tenancy

`metadata.tenantId` is reserved now and unused. The `Tenant` and
`TenantMembership` models already exist; carrying the field from day one costs
nothing and avoids a migration across an append-only log later.

### 9.8 Worked example — adding Claims

The value of the model is that adding the largest missing entity in the product
touches nothing that exists:

1. Add the `Claim` aggregate.
2. Declare the seven `claim.*` events (§8.13).
3. Publish them from the claim service.
4. NOTIFY, ADVISOR, TIMELINE, AUDIT and ANALYTICS pick them up **by
   subscription** — five capabilities with no change to any of them.
5. `RiskEngine` subscribes to `claim.settled` — the ground-truth feedback loop
   that the prediction seam has been waiting for data to fill.

No existing producer is edited. That is the test of whether this architecture is
real.

---

## 10. Migration from where we are

Each step is independently shippable and reversible.

| # | Step | Risk |
|---|---|---|
| 1 | Fix the two audit defects first — await the version write; reconcile the life-event path | None. These are bugs today |
| 2 | Add the outbox + schema registry + `publish()`. No consumers | None. Nothing reads it |
| 3 | Dual-write at the 8 `runGapEngine` sites | None. Both paths run |
| 4 | Move the engine behind `RiskEngineSubscriber`; delete the direct calls | Medium — the cutover |
| 5 | NOTIFY becomes a subscriber; callers pass **payloads**, templates supply copy | Medium. Templates already exist |
| 6 | `AdvisorQueueSubscriber` — first new capability | Low. Purely additive |
| 7 | Analytics + Webhook subscribers | Low |

**Step 1 is not optional and not sequenced away.** Building an event architecture
on top of two known live defects would encode them.

---

## 11. What this deliberately does not do

- **No event sourcing.** The log is a record of facts, not the system of record.
  Prisma models stay authoritative. Rebuilding customer state from an event log is
  a far larger commitment than this problem needs.
- **No global ordering** (§6).
- **No synchronous consumers.** A consumer can never block or veto a fact.
- **No business logic in platform events** (§8.15).
- **No invented aggregates.** Claims are specified and marked absent rather than
  stubbed — the same discipline that kept `claim_opened` `planned` in the
  notification registry instead of shipping an emitter nothing could reach.

## 12. See also

- [notification-automation.md](notification-automation.md) — the channel-agnostic
  bus every notification action routes through, and the generated trigger matrix.
- [risk-review.md](risk-review.md) — which of these events are worth **stopping a
  human for**. Most events recalculate silently; a review is the rare checkpoint,
  and that document is where the 20 review triggers are decided.
