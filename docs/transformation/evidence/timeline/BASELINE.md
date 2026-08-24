# BASELINE — Χρονολόγιο `/timeline` — V2-P0-BASE(a), PW-MOBILE-TRANSFORM-02

**Date:** 2026-08-24 · **Branch:** NEW-UI · **Surface:** `/timeline` (authenticated policyholder) · **Locale:** `el`
**Harness:** `tests/measure/metrics.ts` + `tests/measure/surface-harness.ts` +
`tests/measure/timeline-baseline.spec.ts` (paid) + `tests/measure/timeline-free.spec.ts` (free).
Fixtures: `provisionMatrixFixtures` (paid: 15-policy matrix incl. `defect-placeholder-identity`; free:
`FREE_SPECS`, 2 policies) + one test-only write, explained below.
**Run:** `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npx playwright test --project=measure timeline-baseline` /
`--project=measure-free timeline-free`

## Status: BOTH tiers complete, 3/3 widths each

## PAID tier — captured, 3/3 widths

| capture | width | scrollHeight | screens | sections | containers/depth | sub-44 | 1.4.3 | 1.4.11 | truncation | leaks |
|---|---|---|---|---|---|---|---|---|---|---|
| timeline-paid | 320 | 9539 | 13.2 | 5 | 68/2 | 0 | 0 | 3 | 2 | **1** |
| timeline-paid | 390 | 9185 | 10.9 | 6 | 69/2 | 0 | 0 | 3 | 2 | **1** |
| timeline-paid | 430 | 9229 | 9.9 | 6 | 69/2 | 0 | 0 | 4 | 2 | **1** |

## FREE tier — captured, 3/3 widths

| capture | width | scrollHeight | screens | sections | containers/depth | sub-44 | 1.4.3 | 1.4.11 | truncation | leaks |
|---|---|---|---|---|---|---|---|---|---|---|
| timeline-free | 320 | 864 | 1.2 | 2 | 7/2 | 0 | 0 | 1 | 1 | 0 |
| timeline-free | 390 | 2011 | 2.4 | 6 | 21/2 | 0 | 0 | 4 | 2 | 0 |
| timeline-free | 430 | 1931 | 2.1 | 6 | 21/2 | 0 | 0 | 4 | 2 | 0 |

## §2.6 — `__PENDING_EXTRACTION__` renders as a policy name: CONFIRMED, and traced to source

**Reaches `/timeline` via `lib/services/timeline/build.ts`'s `buildTimeline`, the `policy_added`
entry, lines ~200-214:**

```ts
const insurer = policy.insurerName?.trim()
entries.push({
    id: `policy_added:${policy.id}`,
    kind: "policy_added",
    at: policy.createdAt,
    title: {
        en: `${branch.en} policy added${insurer ? ` — ${insurer}` : ""}`,
        el: `Προστέθηκε ασφαλιστήριο ${branch.el}${insurer ? ` — ${insurer}` : ""}`,
    },
    ...
```

`policy.insurerName` comes straight off `db.policy.findMany` in `lib/services/timeline/service.ts`
(`select: { ..., insurerName: true, ... }`) — **it never passes through
`lib/wallet/policy-identity.ts`**, the one module CLAUDE.md names as the only place allowed to know
the extractor's sentinel literals (`__PENDING_EXTRACTION__`, `PENDING-<epoch>`) and render an
identity safely (`displayInsurerName`/`policyLabel`/`scrubPolicyIdentity`). `LifeTimeline.tsx` then
prints `entry.title[lang]` verbatim (line ~249) with no client-side scrubbing either. Two independent
gaps in the same pipeline, not one.

**Rendered, confirmed by screenshot** (`timeline-paid-320.png`, top of page):

> 24/08/2026 · ΑΣΦΑΛΙΣΤΗΡΙΑ
> **Προστέθηκε ασφαλιστήριο Αυτοκίνητο — __PENDING_EXTRACTION__**

Also present in `probes.internalTokenLeaks` on every paid capture, all three widths:
`["pending/sentinel marker: \"Προστέθηκε ασφαλιστήριο Αυτοκίνητο — __PENDING_EXTRACTION__\""]`
— the harness's own leak probe (`findInternalTokens`, `metrics.ts`) catches this independently of
the manual read, via its `/\bPENDING-|__[A-Z_]+__/` rule.

**Reproduction note, stated plainly:** the fixture this reproduces from
(`defect-placeholder-identity` in `tests/measure/fixtures.ts`, part of `DEFECT_SPECS`, not new to
this run) already existed on the shared paid E2E account from every OTHER baseline spec that has run
this series. It did **not** need to be created for this task. What this spec *does* add is one line
in its own `beforeAll` — after provisioning, it stamps that one fixture policy's `createdAt` to
`new Date()`:

```ts
await db.policy.update({ where: { id: placeholderId }, data: { createdAt: new Date() } })
```

Reason: `getTimeline` takes the newest 60 entries account-wide, sorted by each entry's own date
(`policy_added`'s date is `policy.createdAt`), and `provisionMatrixFixtures` only ever `update()`s an
existing fixture policy's mutable columns — `createdAt` is not among them. A fixture policy created
in an earlier session could silently have aged out of the 60-entry window by the time this spec ran,
and the candidate would have read as "did not reproduce" for a reason with nothing to do with the
product. This one-line, test-only, clearly-commented write makes the reproduction deterministic
rather than leaving it to how much OTHER activity has since piled onto the shared account. It does
not touch `tests/measure/fixtures.ts` itself.

**Does the free account produce this too?** No — `FREE_SPECS` has no `placeholderIdentity` fixture
(it is deliberately small and gap-heavy for the €3-unlock boundary, not the T-012 defect matrix), and
`timeline-free`'s capture confirms zero leaks. The defect is fixture-shaped, not tier-shaped: it will
render for ANY real account whose extraction genuinely returned the sentinel, on either tier.

## «Dozens of near-identical rows»: CONFIRMED

`probes.repeatedStrings` on the paid capture (320px), sorted by count:

| count | text |
|---|---|
| 18 | «Προστέθηκε ασφαλιστήριο Αυτοκίνητο — Interamerican» |
| 8 | «Εντοπίστηκε κατά απαντήσεις που δώσατε για τη ζωή σας.» (risk-change cause line) |
| 7 | «Προστέθηκε ασφαλιστήριο Υγεία — Εθνική Ασφαλιστική» |
| 5 | «Άνοιξε ένας κίνδυνος» (title) |
| 5 | «Ο κίνδυνος άνοιξε κατά απαντήσεις που δώσατε για τη ζωή σας.» |
| 3 | «Αναμονή για θεραπεία τη στιγμή που μετράει» |
| 3 | «Ζημιά σε ακίνητο που σας ανήκει» |

The chip strip itself states the scale: **«Ασφαλιστήρια 29»** / **«Προτάσεις 17»** (paid, 320px) —
29 policy-added rows differing from each other only by date and (sometimes) insurer name, out of a
60-row visible window. This is overwhelmingly accumulated fixture cruft: the same
`ΣΥΜΒ-2025-MOT-ACT`-shaped policies this account's OTHER baseline specs (`wallet-list-baseline`,
`policy-detail-*`, `coverage-insights-*`, …) have each created their own variant of over many test
sessions, not nine matrix fixtures repeating — a real customer account would show far fewer,
but the ROW SHAPE (many entries whose only distinguishing feature is a date and a repeated title
sentence) is exactly what the candidate describes, and would recur for a real long-lived account
that added several motor policies from the same insurer over the years, or whose score recalculates
on a cadence that produces one `risk_change` row per recalculation with an identical cause sentence.
**Whether this justifies its own menu slot**, per the brief's question: on this account it is the
single most repetitive surface in the product measured so far (repeatedStrings counts on other
baselines top out in single digits; this one hits 18) — the filter chips are doing real, necessary
work here, not decoration.

## Entry-count drift between the three widths of the SAME test — CAUSE IDENTIFIED, self-inflicted by this run's own spec layout, not a product defect

The chip counts on both tiers **changed between sequential captures within one test run** (widths
loop sequentially, same `page`, ~10-30s apart):

- **Paid** — «Ασφαλιστήρια»: 29 (320px) → 27 (390px) → 27 (430px). «Προτάσεις»: 17 → 20 → 17.
  `sections.count` itself moved 5 → 6 → 6 because a distinct chip KIND (Κίνδυνοι) was present at
  390/430 but not captured in the 320 reading.
- **Free** — far starker: at 320px the timeline held **2 entries total** (both `policy_added`, no
  other kind — so few kinds exist that `LifeTimeline.tsx`'s `byKind.length > 1` guard suppressed the
  filter chip strip entirely, which is also why `sections.count = 2` and `scrollHeight = 864`, well
  under the other two widths). By the 390px capture, moments later, the SAME account showed **12
  entries** — «Όλα 12 · Προτάσεις 9 · Ασφαλιστήρια 2 · Σκορ 1» — nine new recommendation rows and one
  score-change row that were not there for the first capture. The header notification badge moved
  2 → 3 in step with it.

**Cause confirmed from the Playwright run logs, not speculated:** `getTimeline`'s own sources are all
read-only on this route (`app/(protected)/timeline/page.tsx` calls only `getTimeline`, which itself
only ever `findMany`s) — nothing on `/timeline`'s own render path writes. But this task's OTHER spec,
`branches-{baseline,free}.spec.ts`, deliberately calls `GET /api/v1/protection-score?fresh=true`
(needed to reproduce §2.2 — see the branches BASELINE) against the **same shared account**, and that
endpoint runs `runGapEngine`, which writes fresh `RecommendationInstance` and `RiskProfileVersion`
rows. Both the `measure` and `measure-free` Playwright projects ran with **2 workers**, and
`test.describe.configure({ mode: "serial" })` only serializes tests **within one spec file** — it does
not serialize ACROSS files in the same project. The run logs show the two files' tests genuinely
interleaved (`[2/4] timeline-baseline... [3/4] branches-baseline: warm: force-refresh...` on the paid
run; equivalent interleaving on the free run). So `branches-*.spec.ts`'s `runGapEngine` call landed on
the shared account **while `timeline-*.spec.ts` was mid-capture**, and — because `getTimeline` caps at
the newest 60 — the newly-written rows pushed some older `policy_added` rows out of the window,
which is exactly the drift observed. Running `timeline-baseline`/`timeline-free` in isolation (not
alongside the branches specs in the same command) would not show this. Recorded because it is a real
and useful fact about the shared E2E account and this task's own spec layout, not because it says
anything about `/timeline` itself — the page's OWN render path never writes.

## Headline layout notes

- **Truncation, both tiers:** only two hits, both benign. (a) the filter-chip strip
  (`div.-mx-1.mb-4`) genuinely overflows horizontally by design — each `Chip` carries its own
  `flex-shrink-0`, so it scrolls (`overflow-x-auto`) rather than compressing; flagged by
  `truncationFailures`'s generic overflow check but not a defect (equivalent, in effect, to what
  `.pw-scroll-strip` guarantees elsewhere, just via a per-component utility class instead of the
  shared primitive). (b) the shell's own notification-count badge (`div.relative`, `scrollWidth=30`
  vs `clientWidth=24`) — shell chrome, present on every authenticated page this run has captured, not
  specific to `/timeline`.
- **No sub-44px tap targets anywhere** — both "Γιατί;" (why-this cause button) and "Άνοιγμα" (open)
  links carry `min-h-11` explicitly; zero offenders across all six captures.
- **1.4.3 text contrast: zero failures**, both tiers, every width.
- **1.4.11 non-text contrast:** small counts (1-4), mostly `unmeasured` (chip button fill and page
  background both `#ffffff` or near-identical, no boundary to measure) plus one `surface` finding on
  the header block (~1.18:1) — reported, not gating per the metric's own class split.
- **Long insurer names wrap correctly, do not clip:** the title `<p>` carries
  `[overflow-wrap:anywhere]`; a 130+-character legal name (`Δεύτερος Αλληλασφαλιστικός
  Συνεταιρισμός…`, the same long-insurer fixture `wallet-list-baseline` uses) wraps across six lines
  cleanly in the screenshot with no ellipsis and no horizontal scroll — confirmed visually, not just
  by the absence of a truncation-probe hit.

## Not captured in this pass
- An isolated-account re-run to confirm/rule out the non-determinism note above.
- `/timeline`'s "Γιατί;" (why-this) scroll-and-flash interaction — this is a static-capture baseline;
  the interaction itself was read from source (`LifeTimeline.tsx`'s `showCause`), not exercised live.
