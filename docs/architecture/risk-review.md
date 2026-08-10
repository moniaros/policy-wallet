# Risk Review

**Status:** implemented (2026-08-10). Migration `20260810180000_risk_review`
applied to dev, **not to prod**.

## The distinction the whole design rests on

> **Recalculation is automatic, continuous and silent. A review is a human
> checkpoint.**

The gap engine already reruns on every material change — an upload, a life
event, a questionnaire, a nightly sweep — and publishes derived events when the
result actually moves. A **review** is the far rarer moment where we stop and
ask the customer to look at what we concluded and confirm or correct the life it
was computed from.

Conflating the two is the obvious mistake. If every coverage gap opened a
review, a review would become the thing people dismiss without reading — the
same failure as a list where everything is urgent. So most triggers recalculate
and say nothing; only a few are worth interrupting someone for.

## What the audit found

- **No review concept existed.** `scheduled_review` was an action type that
  created a `UserTask`; there was no lifecycle, no deadline, no customer-facing
  review, and no record of whether reviewing helped.
- **No time-based trigger of any kind.** `scheduled_review_due` was declared
  `planned`, blocked on exactly the cadence policy this work decides.
- **`age` is a declared risk factor** — it gates two risks in the catalog and
  refines four more — and **nothing recomputed on a birthday**. A customer's
  assessment went quietly stale every year.
- **The life-event registry was already comprehensive** (23 definitions covering
  marriage, divorce, birth, mortgage, property, business, travel), so seven of
  the brief's twenty triggers were already modelled and only needed routing.
- **Claims remain absent** — no claims model exists, so `claim` is specified and
  honestly unwired.

## How a review opens

```
trigger → policy: should this interrupt?  → service: given what is already
                                             on their plate, should it?
                                                  ↓
                                          RiskReview (open, with a deadline)
                                                  ↓
                                      orchestrator → notification
```

Three ways the service declines, each a deliberate judgement:

- **policy** — the trigger recalculates but does not warrant interrupting.
- **cooldown** — a review of equal or greater weight opened recently. A busy
  fortnight (an upload, a life event, a renewal) is **one** conversation, not
  three; three review cards is how a customer learns to ignore all of them.
- **outranked** — an open review already covers a bigger change.

A **heavier** trigger supersedes lighter open reviews rather than queueing
behind them: a child being born must not be silenced by a quarterly check.
Superseded reviews are marked, not deleted — "this was folded into a bigger
review" is a real outcome.

Reviews **expire** when their deadline passes. An overdue review is a prompt the
customer declined, and leaving it open would make the card permanent furniture
blocking the next genuine one.

## Trigger matrix

<!-- BEGIN GENERATED REVIEW MATRIX -->

_Generated from `lib/services/risk-review/policy.ts` by `scripts/generate-review-matrix.mjs`. Do not edit by hand._

**20 triggers — 16 open a review, 4 recalculate without interrupting.**

### Life events

| Trigger | Review starts? | AI recalculates? | Advisor notified? | Customer guided? | Score can move? | Due | Cooldown |
|---|---|---|---|---|---|---|---|
| `life_event` | **yes** | **yes** | **yes** | **yes** | **yes** | 14d | 7d |
| `child_born` | **yes** | **yes** | **yes** | **yes** | **yes** | 30d | 14d |
| `marriage` | **yes** | **yes** | **yes** | **yes** | **yes** | 30d | 14d |
| `divorce` | **yes** | **yes** | **yes** | **yes** | **yes** | 45d | 21d |
| `mortgage_added` | **yes** | **yes** | **yes** | **yes** | **yes** | 21d | 14d |
| `property_purchased` | **yes** | **yes** | **yes** | **yes** | **yes** | 21d | 14d |
| `business_started` | **yes** | **yes** | **yes** | **yes** | **yes** | 30d | 14d |
| `travel_increased` | no | **yes** | no | **yes** | **yes** | — | 30d |

### Portfolio

| Trigger | Review starts? | AI recalculates? | Advisor notified? | Customer guided? | Score can move? | Due | Cooldown |
|---|---|---|---|---|---|---|---|
| `policy_uploaded` | no | **yes** | no | **yes** | **yes** | — | — |
| `policy_renewal` | **yes** | **yes** | **yes** | **yes** | no | 21d | 30d |
| `claim` | **yes** | **yes** | **yes** | **yes** | **yes** | 30d | — |

### Derived

| Trigger | Review starts? | AI recalculates? | Advisor notified? | Customer guided? | Score can move? | Due | Cooldown |
|---|---|---|---|---|---|---|---|
| `protection_score_drop` | **yes** | no | **yes** | **yes** | no | 14d | 30d |
| `coverage_gap` | **yes** | no | **yes** | **yes** | no | 14d | 21d |
| `ai_confidence_drop` | no | no | **yes** | **yes** | no | — | — |

### Relationship

| Trigger | Review starts? | AI recalculates? | Advisor notified? | Customer guided? | Score can move? | Due | Cooldown |
|---|---|---|---|---|---|---|---|
| `questionnaire_update` | no | **yes** | **yes** | **yes** | **yes** | — | — |
| `customer_inactivity` | **yes** | **yes** | **yes** | **yes** | **yes** | 30d | 90d |
| `advisor_assignment` | **yes** | no | **yes** | **yes** | no | 21d | 30d |

### Periodic

| Trigger | Review starts? | AI recalculates? | Advisor notified? | Customer guided? | Score can move? | Due | Cooldown |
|---|---|---|---|---|---|---|---|
| `annual` | **yes** | **yes** | **yes** | **yes** | **yes** | 30d | 60d |
| `quarterly` | **yes** | **yes** | no | **yes** | **yes** | 21d | 60d |
| `birthday` | **yes** | **yes** | no | **yes** | **yes** | 30d | 180d |

### Why each decision is what it is

- **`life_event`** — A declared life change is the strongest signal we get, and it usually means more than one fact is now out of date.
- **`child_born`** — The single largest change to a household's protection need, and one where the customer has other things on their mind — so the window is generous.
- **`marriage`** — Two financial lives become one; beneficiaries, joint liabilities and duplicate cover all change at once.
- **`divorce`** — Beneficiaries and joint policies often still name a former partner. A long window and gentle framing: this is a hard time, not a sales moment.
- **`mortgage_added`** — A debt that outlives the borrower is the textbook uncovered exposure, and it is newly created at a known moment.
- **`property_purchased`** — A new property is usually uninsured for a window, and in Greece earthquake cover is the specific thing people assume they have.
- **`business_started`** — Opens a whole class of exposure — liability, employer, interruption — that a personal portfolio never covers.
- **`travel_increased`** — A real exposure change, but a narrow one. The finding speaks for itself; a whole review would be disproportionate.
- **`policy_uploaded`** — The customer just acted and the analysis is the answer. A review here would be asking them to check our homework.
- **`policy_renewal`** — The industry's own checkpoint. The customer is already deciding about cover, so the cost of asking them to look is at its lowest.
- **`claim`** — The moment insurance stops being theoretical. A claim reveals whether cover was adequate — the only real feedback the model ever gets. NOT WIRED: the product has no claims model.
- **`protection_score_drop`** — Reserved for a fall into the lowest band. Ordinary movement is already notified; a review for every dip would be a review nobody reads.
- **`coverage_gap`** — Critical severity only. Gaps open routinely as the picture fills in; a review for each would arrive weekly and be ignored.
- **`ai_confidence_drop`** — Our reading failed, not their circumstances. The work belongs to a human reviewing the extraction, not to the customer reviewing their life.
- **`questionnaire_update`** — The customer has just reviewed their own facts. Opening a review moments later would ask them to do it twice.
- **`customer_inactivity`** — A long absence means the picture is stale by default. A review is a better re-engagement than a marketing email because it has a point.
- **`advisor_assignment`** — An advisor's first job is to understand the customer. A review gives that conversation a shared starting point instead of a blank page.
- **`annual`** — The backstop. Lives change without anyone declaring it, and once a year is the cadence people accept without resentment.
- **`quarterly`** — Only for customers whose assessment coverage is too thin to score honestly. Quarterly prompts to a complete profile would train people to dismiss them.
- **`birthday`** — Age gates two risks and refines four more, so an assessment silently goes stale every year. Only opened on a decade boundary — most birthdays change nothing material.

<!-- END GENERATED REVIEW MATRIX -->

## Periodic cadence

- **Annual** — the backstop. Lives change without anyone declaring it, and once
  a year is the cadence people accept without resentment.
- **Quarterly** — only where assessment coverage is below the floor at which the
  score is honest. Prompting a *complete* profile every quarter would be a
  reminder that nothing has changed, which is the fastest way to teach someone to
  ignore reviews.
- **Birthday** — only on a **decade boundary**. Turning 34 changes nothing
  material; turning 40 does. Leap-day birthdays fall back to 1 March in common
  years, so the trigger never silently skips three years in four.

## Measuring whether reviews help

Each review stores the protection score and open-finding count **at open**, and
the score **at close**. That is the only way to answer "did reviewing actually
change anything?" — and "no change" is a legitimate answer worth recording
rather than hiding.

## UI

The card renders on the dashboard **above** the onboarding checklist: a review
responds to something that happened in the customer's life, and onboarding
guidance does not. Mobile-first — one column, full-width 44px actions, and the
two facts that justify the interruption (why it opened, when it is due) above
the fold at 320px. **"Not now" is a first-class action**: a prompt you cannot
decline is one people resent, and a dismissal is useful signal that we asked at
the wrong moment, which a silently ignored card is not.

## Not built

- **Claims** — blocked on a `Claim` aggregate. The policy is declared with the
  heaviest weight so that wiring it later is one publisher.
- **Advisor review queue** — advisors are notified via the existing task and
  notification paths; a dedicated "reviews across my book" surface is not built.
