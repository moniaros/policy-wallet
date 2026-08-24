# Instrumentation plan (§5.5.6)

Agreed before instrumentation begins, because anything not on this list becomes permanently
invisible the moment the attribute scan becomes authoritative.

## Current coverage — why this is urgent

| attribute | occurrences | where |
|---|---|---|
| `data-fact` | 8 | `components/wallet/policy-detail/PolicyHead.tsx`, `KeyDatesCard.tsx` — nowhere else |
| `data-count` | 3 | scattered |
| `data-action` | 0 | — |

So on 22 of the 24 B2C surfaces an attribute scan today returns **zero duplicate facts**, and that
zero means "nothing is instrumented", not "nothing is duplicated". §5.2 anticipates exactly this
and requires the baseline to record BOTH the attribute scan and a parallel value scan. That dual
recording is mandatory until this plan is fully applied, and the value scan is the authoritative
one until then.

## Naming

`data-fact="<namespace>.<key>"` · `data-action="<verb>"` · `data-count="<namespace>.<key>"`

Namespace is the **fact's owner**, never the surface that happens to render it. `policy.insurer`
is the same fact on the wallet, the dashboard and the renewal timeline — that is the whole point,
and namespacing by surface would make the cross-surface duplicate undetectable.

## Fact keys

**`policy.*`** — `insurer` · `number` · `line` · `status` · `startDate` · `endDate` ·
`daysRemaining` · `premium` · `premiumFrequency` · `insuredValue` · `deductible` · `summary`

`status`, `endDate` and `daysRemaining` all come from ONE `resolvePolicyLifecycle` call
(`lib/policy-status.ts`). Three elements, three attributes, one source — a client that re-derives
the day count with `(end - Date.now()) / 86_400_000` disagrees with it around Athens midnight, and
the attributes are what make that disagreement measurable rather than arguable.

**`portfolio.*`** — `policyCount` · `activeCount` · `expiredCount` · `expiringCount` ·
`unreadCount` · `totalAnnualPremium` · `analysedCount` · `neverAnalysedCount` · `failedCount`

**`gap.*`** — `title` · `severity` · `openCount` · `concept`
**`score.*`** — `value` · `delta` · `basis`
**`advisor.*`** — `name` · `firm` · `phone` · `email`
**`asset.*`** — `label` · `identifier` · `policyCount` *(reserved for the §7.3 reframe)*

## Count keys

Every rendered quantity carries `data-count`, including one rendered as prose («3 ασφαλιστήρια
λήγουν…»). The count metric compares *instances of one key*, so a number with no key is invisible
to it.

`portfolio.policyCount` · `portfolio.activeCount` · `portfolio.expiredCount` ·
`portfolio.expiringCount` · `portfolio.unreadCount` · `gap.openCount` · `gap.riskCategoryCount` ·
`recommendation.openCount` · `notification.unreadCount` · `plan.stepsTotal` · `plan.stepsDone` ·
`document.count`

**Where two keys legitimately count different things they get different keys** — never the same
key with a note. `portfolio.expiringCount` over a 30-day window and a 45-day window are two facts,
not one fact rendered twice, and the §2.6 defect ("«2 λήγουν σύντομα» above «3 … μέσα σε 45
ημέρες»") is a *labelling* failure that separate keys plus a visible window make impossible to
restate.

### Additions ratified 2026-08-25 (V2-P1-11, §6.7)

The registry's machine mirror is **`lib/instrumentation/count-keys.ts`** — every key below is
defined there, and `tests/unit/count-instrumentation-registry.test.tsx` fails on any key used in
`app/`, `components/` or `lib/` that the registry does not carry. Add to BOTH in one change.

New count keys (definitions in the registry):

- `portfolio.activeCount` · `portfolio.attentionCount` · `portfolio.attentionCollapsedCount` ·
  `portfolio.coverageActiveCount` · `portfolio.policiesWithFindingsCount` ·
  `portfolio.renewalsNext180Count` · `portfolio.expiringWithin45Count` ·
  `portfolio.neverAnalysedCount` · `portfolio.failedCount` ·
  `portfolio.premiumUnknownDurationCount` · `portfolio.premiumNoAmountCount` ·
  `portfolio.premiumOtherCurrencyCount`
- `gap.severityCount` *(subject-scoped by severity; the four values sum to `gap.openCount`)*
- `household.memberCount` · `household.dependantCount` · `household.assetCount` ·
  `household.obligationCount` — the same facts on the risk-profile household card and the risk
  graph headline, which is the cross-check
- `riskGraph.nodeCount` · `riskGraph.riskCount` · `riskGraph.stateCount` *(subject-scoped)*
- `profile.lowConfidenceDimensionCount`
- `branch.policyCount` · `branch.recommendationCount` *(both subject-scoped by branch)*
- `policy.renewalCheckpointCount` *(subject-scoped by policy)*
- `review.findingsAtOpen`
- `entitlement.policyLimit` · `entitlement.freeInsightLimit` — plan limits are NEVER portfolio
  facts; «έως 10 ασφαλιστήρια» grouped with the policy count was the value scan's false positive

New fact keys: `portfolio.branchPremium` *(subject-scoped)* · `profile.healthIndex` ·
`profile.healthComponent` *(subject-scoped)* · `profile.daysSinceAssessment` ·
`riskDimension.score` *(subject-scoped)* · `review.scoreAtOpen`. The policy-detail surface's
pre-plan spellings (`policy.insurerName`, `policy.policyNumber`, `policy.premiumAmount`,
`policy.expiryDate`, `policy.status`, `policy.insuredSubject`, `policy.attention`) are registered
as LEGACY — renaming them must regenerate the policy-detail baselines, so it is a deliberate
follow-up, not a registry side effect. `renewals.upcoming` (a pre-plan coinage) is retired in
favour of `portfolio.renewalsNext180Count`, whose label now states the window.

**Subject scoping.** A key that legitimately renders once per subject on one page — a branch
tile, a renewal row, a severity chip — carries `data-count-subject` / `data-fact-subject` with
the subject's stable id on the same element, and the scan groups by key+subject. Without it,
every list reads as one key contradicting itself; with it, a genuine contradiction (two values
for one subject) is still caught.

**Deliberately NOT instrumented** (recorded so the omission is a decision, not a gap): wizard
step indicators («1/3» in QuickStart) and pagination controls — control state, not facts about
the portfolio; and dates rendered without a quantity (a date is a fact but not a count — it may
carry `policy.endDate`/`policy.startDate` as data-fact where already composed as its own element).

## Action verbs

`upload` · `analyse` · `viewPolicy` · `viewGap` · `renew` · `contactAdvisor` · `callClaims` ·
`share` · `revokeShare` · `upgrade` · `deletePolicy` · `editPolicy` · `downloadDocument` ·
`dismiss` · `confirmObligation` · `reviewCoverage`

**`reviewCoverage` added 2026-08-23** (Orchestrator adjudication, P1-01). No listed verb fitted a
navigate-to-insights CTA, and the implementation agent flagged it rather than silently coining one
or leaving the control uninstrumented. Flagging was the right call: an unlisted verb that nobody
ratifies is how the namespace forks.

`data-action` measures a *different* defect from `data-fact`: one quote CTA rendered three times
is one duplicated action, not three duplicated facts, and the fix is different (consolidate the
call to action, versus link the second render site to the first).

## Rules

1. **One fact, one element, one place.** The attribute goes on the element that renders the
   value, not on a wrapper containing it.
2. **Instrument as you go.** Every Phase 1 item instruments everything it renders or touches.
   Instrumentation deferred to the end does not happen.
3. **A fact rendered as prose is still a fact.** «Λήγει σε 12 ημέρες» carries
   `data-fact="policy.daysRemaining"`.
4. **Never instrument a value you did not resolve through its single source** — identity through
   `lib/wallet/policy-identity.ts`, lifecycle through `resolvePolicyLifecycle`, severity through
   `describeSeverity()`. The attribute asserts "this is that fact", so it must actually be.
5. Baselines record attribute scan AND value scan until coverage is complete.
