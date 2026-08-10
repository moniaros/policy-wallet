# PolicyWallet — Event, Automation & Notification Architecture Audit

**Date:** 2026-08-10 · **Scope:** whole codebase · **Type:** read-only audit, no code changed

---

## 1. Verdict

**PolicyWallet is notification-driven, not event-driven.** The notification layer
was rebuilt this session and is now genuinely good — one bus, one registry, honest
delivery records, admin-managed rules. But it is a **notification** bus, not an
**event** bus, and that distinction is the whole finding.

| | Event-driven | PolicyWallet today |
|---|---|---|
| What business code publishes | a fact: `PolicyAnalysisCompleted` | a message: `emit({event, title, message})` |
| Who decides there is a notification | a consumer | **the caller** |
| Who else reacts | any number of subscribers | nobody — other reactions are separate direct calls |
| Adding a consumer | subscribe | edit every call site |

At all **43** `emit()` call sites the caller supplies the **title and body**. That
means the business code is not saying *"this happened"* — it is saying *"send this
message"*. The notification is the event. Everything else that should react to the
same fact — the risk engine, recommendations, the advisor queue, analytics, the
audit trail — is wired by a **separate direct function call at the same call site**,
and each one can be, and sometimes is, forgotten.

**There is no event bus, no publisher, no subscriber registry and no outbox
anywhere in the codebase.** (`grep` for `eventBus|publishEvent|domainEvent|outbox`
returns only a browser `CustomEvent` for cookie consent and the Web Push
`PushManager.subscribe`.)

**Severity: architectural, not urgent.** Nothing is on fire. But every new
consumer of an existing fact currently costs an edit to every producer, and the
three defects in §7–§8 are all instances of that cost being paid incorrectly.

---

## 2. What was inspected

B2C wallet & dashboard · B2B advisor surfaces (customers, opportunities, renewals,
book, action queue) · gap/risk engine · AI extraction pipeline & orchestrator ·
notification bus, registry, channels, retry · email/push/in-app · admin console ·
136 API routes · Prisma schema (80+ models) · QStash analysis queue · 13 Vercel
crons · feature gates · i18n · design-system and a11y guards.

---

## 3. The central finding, precisely

### 3.1 `runGapEngine` is an event handler wearing a function's clothes

`refreshProtectionScore()` / `runGapEngine()` is called directly from **eight**
places. Each is a *different business fact*:

| Call site | The fact that actually occurred |
|---|---|
| `policy.service.ts:277` | a policy was created |
| `policy-analysis-orchestrator.service.ts:361, 1832` | AI extraction completed |
| `policy-merge.service.ts:201` | two policy records were merged |
| `wallet/actions.ts` (delete path) | a policy was removed |
| `insights/risk-profile/actions.ts:56` | the customer updated their profile |
| `tasks/actions.ts:223` | the customer completed a task |
| `admin/policy-actions.ts:29` | an administrator edited a policy |
| `jobs/protection-score-refresh` | a scheduled re-evaluation |

Inside, it fans out to four consumers: caches the score, syncs recommendations,
records a `RiskProfileVersion`, and (since this session) emits risk notifications.

**That fan-out is the subscriber list.** It is correct and well-factored — but it
is reachable only by *calling the function*, so every producer must know it exists.
The engine is not subscribing to "the customer's risk picture may have changed"; the
producers are remembering to invoke it.

**Consequence:** a ninth write path that affects risk — and there will be one —
silently produces no score update, no recommendations, no version, no
notifications. Nothing fails. Nothing warns. The customer's dashboard is simply
stale.

### 3.2 Notifications originate from features, not from events

Representative, from `policy.service.ts`:

```ts
await emit({
  event: 'policy_analyzed',
  userId,
  title:   { el: 'Η ανάλυση ολοκληρώθηκε', en: 'Policy Analysis Complete' },
  message: { el: `Το ασφαλιστήριο ${n} αναλύθηκε…`, en: `Policy ${n} has been…` },
})
```

The policy service is composing customer-facing copy. It should be publishing
`PolicyAnalysisCompleted { policyId, ownerUserId, insurerName, policyNumber,
confidence }` and knowing nothing about notifications at all.

The symptom this produces is already visible: **`policy_analyzed` is emitted from
two places** in the same function (actor and owner), each with its own hand-written
copy, because there is no consumer that could have derived both from one fact.

### 3.3 The advisor side has no subscriber at all

`userTask.create` appears at **two** sites: the renewal cron, and a manual
advisor action. So the B2B action queue is fed by renewals and nothing else.
A coverage gap opening, an AI extraction flagged as low-confidence, a payment
failing, a quote request going unanswered — none of them create advisor work,
even though each has a customer-side notification. The advisor experience is a
read-time recomputation (`getAdvisorBook`, capped at 60 households and documented
as "fine for tens and wrong for thousands") rather than a materialised queue fed
by events.

---

## 4. Existing trigger points (inventory)

**74 declared business events** in `lib/notifications/registry.ts` — 69 live,
5 planned. Sources:

| Source | Count | Notes |
|---|---|---|
| Direct service calls → `emit()` | 43 | the notification path |
| Scheduled (Vercel cron) | 13 | all daily — Hobby-plan constraint |
| QStash queue | 1 pipeline | analysis execution only |
| Stripe webhooks | 4 event types | payment/subscription lifecycle |
| Implicit (`runGapEngine`) | 8 call sites | §3.1 — the un-named event |

**Cron inventory (all daily):**
`renewal-check 05:00` · `reap-stale-analyses 05:15` · `notification-retry 05:30` ·
`synthetic-launch-check 06:00` · `dsr-evidence-snapshot 06:30` ·
`privacy-retention 06:45` · `protection-score-refresh 07:00` ·
`collaboration-reminders 08:00` · `engagement-drip 09:00` · `weekly-digest 10:00` ·
`churn-prevention 11:00` · `perk-reminders 12:00` · `billing-reconciliation 04:00`

**Scheduler limitation:** every job is daily because the plan allows no finer
granularity. A payment failure at 09:00 therefore cannot escalate until the next
morning's sweep, and a lapsed motor policy — unlawful to drive on in Greece — is
detected up to 24 hours late. This is a plan constraint, not a code defect, but it
caps how responsive any automation can be.

---

## 5. Missing trigger points

Facts that occur today and publish nothing at all:

| Missing event | Where it happens | Why it matters |
|---|---|---|
| `DocumentUploadFailed` | upload pipeline | a customer whose upload fails is told nothing |
| `AiExtractionLowConfidence` → advisor | `extraction_flagged` notifies the *agent who flagged it*, not a queue | flagged extractions accumulate unowned |
| `PolicyCoverageChanged` | `policy.service.update` | a premium/cover change is notified only when someone *else* edits |
| `HouseholdMemberChanged` | profile writes | folded into a generic profile save |
| `AssetAcquired` / `AssetDisposed` | profile writes | the strongest risk signals after life events |
| `AdvisorRelationshipTerminated` | relationship status change | customer is never told their advisor lost access |
| `ConsentGranted` / `ConsentWithdrawn` | consent writes | GDPR Art. 7(1) record exists; no event |
| `DataExportReady` / `ErasureCompleted` | DSR pipeline | subject waits without confirmation |
| `TokenBudgetExhausted` | AI metering | customer hits a wall with no forewarning |
| `ClaimOpened` / `ClaimStatusChanged` | — | **no claims model exists**; correctly declared `planned` |
| `ProviderHealthDegraded` | `provider-health.ts` | AI failover happens silently |

---

## 6. Duplicated business logic

**Credit where due — the recurring ones are already centralised:**
`calendarDaysUntil` (Athens-correct day maths), `normalizeBranch` (LoB labels),
`plan-defaults` (pricing), `policy-status` (derived status), and — as of this
session — `isChannelSuppressed` (preference checks, previously three copies) and
`notificationActionPath` (deep links, previously three copies).

**What remains duplicated:**

| Duplication | Locations | Risk |
|---|---|---|
| **Risk-picture recalculation** | `runGapEngine` (full: score + recs + version) vs `recalculateRiskProfile` (version only) | §7.1 — divergent side-effects for the same fact |
| **Notification copy per event** | 43 call sites hand-write EL+EN strings | the same event says different things from different code paths |
| **Advisor-visibility rules** | `agent-visibility.ts` + inline checks in renewal cron, wallet actions, policy service | a new surface can leak an unshared policy |
| **"Is this policy live?"** | `NON_LIVE_POLICY_STATUSES` used correctly in most places; `status: 'active'` still compared directly in some queries | the exact bug the renewal service documents having fixed |

---

## 7. Inconsistent workflows

### 7.1 Two paths to "the risk picture changed", with different effects — **user-visible**

| | Score cached | Recommendations synced | Version + notifications |
|---|---|---|---|
| `runGapEngine` — upload, profile, admin, merge, task | ✅ | ✅ | ✅ |
| `recalculateRiskProfile` — **life events** | ❌ | ❌ | ✅ |

The dashboard reads the **cached** score (`PolicyholderHome.tsx:106` →
`getCachedProtectionScore`).

> A customer declares *"a child was born"* → receives a notification that a
> coverage gap opened → opens the dashboard → **the protection score is the
> pre-life-event number and the recommendations do not include the new gap.**

The divergence is deliberate and documented ("`runGapEngine` would be a recursive
write path here") — but the fix chosen solves the recursion by *omitting two
consumers*, and nothing reconciles them afterwards. This is the clearest
demonstration of the missing event bus: with one, `LifeEventDeclared` would have
the same subscribers as `PolicyAnalysisCompleted`, and re-entrancy would be the
bus's problem to solve once rather than each caller's to dodge.

### 7.2 Notification reliability is inverted between paths

In `gap-engine/index.ts:492`:

```ts
void import("…/risk-profile-version")
    .then(({ recordRiskProfileVersion }) => recordRiskProfileVersion({…}))
    .catch(() => {})
```

`recordRiskProfileVersion` is where `emitRiskEvents` now hangs. So on the
**upload path** — the highest-value moment in the product — `GAP_DETECTED`,
`protection_score_changed` and `risk_level_changed` ride a **floating promise**.
On Vercel, work not awaited before the response may be terminated. On the
**life-event path** the same call *is* awaited, so notifications are reliable
there. The reliability is backwards from what the product needs.

*This is a defect introduced by my own work earlier this session: I attached
notifications to a seam that was deliberately fire-and-forget because it carried
only observability. It no longer carries only observability.*

### 7.3 Analysis has two orchestrators

`policy.service.runBackgroundAnalysis` and
`policy-analysis-orchestrator.service` both complete an analysis and both call
`refreshProtectionScore`; only the former emits `policy_analyzed`. Which one runs
depends on whether the upload went through QStash. Two paths to one fact, with
different notification behaviour.

---

## 8. Missing automations

| Automation | Today | Should be |
|---|---|---|
| Advisor task on a critical gap | none | `CoverageGapOpened` (critical) → advisor task |
| Dunning sequence | one notification per Stripe failure | day 1 / 3 / 7 ladder, then downgrade with notice |
| Extraction-failure remediation | `reap-stale-analyses` marks stale | auto-retry once, then advisor task |
| Renewal → quote workflow | reminder only | expiring + advisor → draft opportunity |
| Inactivity → advisor | churn email to customer | advisor sees at-risk households |
| Score decline → outreach | notification only | sustained decline opens advisory work |
| Consent expiry | none | AI consent has no review cycle |
| Provider failover alert | logged | admin notification |

---

## 9. Missing notifications

Beyond §5: **document upload failed**, **advisor access revoked**, **data export
ready**, **erasure completed**, **token budget nearly exhausted**, **subscription
renewing in N days** (only failure is notified, never the upcoming charge —
required for SCA-adjacent transparency), **questionnaire overdue**, **proposal
expiring**.

---

## 10. Canonical Business Event catalog

Named as **domain facts** (aggregate + past-tense verb), not as messages. Consumers
are what *should* subscribe; ✅ = wired today, ⚠️ = partially, ❌ = missing.

**Priority:** P0 legal/financial exposure · P1 core promise · P2 engagement · P3 analytics

### Policy aggregate

| Event | Description | Trigger | Entity | Pri | Consumers | Expected actions |
|---|---|---|---|---|---|---|
| `PolicyAdded` | A policy entered the wallet | Policy row created | Policy | P1 | Risk engine ✅ · Notifications ✅ · Advisor queue ❌ · Analytics ⚠️ | Recompute risk; confirm to owner; log access if added by advisor |
| `PolicyDocumentUploaded` | A document was attached | PolicyDocument created | PolicyDocument | P2 | Analysis queue ✅ · Notifications ❌ | Enqueue extraction; acknowledge receipt |
| `PolicyAnalysisCompleted` | AI read the policy | AnalysisRun → completed | PolicyAnalysisRun | P1 | Risk engine ✅ · Notifications ✅ · Advisor ❌ · Metering ✅ | Recompute risk; tell owner **and** initiator; bill tokens |
| `PolicyAnalysisFailed` | Extraction did not complete | AnalysisRun → failed | PolicyAnalysisRun | P1 | Notifications ✅ · Admin escalation ✅ · Auto-retry ❌ | Tell owner; retry once; escalate on a spike |
| `PolicyExtractionFlagged` | Confidence below floor | Reviewer flags / low score | Policy | P1 | Notifications ⚠️ · Advisor queue ❌ | Queue human review |
| `PolicyCoverageChanged` | Cover/dates/premium changed | Policy update commits | Policy | P1 | Risk engine ⚠️ · Notifications ⚠️ | Recompute; notify owner if not the editor |
| `PolicyRemoved` | Policy left the wallet | Policy deleted | Policy | P0 | Risk engine ✅ · Notifications ✅ · Audit ✅ | Recompute; notify owner; retain audit |
| `PolicyRecordsMerged` | Duplicates reconciled | Merge approved | Policy | P2 | Risk engine ✅ · Notifications ✅ | Recompute; confirm both parties |
| `PolicyRenewalApproaching` | Milestone reached | renewal-check cron | PolicyRenewal | P1 | Notifications ✅ · Advisor task ✅ · Opportunity ❌ | Remind owner; task advisor; draft quote |
| `PolicyLapsed` | End date passed unrenewed | renewal-check cron | PolicyRenewal | **P0** | Notifications ✅ · Advisor ⚠️ · Risk engine ❌ | Urgent notice (motor = unlawful); recompute risk |

### Risk aggregate

| Event | Description | Trigger | Entity | Pri | Consumers | Expected actions |
|---|---|---|---|---|---|---|
| `RiskProfileRecalculated` | Assessment materially changed | contextHash moved | RiskProfileVersion | P1 | Score cache ⚠️ · Recommendations ⚠️ · Notifications ✅ · Timeline ✅ | **All four, on every path** (§7.1) |
| `CoverageGapOpened` | A risk became unprotected | Version diff | RiskAssessment | P1 | Notifications ✅ · Advisor queue ❌ · Recommendations ✅ | Tell customer; create advisory work when critical |
| `CoverageGapClosed` | A risk became protected | Version diff | RiskAssessment | P2 | Notifications ✅ · Advisor ❌ | Confirm; close related work |
| `ProtectionScoreChanged` | Score moved materially | Version delta ≥ threshold | ProtectionScore | P2 | Notifications ✅ · Advisor ❌ · Analytics ⚠️ | Explain the movement with its cause |
| `RecommendationsGenerated` | New advice produced | syncRecommendations created > 0 | RecommendationInstance | P2 | Notifications ✅ (batched) · Advisor ❌ | One notification per run, never per card |
| `RecommendationDismissed` | Customer declined advice | PATCH dismiss | RecommendationInstance | P3 | Analytics ✅ · Advisor ❌ · Engine ✅ | Record; never re-raise; inform advisor |
| `RecommendationAccepted` | Customer acted | PATCH actioned | RecommendationInstance | P2 | Analytics ✅ · Advisor ❌ · Opportunity ❌ | Record; open advisory follow-up |

### Customer & household aggregate

| Event | Description | Trigger | Entity | Pri | Consumers | Expected actions |
|---|---|---|---|---|---|---|
| `LifeEventDeclared` | Customer reported a life change | LifeEventInstance created | LifeEventInstance | P1 | Risk engine ⚠️ (§7.1) · Notifications ✅ · Timeline ✅ · Advisor ❌ | Full recompute; confirm; surface to advisor |
| `HouseholdChanged` | Dependants/members changed | Profile write | PolicyholderProfile | P1 | Risk engine ✅ · Notifications ❌ | Recompute |
| `AssetAcquired` / `AssetDisposed` | Property or vehicle changed | Profile write | PolicyholderProfile | P1 | Risk engine ✅ · Notifications ❌ · Advisor ❌ | Recompute; prompt for cover |
| `QuestionnaireCompleted` | Customer answered | Instance → completed | QuestionnaireInstance | P1 | Risk engine ⚠️ · Notifications ✅ · Advisor ✅ | Recompute; notify advisor |
| `CustomerBecameInactive` | No activity in N days | churn cron | User | P2 | Notifications ✅ · Advisor ❌ | Re-engage; flag to advisor |

### Advisory (B2B) aggregate

| Event | Description | Trigger | Entity | Pri | Consumers | Expected actions |
|---|---|---|---|---|---|---|
| `AdvisorLinked` | Relationship became active | Relationship active | CustomerRelationship | P0 | Notifications ✅ · Audit ✅ · Book ⚠️ | Tell **both**; log the access grant |
| `AdvisorUnlinked` | Access ended | Relationship terminated | CustomerRelationship | P0 | Notifications ❌ · Audit ⚠️ | Tell the customer their data is no longer visible |
| `AiConsentRequested` / `Granted` | Advisor asked to run AI | Consent flow | User | P0 | Notifications ✅ · Audit ✅ · AI gate ✅ | Record consent; unblock processing |
| `ProposalIssued` / `Accepted` / `Declined` | Advisory proposal lifecycle | Proposal transitions | Proposal | P1 | Notifications ✅ · Opportunity ✅ · Analytics ✅ | Notify counterparty; advance pipeline |
| `CollaborationMessageSent` | Thread message | Message created | CollaborationMessage | P1 | Notifications ✅ · Follow-up ✅ | Notify; chase if unread |
| `DocumentRequested` / `Provided` | Document exchange | DocumentRequest | DocumentRequest | P1 | Notifications ✅ · Advisor queue ⚠️ | Notify; track outstanding |

### Billing aggregate

| Event | Description | Trigger | Entity | Pri | Consumers | Expected actions |
|---|---|---|---|---|---|---|
| `PaymentFailed` | Charge declined | Stripe `invoice.payment_failed` | Subscription | **P0** | Notifications ✅ · Entitlements ✅ · Dunning ❌ · Admin ✅ | Notify; pause; **ladder**; escalate |
| `SubscriptionRenewingSoon` | Charge upcoming | — | Subscription | P1 | Notifications ❌ | Forewarn before charging |
| `SubscriptionUpgraded` / `Expired` | Plan changed/ended | Stripe lifecycle | Subscription | P1 | Notifications ✅ · Entitlements ✅ | Confirm; adjust access |
| `TokenBudgetExhausted` | AI allowance spent | Metering | TokenBalance | P2 | Notifications ❌ · Gate ✅ | Warn before the wall |

### Security, privacy & platform

| Event | Description | Trigger | Entity | Pri | Consumers | Expected actions |
|---|---|---|---|---|---|---|
| `CredentialChanged` | Password/email changed | Auth write | User | **P0** | Notifications ✅ · Audit ✅ | Never suppressible |
| `ConsentGranted` / `Withdrawn` | Consent state moved | Consent write | ConsentAudit | P0 | Audit ✅ · Notifications ❌ · Processing gate ✅ | Record; confirm |
| `DataExportReady` / `ErasureCompleted` | DSR fulfilled | DSR pipeline | DataExportRequest | P0 | Notifications ❌ · Audit ✅ | Tell the subject |
| `AdminActedOnAccount` | Admin touched customer data | ActivityLog w/ targetUserId | User | P1 | Audit ✅ · Notifications ⚠️ *(planned)* | Log; notify for material actions |
| `AiProviderDegraded` | Failover triggered | provider-health | — | P2 | Admin notification ❌ · Router ✅ | Alert operations |

---

## 11. UI review — mobile-first, responsive, accessible, production-ready

**Method:** source review against the repo's own enforced guards
(`design-system-foundations`, `contrast-tokens`, `dark-mode-contrast`,
`alert-and-control-floor`) plus the `public-anon` Playwright sweep conventions.
Not measured in a browser this session.

| Surface | Mobile-first | Responsive | Accessible | Production-ready |
|---|---|---|---|---|
| `/notifications` | ✅ `max-w-4xl px-4 sm:px-6`, 2-col grids | ✅ | ✅ tabs, live region | ✅ |
| Notification bell | ⚠️ see below | ✅ desktop only | ✅ keyboard + `aria-busy`, loading ≠ empty | ✅ |
| `/admin/notifications` (new) | ⚠️ desktop-oriented | ✅ `overflow-x-auto` per repo pattern | ⚠️ see below | ✅ for internal tooling |
| `/admin/notifications/triggers` | ❌ 6-column table | ✅ scrolls | ⚠️ | ✅ |
| Template editor | ✅ stacks | ✅ | ✅ labels bound | ✅ |
| Settings form | ✅ | ✅ | ✅ `htmlFor`/`id` throughout | ✅ |
| `PushOptIn` | ✅ | ✅ | ✅ honest unsupported/denied states | ✅ |

**Findings:**

1. **The bell is desktop-only.** `UserMenu` renders inside
   `hidden lg:block` (`AppShell.tsx:345`), so below 1024px there is **no bell**.
   Mobile users reach notifications only via the nav item. The `w-96` dropdown is
   therefore *not* a mobile overflow bug — but the absence of any header
   notification affordance on mobile, in a **mobile-first** product, is a real gap.
   A `compact` branch exists in `UserMenu` (lines 26, 73) containing a bell and is
   **never rendered** — dead code that looks like the mobile answer.

2. **Admin tables are horizontal-scroll on phones.** Consistent with every other
   admin page, and admin is desktop work — acceptable, but the triggers table
   (6 columns × 74 rows) is the least usable. A card layout below `md:` would fix
   it.

3. **Accessibility gaps in the new admin console** (all minor, all internal-only):
   tables have no `<caption>` or `scope` on `<th>`; the trigger on/off control is a
   submit button rather than `role="switch"` with `aria-pressed`, so a screen
   reader hears "On" without hearing it is a toggle; status colour chips carry no
   text alternative beyond their label (adequate, since the label *is* the text).

4. **No skeleton/pending states on admin server-action forms** — a save on a slow
   connection gives no feedback until navigation. `useFormStatus` would fix it.

5. **Positive:** the new pages passed the repo's contrast, dark-mode and type-ladder
   guards only *after* fixing three real violations (arbitrary `text-[10px]`, a
   4.34:1 stone-500-on-stone-100 chip, a dark-mode-less `text-stone-400`). The
   guards work.

---

## 12. Recommended target architecture

Introduce a **domain event layer** *underneath* the notification bus. The bus
becomes one subscriber among several. This does **not** discard the work already
done — the registry, channels, retry, admin console and templates all survive
unchanged; they simply stop being the entry point.

```
business code
    │  publish(PolicyAnalysisCompleted { policyId, ownerUserId, … })   ← a FACT
    ▼
domain event log (outbox table, transactional with the fact)
    │
    ├─► RiskEngineSubscriber      → recompute score, recs, version
    ├─► NotificationSubscriber    → decides IF and WHAT to say (existing bus)
    ├─► AdvisorQueueSubscriber    → creates advisory work
    ├─► AnalyticsSubscriber       → the conv_* mirror
    └─► AuditSubscriber           → ActivityLog
```

**Why an outbox rather than an in-process emitter:** the fact and its publication
must commit together, or §7.2 recurs in a new form. An outbox row written in the
same transaction as the policy update, drained by the existing cron/QStash
machinery, makes delivery survive a serverless function ending.

**Migration path that keeps everything working:**

1. Add `DomainEvent` (outbox) + `publish()`. No consumers yet.
2. Publish alongside existing calls at the 8 `runGapEngine` sites — dual-write,
   nothing depends on it.
3. Move `runGapEngine` behind a `RiskEngineSubscriber`; delete the direct calls.
4. Make the notification bus a subscriber; callers pass **payloads**, not copy.
   Templates (already built) become the copy source; the registry maps
   *domain event → notification event*.
5. Add `AdvisorQueueSubscriber` — the first genuinely new capability, and the one
   that pays for the whole exercise.

---

## 13. Prioritised backlog

| # | Item | Sev | Effort | Why |
|---|---|---|---|---|
| 1 | **Await the version write in `runGapEngine`** (§7.2) | **High** | XS | Risk notifications may not fire at all on the upload path |
| 2 | **Reconcile the two risk paths** (§7.1) | **High** | S | Life events leave a stale score and stale recommendations on screen |
| 3 | Apply the two pending notification migrations to prod | **High** | XS | Code expects tables prod lacks |
| 4 | Mobile notification affordance (§11.1) | Med | S | Mobile-first product with no mobile bell |
| 5 | Advisor queue subscriber (gaps, failures, payments) | Med | M | B2B automation is one cron wide |
| 6 | Dunning ladder | Med | S | One notice for a P0 financial event |
| 7 | Domain event outbox + first two subscribers | Med | L | Removes the class, not the instances |
| 8 | `SubscriptionRenewingSoon`, `DataExportReady`, `AdvisorUnlinked` | Med | S | Owed notifications, two with a legal edge |
| 9 | Admin a11y polish (§11.3) | Low | S | Internal-only |
| 10 | Delete the dead `compact` UserMenu branch | Low | XS | Looks like the mobile answer; isn't wired |

---

## 14. What is genuinely strong

Stated plainly, because an audit that only lists faults misrepresents the system:

- **One notification bus** with a 74-event registry, enforced by guard tests that
  forbid writing notifications behind it.
- **Honest delivery records** — `skipped` carries a reason; a channel that cannot
  deliver writes no row rather than claiming success.
- **Safety invariants that survive an operator** — transactional events cannot be
  silenced, channels narrow but never widen, retry cannot outlive expiry.
- **Degradation by design** — config and templates fall back to code defaults; a
  notification never fails because its configuration was unreadable.
- **Calendar correctness** centralised in `policy-status.ts` (Athens, not UTC).
- **The repo's own guards keep catching real defects**, including three in work
  produced this session.

The architecture is not wrong. It is one abstraction short.
