# Risk Event → Notification → Automation

**Status:** implemented. Migrations `20260809120000_notification_bus` and
`20260809140000_notification_admin` are **applied to dev, not yet to prod**.

A PolicyWallet notification is not a reminder. It is the visible end of a
business event, and this document is the architecture that makes that
enforceable rather than aspirational.

## The rule

> One business event, declared once. Channels are transport. No channel holds
> business logic, and no channel can disagree with another about what an event
> means, because there is only one place where that is written down.

```
business event ──► emit({ event, userId, title, message })
                        │
              lib/notifications/registry.ts
                        │        priority · category · channels · recipients
                        │        transactional · required action · escalation
                        │        retry · expiry · audit · live|planned
                        ▼
              lib/notifications/dispatch.ts
                        │   1. look up the declaration
                        │   2. resolve recipient + language ONCE
                        │   3. channels = registry ∩ preferences ∩ configured
                        │   4. dedupe on (user, dedupeKey)
                        │   5. deliver, record the honest outcome
                        ▼
        ┌───────────┬───────────┬──────────┬──────────────────────┐
      in_app      email       push      sms · whatsapp · webhook
     (the row)   adapter    adapter     declared, not yet built
        └───────────┴───────────┴──────────┴──────────────────────┘
                        │
              one NotificationEvent row per channel
              status = delivery    readAt = read
```

**Adding WhatsApp is ~40 lines in `lib/notifications/channels/` plus one string
in a registry entry.** It must never mean touching a business rule.

## What was wrong before

The audit that produced this work found the opposite of the rule on every count.
Each item below is a defect that was live in production.

**1. There was no bus. There were three ways to emit**, and which one a caller
reached for decided whether the user's preferences were honoured and which
channels were even reachable:

| Path | Preferences? | Channels reachable | Call sites |
|---|---|---|---|
| `sendNotification()` | yes | email, push | 11 |
| `notifyCounterparty()` | email only | email + in-app | 7 |
| `db.notificationEvent.create()` | **no** | whatever the literal said | ~20 |

The ~20 direct writers hardcoded `channel: 'in_app'` at the call site. That is
per-channel business logic duplicated across the codebase, and it meant a user
who switched a stream off still received it through any direct writer.

**2. The read model was split across two columns, and both were live.**
`status` meant delivery state *and*, on the bell API, read state (`queued` =
unread). `readAt` meant read state everywhere else. Four surfaces disagreed, and
the two mark-read implementations wrote different columns — so reading a
notification in the bell never moved the shell badge, and "mark all read" on
`/notifications` never moved the bell's count.

Measured on production before the fix: **the badge read 141 against a true
count of 8.** It was counting 84 email rows (every marketing message ever sent),
45 real in-app rows, and 12 analytics rows.

**3. Analytics were being rendered to customers as notifications.**
`recordConversionEvent` wrote into the notification table with
`channel: 'in_app'`, `title: 'conv_checkout_completed'` — a machine code as the
user-facing subject — and a JSON blob as the body. 26 such rows in production.

**4. Push was declared everywhere and structurally dead.** Nothing registered a
device token: no service worker existed, no permission prompt, and
`POST /api/v1/notifications/device-token` had **zero callers**. `User.pushToken`
was null for every user in both environments. The dispatcher's
`else if (channel === 'push' && user.pushToken)` therefore fell through and
recorded the row as **`sent`** — a delivery record for a push never attempted.

**5. No delivery guarantees.** Delivery was inline in the request path. Nothing
processed `status: 'queued'`; `failureReason` was written and never read, so a
failed notification was lost silently and for ever. No retry, no backoff, no
dedupe, no expiry, no escalation, no priority.

**6. Eleven required triggers emitted nothing.** The sharpest: a failed payment
flipped the subscription to `past_due` — which pauses entitlements — and told
the customer nothing. They lost paid features mid-session with no idea why. The
lifecycle handler's own header comment already conceded "no dunning".

Also silent: `protection-score-refresh` recomputed every active user's score
daily and notified nobody; `GAP_DETECTED` fired only on the upload path, so a
gap found by the daily engine was invisible; a policy passing its end date
turned "overdue" in the database without a word to its owner.

## Design decisions worth keeping

**`status` is delivery. `readAt` is read.** `readAt` is meaningful on `in_app`
rows only — an email is delivered, not read, and counting sent email as unread
notifications is what produced the 141.

**A skipped channel is not a sent one.** `skipped` carries a reason:
`preference_off`, `no_device`, `no_address`, `transport_not_configured`. A
channel refused by the *user* writes a row, because honouring a choice is worth
recording. A channel whose transport does not exist writes **no** row — you
cannot audit a delivery the system was never capable of making, and a
`skipped` row per future channel per notification would quadruple the table to
say nothing.

**Transactional events bypass preferences**, and the registry is the single
answer to "can this be switched off" — so the settings screen and the
dispatcher cannot disagree. Security and billing events are transactional by
rule, enforced by test: nobody consents away from being told their card failed.

**Copy resolves once, next to the recipient lookup.** Localising per channel is
how an email and a push notification end up saying different things about the
same event.

**Risk events hang off one seam.** `recordRiskProfileVersion` already writes
only when the assessment *materially* changed, and `diffVersions` already turns
two versions into transitions. Deriving notifications anywhere else would let
an alert contradict the timeline it links to, in front of the same customer.

**`planned` is a first-class status.** An event that ought to fire but has no
emitter is declared and marked planned, so the gap is visible and test-enforced
instead of silently missing — which is exactly how eleven triggers came to emit
nothing with nothing anywhere saying so.

**Claims are absent by design.** The brief asks for "new claim" and "claim
status changes". This product has no claims model — no table, no thread
category, nothing that could produce one. They are declared `planned`;
inventing an emitter for an unreachable state would be worse than the gap.

## Delivery guarantees

| | |
|---|---|
| **Idempotency** | `dedupeKey` scoped to `(user, key, channel)`, partial-unique in Postgres. Built from the thing itself (`renewal_overdue:${renewalId}`), never from the clock. |
| **Retry** | `app/api/v1/jobs/notification-retry` (daily, 05:30). Exponential backoff from the registry, capped per event. |
| **Expiry** | Expired **before** retrying, so a retry is never spent on a message that is no longer true. A test asserts the retry schedule fits inside the expiry window for every event. |
| **Escalation** | Threshold crossed → the registry's escalation event to the admins, deduped per user+event+day. |
| **Audit** | Every attempt is a row: channel, status, attempts, failure reason or skip reason. Security, billing and consent events additionally write `ActivityLog`. |

## Push: standard Web Push, not FCM

The pre-existing sender targeted FCM HTTP v1, which needs an *FCM registration
token* — obtainable only through the Firebase JS SDK, i.e. a client dependency,
a Firebase project, and `NEXT_PUBLIC_FIREBASE_*` config. Standard Web Push uses
the browser's own `PushManager.subscribe()`, needs no client SDK, and is the
only thing that works for installed PWAs on **iOS 16.4+** — which decides it for
a Greek consumer product.

RFC 8291 encryption and the RFC 8292 VAPID JWT are implemented on `node:crypto`
in `lib/push/web-push.ts`, matching how the FCM sender already hand-rolls its
RS256 JWT rather than pulling a library.

`tests/unit/web-push-crypto.test.ts` **plays the role of the browser**: it
generates a subscription keypair, hands the public half to the sender, and
decrypts the result. Hand-rolled crypto that merely "does not throw" is
worthless — a wrong derivation produces a well-formed record that every push
service silently rejects, and the only symptom is an empty notification tray.

`User.pushToken` held ONE token, so registering a laptop evicted the phone.
`push_devices` is one row per browser, keyed on the endpoint (stable per
browser, so re-registering updates rather than accumulates). A 404/410 deletes
the row immediately — a dead endpoint retried for ever is how a push queue rots.

Setup: `node scripts/generate-vapid-keys.mjs`, then set `VAPID_PUBLIC_KEY`,
`VAPID_PRIVATE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_SUBJECT`. **Without
them the channel reports itself unconfigured and is not attempted** — no
phantom rows.

The opt-in lives behind an explicit button in Settings. A push permission prompt
is a one-shot: a browser that has been denied will not ask again, so firing it
on page load permanently costs the channel.

## Enforced invariants

`tests/unit/notification-bus-invariants.test.ts` — 16 assertions, each one a
defect this codebase actually shipped:

- no `notificationEvent.create` outside `lib/notifications/`
- every emitted event is declared; every `live` event has an emitter
- every event declares all ten required fields (`null` is an answer, absence is not)
- escalations point at events that exist, name a threshold, and only use
  unread-thresholds on events that actually reach in-app
- transactional and analytics events are not suppressible; security and billing
  are transactional by rule; critical events reach more than one channel
- retry backs off increasingly, and never outlives its own expiry

## Administration

Everything below is manageable from **`/admin/notifications`** without a deploy.

The registry stays the source of truth for an event's SHAPE. The admin layer is
an **override on its operational parameters**, merged at read time — the same
pattern as `AiPromptOverride`, including revisions for versioning.

```
registry default  ─┐
                   ├─► effective config ─► dispatcher
DB override       ─┘   (cached, tag-invalidated, never throws)
```

Every override column is nullable, and **null means inherit**. An override is a
set of deltas, not a copy, so an operator who changes one number does not freeze
the other nine against a future improvement to the code default.

| Area | Where | What it does |
|---|---|---|
| Trigger enable/disable, priority, channels, retry, escalation, expiry | `/admin/notifications/triggers/[event]` | Per-event overrides, versioned with a diff and the operator's stated reason |
| Templates (email subject/body, push, in-app) per language | `/admin/notifications/templates/[event]` | Versioned copy with live preview and test-send |
| Pause, channel toggles, thresholds, feature flags | `/admin/notifications` | Global settings, declared and validated in `lib/notifications/settings.ts` |
| Delivery history, failures, manual retry | `/admin/notifications/history` | Every attempt with its outcome and reason; filter and re-queue |
| Queue health and analytics | `/admin/notifications` | 7-day outcomes, skip reasons broken out, top failing events, run-sweep-now |

### What an operator may NOT change, and why

`transactional`, `category` and `recipients` are code-only, and a transactional
event cannot be switched off — enforced in the validator, the toggle action and
a test that sweeps every security and billing event.

> A rule the operator can bend must never be the rule protecting the customer
> FROM the operator.

Silencing a password-change or payment-failure alert is not an operational
setting. Channels can only be **narrowed** to a subset of what the event
declares: widening would let an operator route an in-app-only event to email,
which is a product decision about what the event *is*.

The validator also rejects a retry schedule that would still be running after
the notification expires — the same invariant the registry guard test enforces
on the code defaults, so a form cannot reach a state the source forbids.

### Honest suppression

An admin action never makes a notification vanish. Three new reasons join
`preference_off` and `no_device`:

- `trigger_disabled` — an operator switched this event off
- `automations_paused` — the global pause is on
- `channel_disabled` — this channel is off globally (distinct from
  `transport_not_configured`, which means it was never built)

That distinction is what tells a **paused** system apart from a **broken** one
when somebody asks why a customer heard nothing.

### Degradation

`getNotificationConfig` never throws. A database error resolves to the registry
defaults — exactly what the code shipped with — and the console shows a banner
saying so. The override layer is optional by construction; a notification must
never fail to send because its configuration was unreadable.

Templates degrade the same way: no template, an unparseable one, or one that
renders empty all fall back to the caller's own copy. `flag.templatesEnabled` is
the kill switch if a template goes wrong in production.

### Templates and variables

Templates interpolate `{{name}}` from a **closed, per-event allowlist**
(`EVENT_VARIABLES`). Anything else renders empty. Handing a template the whole
payload would let a typo publish an internal id or a policy number onto a lock
screen; a closed list makes the blast radius a terse sentence.

Test sends go to the **administrator themselves** and the recipient is not a
form field — a test-send that can address anyone is a way to send arbitrary text
from a trusted sender, which is a phishing primitive rather than a preview.

## The Orchestrator

`emit()` answers *how* to deliver. The **orchestrator** answers *who*, *when* and
*whether*, then hands delivery to the bus unchanged.

```
business event
     │
orchestrator      recipients · quiet hours · rate limit · scheduling
     │
  emit()          registry · preferences · templates · channels · retry
     │
channel adapters  in-app · email · push · (sms · whatsapp · webhook · slack · teams)
```

**It does not duplicate the bus.** Nothing in it re-decides a channel,
re-resolves a language, re-renders a template or re-checks a per-event
preference — all of that lives in `emit`, once. A guard test forbids the event
layer from calling `emit` directly, because that would be a second delivery path
with none of these policies.

### One event, several people

`recipients` has been declared on every registry entry since the registry was
written, and until now **nothing read it** — callers resolved recipients
themselves, which is why `policy_analyzed` was emitted twice from one function
with two copies of the copy. The orchestrator resolves `owner`, `advisor`,
`counterparty` and `admin` into real users, appending the recipient to the
dedupe key so each is told once rather than the second being deduped away as a
repeat of the first.

### Deferral, never suppression

Quiet hours and the daily cap **defer**. They never drop.

> A policy about *timing* that silently discarded the message would be a policy
> about *existence* — and a customer would never learn their cover lapsed
> because it lapsed at 23:40.

A deferred notification is written immediately as `queued` with `scheduledFor`,
so the decision is visible and auditable before the send, and the existing
retry sweep delivers it when its hour comes. Expiry is re-checked at that point:
a reminder deferred overnight can expire while it waits, and a renewal reminder
for a renewal that has already passed is exactly what expiry exists to prevent.

**Urgency overrides politeness.** Critical and transactional events — a failed
payment, a credential change, a lapsed motor policy — ignore quiet hours and the
cap entirely. Those are the notifications a person wants to be woken for, and a
rule that silenced them would be protecting the wrong thing.

### Quiet hours are timezone-real

Resolved through `Intl` against the recipient's stored zone, not a fixed offset:
Greece observes daylight saving, so `+2` would put the window an hour wrong for
half the year — precisely the season where being woken matters. Deferral targets
the **start of the morning**, not "now + N hours", so notifications raised at
23:00 and 03:00 arrive together when the person wakes.

### One settings model, two defaults

`UserNotificationSettings` serves customers and advisors. They want the same
settings with different starting points — a customer wants nothing overnight; an
advisor is being handed work and wants it inside working hours, with a higher
ceiling because a book of clients legitimately generates more than one person's
life does. Defaults derive from the user's role at read time; the stored row is
the override, and a null cap means "use the role default" so raising a default
reaches everyone who never overrode it.

Quiet hours default **on**, 22:00–08:00. A push at 03:00 is a reason to
uninstall, and a customer should not have to discover the setting only after
being woken by its absence.

### Channels

Built: **in-app, email, push**. Declared and unbuilt: **SMS, WhatsApp, webhook,
Slack, Teams** — present in the vocabulary so an event can express that it would
use them and so adding transport later is one adapter file.
`IMPLEMENTED_CHANNELS` remains what user-facing copy may promise.

## Trigger matrix

<!-- BEGIN GENERATED TRIGGER MATRIX -->

_Generated from `lib/notifications/registry.ts` by `scripts/generate-notification-matrix.mjs`. Do not edit by hand._

**74 business events declared — 69 live, 5 planned.**

### Risk, gaps, score and recommendations

| Event | Business event | Trigger condition | Priority | Channels | Recipients | Required action | Escalation | Retry | Expires | Audit | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `life_event_recorded` | The customer told us their life changed | declareLifeEvent() commits a LifeEventInstance | normal | in_app, email | owner | review_what_changed | — | 3× exponential, from 15m | 30d | notification_event | live · transactional |
| `profile_updated` | The customer changed their profile, household or assets | A profile write path commits and the risk fingerprint moves | low | in_app | owner | — | — | none | 14d | notification_event | planned · transactional |
| `policy_analyzed` | AI extraction finished and the policy is readable | PolicyAnalysisRun completes successfully | high | in_app, email, push | owner | review_findings | — | 3× exponential, from 15m | 30d | notification_event | live |
| `policy_analysis_failed` | AI extraction failed | PolicyAnalysisRun terminates in failed | high | in_app, email, push | owner | retry_or_contact_support | 3 failures → admin (`admin_analysis_failure_spike`) | 3× exponential, from 15m | 14d | activity_log | live · transactional |
| `extraction_flagged` | Extraction succeeded but confidence was too low to trust | An extracted field lands below the confidence floor | high | in_app, email | owner | confirm_extracted_values | — | 3× exponential, from 15m | 30d | notification_event | live |
| `GAP_DETECTED` | A coverage gap was found | A risk transitions into protection_gap between two RiskProfileVersions | high | in_app, email, push | owner | review_gap | — | 3× exponential, from 15m | 30d | notification_event | live |
| `protection_score_changed` | The customer's protection score moved materially | recordRiskProfileVersion() writes a version whose score delta clears the materiality threshold | normal | in_app, email | owner | review_what_changed | — | 3× exponential, from 15m | 14d | notification_event | live |
| `risk_level_changed` | A specific risk changed status | diffVersions() reports a transition other than into protection_gap | normal | in_app | owner | review_risk | — | none | 14d | notification_event | live |
| `recommendation_generated` | New recommendations were produced | syncRecommendations() reports created > 0 | normal | in_app | owner | review_recommendations | — | none | 30d | notification_event | live |
| `recommendation_dismissed` | The customer dismissed a recommendation | PATCH /api/v1/recommendations/[id] with action=dismiss | low | analytics | owner | — | — | none | never | notification_event | live · transactional |
| `recommendation_accepted` | The customer acted on a recommendation | PATCH /api/v1/recommendations/[id] with action=actioned | normal | analytics | owner | — | — | none | never | notification_event | live · transactional |

### Policy lifecycle and renewals

| Event | Business event | Trigger condition | Priority | Channels | Recipients | Required action | Escalation | Retry | Expires | Audit | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `policy_added` | A policy was added to the wallet | Policy row created by upload, advisor or onboarding | normal | in_app | owner | — | — | none | 30d | notification_event | live · transactional |
| `policy_updated` | A policy's terms changed | Policy update commits a change to cover, dates or premium | normal | in_app, email | owner | review_change | — | 3× exponential, from 15m | 30d | notification_event | live · transactional |
| `policy_removed` | A policy was removed from the wallet | deletePolicy() commits | high | in_app, email | owner | — | — | 3× exponential, from 15m | 90d | activity_log | live · transactional |
| `policy_shared` | A policy was shared with an advisor | An AccessGrant is created over a policy | normal | in_app, email | counterparty | — | — | 3× exponential, from 15m | 30d | activity_log | live · transactional |
| `policy_merged` | Two records of one policy were merged | A PolicyMergeRequest is approved and applied | normal | in_app | owner | — | — | none | 30d | notification_event | live · transactional |
| `policy_merge_requested` | Someone proposed merging two policy records | PolicyMergeRequest created | normal | in_app, email | counterparty | approve_or_reject_merge | — | 3× exponential, from 15m | 14d | notification_event | live |
| `policy_merge_rejected` | A proposed merge was rejected | PolicyMergeRequest transitions to rejected | normal | in_app | counterparty | — | — | none | 14d | notification_event | live · transactional |
| `policy_expiring` | A policy is approaching its renewal date | renewal-check cron finds a policy inside a reminder milestone | high | in_app, email, push | owner | review_renewal_options | — | 3× exponential, from 15m | 3d | notification_event | live |
| `renewal_overdue` | A policy passed its end date without being renewed | renewal-check cron finds endDate in the past and no successor policy | critical | in_app, email, push | owner, advisor | renew_or_confirm_lapsed | unread 3d → advisor (`renewal_milestone`) | 5× exponential, from 30m | 30d | activity_log | live · transactional |
| `renewal_outcome` | A renewal was resolved | PolicyRenewal reaches a terminal state | normal | in_app, email | owner | — | — | 3× exponential, from 15m | 30d | notification_event | live · transactional |
| `claim_opened` | A claim was opened | No source exists — the product has no claims model | critical | in_app, email, push | owner, advisor | track_claim | — | 5× exponential, from 30m | 90d | activity_log | planned · transactional |
| `claim_status_changed` | A claim changed status | No source exists — the product has no claims model | high | in_app, email, push | owner | review_claim | — | 5× exponential, from 30m | 90d | activity_log | planned · transactional |

### Advisor collaboration

| Event | Business event | Trigger condition | Priority | Channels | Recipients | Required action | Escalation | Retry | Expires | Audit | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `questionnaire_completed` | The customer finished a questionnaire | QuestionnaireInstance transitions to completed | normal | in_app, email | advisor | review_responses | — | 3× exponential, from 15m | 30d | notification_event | live · transactional |
| `questionnaire_received` | An advisor sent the customer a questionnaire | An advisor dispatches a QuestionnaireInstance | normal | in_app, email, push | owner | complete_questionnaire | unread 7d → advisor (`collaboration_unread_followup`) | 3× exponential, from 15m | 30d | notification_event | live |
| `document_uploaded` | A document was uploaded against a request | DocumentRequest receives a PolicyDocument | normal | in_app, email | counterparty | review_document | — | 3× exponential, from 15m | 30d | notification_event | live · transactional |
| `document_requested` | An advisor asked for a document | DocumentRequest created | normal | in_app, email, push | owner | upload_document | unread 7d → advisor (`collaboration_unread_followup`) | 3× exponential, from 15m | 30d | notification_event | live |
| `ai_consent_request` | An advisor asked to run AI analysis on the customer's documents | An advisor requests AI processing consent | high | in_app, email, push | owner | grant_or_refuse_consent | — | 3× exponential, from 15m | 30d | activity_log | live · transactional |
| `renewal_milestone` | An advisor's client has a renewal approaching | renewal-check cron, for policies with an advisor relationship | normal | in_app, email | advisor | contact_client | — | 3× exponential, from 15m | 7d | notification_event | live |
| `renewal_quote_requested` | The customer asked for a renewal quote | A renewal quote request is submitted | high | in_app, email | advisor | provide_quote | unread 2d → admin (`admin_unanswered_quote`) | 3× exponential, from 15m | 14d | notification_event | live · transactional |
| `collaboration_message` | A message was sent in an advisory thread | CollaborationMessage created | high | in_app, email, push | counterparty | read_and_reply | — | 3× exponential, from 15m | 30d | notification_event | live |
| `collaboration_thread_assigned` | An advisory thread was assigned | CollaborationThread assignee changes | normal | in_app, email | counterparty | take_ownership | — | 3× exponential, from 15m | 14d | notification_event | live · transactional |
| `collaboration_action_assigned` | An action was assigned in a thread | CollaborationAction created with an assignee | normal | in_app, email | counterparty | complete_action | unread 3d → counterparty (`collaboration_action_overdue`) | 3× exponential, from 15m | 14d | notification_event | live |
| `collaboration_action_overdue` | An assigned action passed its due date | collaboration-reminders cron finds an open action past due | high | in_app, email | counterparty | complete_action | — | 3× exponential, from 15m | 7d | notification_event | live |
| `collaboration_unread_followup` | A message went unread long enough to chase | collaboration-reminders cron finds an unread message past the follow-up window | normal | in_app, email | counterparty | read_and_reply | — | 3× exponential, from 15m | 7d | notification_event | live |
| `collaboration_daily_digest` | A day's advisory activity, summarised | collaboration-reminders cron, once daily per participant with activity | low | in_app, email | counterparty | — | — | none | 2d | notification_event | live |
| `advisor_assigned` | An advisor and a customer were connected | CustomerRelationship becomes active | high | in_app, email | owner, advisor | — | — | 3× exponential, from 15m | 30d | activity_log | live · transactional |
| `customer_transferred` | A customer was moved between advisors | CustomerRelationship agentUserId changes | high | in_app, email | owner, advisor | — | — | 3× exponential, from 15m | 30d | activity_log | live · transactional |
| `proposal_received` | An advisor sent a proposal | Proposal created | high | in_app, email, push | owner | review_proposal | unread 5d → advisor (`collaboration_unread_followup`) | 3× exponential, from 15m | 30d | notification_event | live |
| `proposal_accepted` | A proposal was accepted | Proposal transitions to accepted | high | in_app, email | counterparty | issue_policy | — | 3× exponential, from 15m | 30d | activity_log | live · transactional |
| `proposal_declined` | A proposal was declined | Proposal transitions to declined | normal | in_app, email | counterparty | — | — | 3× exponential, from 15m | 14d | notification_event | live · transactional |
| `proposal_counter_offer` | A counter-offer was made on a proposal | Proposal receives a counter-offer | high | in_app, email | counterparty | review_counter_offer | — | 3× exponential, from 15m | 14d | notification_event | live |
| `opportunity_created` | An advisory opportunity was opened | Opportunity created | normal | in_app | advisor | work_opportunity | — | none | 30d | notification_event | live · transactional |
| `team_invite` | Someone was invited to an advisory team | TenantMembership invite issued | high | in_app, email | counterparty | accept_or_decline_invite | — | 3× exponential, from 15m | 14d | activity_log | live · transactional |
| `team_invite_accepted` | A team invitation was accepted | TenantMembership transitions to active | normal | in_app, email | counterparty | — | — | 3× exponential, from 15m | 14d | activity_log | live · transactional |
| `scheduled_review_due` | A periodic cover review is due | No emitter yet — needs a review cadence per customer | normal | in_app, email | owner, advisor | book_review | — | 3× exponential, from 15m | 14d | notification_event | planned |

### Billing and subscription

| Event | Business event | Trigger condition | Priority | Channels | Recipients | Required action | Escalation | Retry | Expires | Audit | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `payment_failed` | A subscription payment failed | Stripe invoice.payment_failed marks the subscription past_due | critical | in_app, email, push | owner | update_payment_method | 3 failures → admin (`admin_dunning_exhausted`) | 5× exponential, from 30m | 30d | activity_log | live · transactional |
| `subscription_expired` | A subscription ended | Stripe customer.subscription.deleted, or the period lapses unrenewed | critical | in_app, email, push | owner | resubscribe_or_export_data | — | 5× exponential, from 30m | 30d | activity_log | live · transactional |
| `subscription_upgraded` | The customer changed plan | Subscription plan changes on a Stripe lifecycle event | high | in_app, email | owner | — | — | 3× exponential, from 15m | 30d | activity_log | live · transactional |
| `bonus_credits_granted` | Credits were granted to the account | A credit grant commits | normal | in_app | owner | — | — | none | 30d | notification_event | live · transactional |

### Security

| Event | Business event | Trigger condition | Priority | Channels | Recipients | Required action | Escalation | Retry | Expires | Audit | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `login_success` | A sign-in happened | A session is established | low | analytics | owner | — | — | none | never | activity_log | live · transactional |
| `password_change` | The account password changed | A password update commits | critical | in_app, email, push | owner | contact_support_if_not_you | — | 5× exponential, from 30m | 90d | activity_log | live · transactional |
| `email_change` | The account email changed | An email update commits | critical | in_app, email, push | owner | contact_support_if_not_you | — | 5× exponential, from 30m | 90d | activity_log | live · transactional |

### Engagement

| Event | Business event | Trigger condition | Priority | Channels | Recipients | Required action | Escalation | Retry | Expires | Audit | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `perk_reminder` | A partner perk is about to expire | perk-reminders cron finds a perk inside its reminder window | low | in_app, email | owner | claim_perk | — | none | 3d | notification_event | live |
| `weekly_digest` | The week's activity, summarised | weekly-digest cron, for users with something to report | low | in_app, email | owner | — | — | none | 5d | notification_event | live |
| `churn_prevention` | An at-risk customer needs re-engaging | churn-prevention cron scores a user as at risk | low | in_app, email | owner | — | — | none | 7d | notification_event | live |
| `engagement_welcome` | A new customer joined | engagement-drip cron, day 0 | low | in_app, email | owner | add_first_policy | — | none | 3d | notification_event | live |
| `engagement_day3` | A customer is three days in | engagement-drip cron, day 3, still not activated | low | in_app, email | owner | add_first_policy | — | none | 3d | notification_event | live |
| `engagement_day7` | A customer is a week in | engagement-drip cron, day 7, still not activated | low | in_app, email | owner | add_first_policy | — | none | 3d | notification_event | live |
| `achievement_unlocked` | The customer unlocked an achievement | An achievement's condition is first satisfied | low | in_app | owner | — | — | none | 30d | notification_event | live |
| `feedback_nps` | The customer left an NPS score | POST /api/v1/feedback with type=nps | low | analytics | owner | — | — | none | never | notification_event | live · transactional |
| `feedback_article` | The customer rated a help article | POST /api/v1/feedback with type=article | low | analytics | owner | — | — | none | never | notification_event | live · transactional |

### Administrative and escalation

| Event | Business event | Trigger condition | Priority | Channels | Recipients | Required action | Escalation | Retry | Expires | Audit | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `admin_action_on_account` | An administrator acted on a customer's account | An ActivityLog entry is written with a targetUserId | high | in_app, email | owner | — | — | 3× exponential, from 15m | 90d | activity_log | planned · transactional |
| `admin_dunning_exhausted` | A customer's payments failed repeatedly | payment_failed escalation threshold crossed | high | in_app, email | admin | contact_customer | — | 3× exponential, from 15m | 14d | activity_log | live · transactional |
| `admin_analysis_failure_spike` | Analysis is failing repeatedly for one customer | policy_analysis_failed escalation threshold crossed | high | in_app, email | admin | investigate_pipeline | — | 3× exponential, from 15m | 7d | activity_log | live · transactional |
| `admin_unanswered_quote` | A quote request went unanswered | renewal_quote_requested escalation threshold crossed | normal | in_app, email | admin | chase_advisor | — | 3× exponential, from 15m | 7d | activity_log | live · transactional |

### Analytics mirror (recorded, never delivered)

| Event | Business event | Trigger condition | Priority | Channels | Recipients | Required action | Escalation | Retry | Expires | Audit | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `conv_checkout_started` | Checkout was started | recordConversionEvent() — server-side funnel mirror | low | analytics | owner | — | — | none | never | notification_event | live · transactional |
| `conv_checkout_completed` | Checkout completed | recordConversionEvent() — server-side funnel mirror | low | analytics | owner | — | — | none | never | notification_event | live · transactional |
| `conv_checkout_cancelled` | Checkout was abandoned | recordConversionEvent() — server-side funnel mirror | low | analytics | owner | — | — | none | never | notification_event | live · transactional |
| `conv_limit_hit` | A plan limit was reached | recordConversionEvent() — server-side funnel mirror | low | analytics | owner | — | — | none | never | notification_event | live · transactional |
| `conv_free_ai_call_blocked` | A free-tier AI call was blocked | recordConversionEvent() — server-side funnel mirror | low | analytics | owner | — | — | none | never | notification_event | live · transactional |
| `conv_paid_ai_call_started` | A paid AI call started | recordConversionEvent() — server-side funnel mirror | low | analytics | owner | — | — | none | never | notification_event | live · transactional |
| `conv_paid_ai_call_completed` | A paid AI call completed | recordConversionEvent() — server-side funnel mirror | low | analytics | owner | — | — | none | never | notification_event | live · transactional |
| `conv_proposal_accepted` | A proposal was accepted (funnel mirror) | recordConversionEvent() — server-side funnel mirror | low | analytics | owner | — | — | none | never | notification_event | live · transactional |

### Why these rules are what they are

- **`life_event_recorded`** — Confirms we heard them. The RISK consequence is a separate event, because the two are different claims: one is 'recorded', the other is 'this changed your exposure'.
- **`profile_updated`** — Deliberately NOT wired. A profile, household or asset edit already produces the notification that matters — the RISK consequence, via protection_score_changed / GAP_DETECTED / risk_level_changed off the same recalculation. A second 'you changed something' ping for an edit the customer made ten seconds ago is noise, and noise is what makes people switch the useful ones off. The case that WOULD justify it is an ADVISOR editing a customer's profile, which is a security signal rather than a confirmation; that needs the advisor-edit path identified first, and inventing an emitter before then would fire it on the wrong half of the cases.
- **`policy_removed`** — High, and emailed, because it is destructive and may not have been the owner who did it. This is the notification that lets someone notice.
- **`policy_analyzed`** — The payoff moment of the whole product, and often minutes after the customer navigated away. This is the strongest case for push in the app.
- **`policy_analysis_failed`** — Transactional: the customer handed us a document and is owed the outcome, good or bad. Silence reads as 'still working'.
- **`extraction_flagged`** — This is the AI-confidence trigger. It fires on the reading we could not stand behind, which is the only confidence change a customer can act on.
- **`ai_consent_request`** — Transactional and audit-logged: this is a GDPR consent request, and the record of asking matters as much as the asking.
- **`GAP_DETECTED`** — SCREAMING_CASE is the one inconsistency kept deliberately: it is the key persisted in NotificationPreference rows and read by the settings screen, and renaming it would silently re-enable the stream for everyone who switched it off.
- **`protection_score_changed`** — Hangs off the version writer, which already fires only on a MATERIAL change (contextHash). Deriving it anywhere else would let the notification disagree with the timeline about the same movement.
- **`risk_level_changed`** — In-app only on purpose. A risk CLOSING is good news and does not deserve an interruption; a risk OPENING is GAP_DETECTED, which does.
- **`recommendation_generated`** — Batched: one notification for the run, never one per card. A person who gains six recommendations has learned one thing, not six.
- **`recommendation_dismissed`** — Recorded, not delivered. Notifying someone about their own click is noise; but a dismissal is the clearest signal a customer ever gives us and the advisor surfaces need it.
- **`renewal_overdue`** — Critical and transactional: the customer may now be uninsured, and for motor in Greece that is also unlawful. This is not a marketing reminder and cannot be switched off.
- **`claim_opened`** — Blocked on a claims model. Wiring is one entry here plus one emitter once Claim exists.
- **`claim_status_changed`** — Blocked on a claims model.
- **`advisor_assigned`** — Transactional and audit-logged: this is the moment another person gains sight of the customer's policies, and they are entitled to know it happened.
- **`payment_failed`** — The sharpest gap the audit found: the subscription was flipped to past_due and the customer was told nothing, losing paid features silently. Transactional — nobody consents away from being told their card failed.
- **`achievement_unlocked`** — One event, with the achievement id in relatedObjectId. It used to be fifteen event types (`achievement_first_policy`, …), which meant the registry could never be complete and no preference could ever address the stream.
- **`password_change`** — Never suppressible. This is the notification that lets someone discover an account takeover.
- **`admin_action_on_account`** — Deliberately NOT wired yet. Notifying on every admin read would bury the customer and would fire on routine support work; the rule needs to name which admin actions are worth telling someone about, and that is a policy decision, not a code one.
- **`scheduled_review_due`** — Blocked on a cadence policy: annually, on renewal, or on a material life change. Picking one is a product decision, and a review reminder on the wrong cadence trains people to ignore it.

<!-- END GENERATED TRIGGER MATRIX -->

## Adding a notification

1. Declare it in `lib/notifications/registry.ts` with all ten fields.
2. Call `emit({ event, userId, title, message })` from the business seam,
   **after** the transaction that performed the action has committed.
3. Pass a `dedupeKey` if anything repeating can reach that code path.
4. Run `node scripts/generate-notification-matrix.mjs` to refresh this table.

Do not add a `channels` argument at the call site. An event's channels belong to
the event — that is how renewal reminders became email-only and invisible in the
notification centre.

## Known gaps

- **`profile_updated` is declared `planned` deliberately.** A profile, household
  or asset edit already produces the notification that matters — the risk
  consequence. A second "you changed something" ping for an edit made ten
  seconds ago is noise. The case that *would* justify it is an **advisor**
  editing a customer's profile, which is a security signal rather than a
  confirmation, and needs that path identified first.
- **`admin_action_on_account` is `planned`.** Notifying on every admin read
  would bury the customer and fire on routine support work. Which admin actions
  are worth telling someone about is a policy decision, not a code one.
- **`scheduled_review_due` is `planned`**, blocked on a cadence policy.
  A review reminder on the wrong cadence trains people to ignore it.
- **Claims** — blocked on a claims model, as above.
- **`/admin/notifications` is English-only**, following the existing admin-page
  precedent. The customer-facing copy it edits is fully bilingual; the console
  around it is not.
- **SMS / WhatsApp / webhook** are declared and unbuilt. `IMPLEMENTED_CHANNELS`
  is what user-facing copy may promise, and
  `tests/unit/channel-claims.test.ts` reads it directly — the help centre once
  offered SMS "(Premium only)", a paid channel that has never existed.
