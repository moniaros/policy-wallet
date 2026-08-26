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
**`asset.*`** — `label` · `policyCount` *(reserved for the §7.3 reframe)* · `identifier` *(LIVE
since P5-wallet-01: the plate / address short form / pet's name on the renewal-timeline row,
resolved only by `policyAssetIdentifier` — `lib/wallet/policy-identity.ts`. Subject-scoped by the
POLICY id, because no asset entity exists yet and the policy row is where it renders.)*

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
the portfolio; dates rendered without a quantity (a date is a fact but not a count — it may
carry `policy.endDate`/`policy.startDate` as data-fact where already composed as its own element);
**historical notification bodies** («6 νέες προτάσεις για εσάς», «Εντοπίσαμε 2 κενά κάλυψης» on
/notifications) — their numbers were true at SEND time, so labelling them with live keys would
report history as contradiction; and **composed prose whose first numeral is not the fact**
(the `motor_expiring_soon` smart card's evidence line embeds a policy ref like «ΣΥΜΒ-2025-MOT-EXP»
before the day count, so the collector's first-number rule would read 2025 — instrumenting it
would assert a wrong value; the real fix is composing that line in parts at the source, which is
a lib/services change, not a label).

### Additions ratified 2026-08-25 (V2-P2-02, the timeline's relocation into Ρυθμίσεις)

New count keys (definitions in the registry): `timeline.entryCount` (the activity history's «Όλα»
chip — the getTimeline 60-entry window, never the account's lifetime) · `timeline.kindCount`
*(subject-scoped by entry kind; sums to `timeline.entryCount`)* · `timeline.groupSize`
*(subject-scoped by group id — how many identical consecutive rows a collapsed T-06 group stands
for)*. New fact key: `timeline.scoreDelta` *(subject-scoped by entry id; renders only when
`comparableScores` held on both sides)*.

### Additions ratified 2026-08-27 (Phase 5 precondition — countConsistency corroboration)

No new keys; four standing decisions:

- **`notification.unreadCount` is LIVE** (was RESERVED). Render sites: the shell's mobile-header
  bell badge, the agent nav's more-tab badge, the desktop user-menu row. The badges saturate at
  «9+», which the collector extracts as **9** — the saturation threshold must stay identical on
  every badge site, and a surface that renders the exact count above 9 beside a saturated badge
  is a real disagreement to a reader, so the metric firing there is signal, not noise.
- **`asset.identifier` extends to the wallet list** — the card's LOB line («Αυτοκίνητο ·
  ΙΚΖ-4821») and the table's secondary line now mark the identifier, same key and subject
  discipline as the renewal-timeline row. The plate is an IDENTIFIER, never a count: the fact
  channel is what tells the scan so.
- **Composed prose with a leading quantity maps through
  `lib/instrumentation/reason-count-keys.ts`.** A recommendation's `personalReason` arrives
  pre-composed from the risk engine; the map (keyed on `riskId`) names the count key for reasons
  whose FIRST numeral is a registered quantity — today `life_dependents` →
  `household.dependantCount`, which deliberately unifies the questionnaire derivation
  (`totalDependents`) with the risk-graph one: a divergence is a §2.8 finding. A reason whose
  first numeral is anything else stays unmapped and therefore honestly unmeasured.
- **Window constants stay unmeasured on purpose.** «Εντός 30 ημερών» (the expiring tile's hint)
  and any label whose ONLY numeral is the window is copy about a fact, not a fact render;
  labelling it with the count's key would extract the window as the count and manufacture a
  false contradiction. Where the window shares a sentence WITH the count («11 ασφαλιστήρια με
  ανανέωση εντός 6 μηνών»), the attribute goes on the whole phrase — the collector's
  first-number rule reads the count and the window becomes measured context. Standalone window
  copy remains in the collector's `unmeasurable` list, which is the honest place for it.

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
