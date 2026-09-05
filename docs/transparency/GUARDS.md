# Goal G — the guard inventory (PW-TRANSPARENCY-02)

One guard per defect class, covering every surface and both audiences. A guard counts as written
only when it has been demonstrated failing: the **probe** column names the committed fixture (under
`tests/fixtures/guard-probes/`) or the in-test case that turns it red. `tests/unit/guard-inventory.test.ts`
parses this table and fails when a listed guard or probe file is missing, or when a class marked
**every commit** is not under `tests/unit` (the path CI runs on every push).

Cadence: **every commit** = `npx vitest --run tests/unit` in `.github/workflows/ci.yml`; **per goal** =
the Playwright measurement harness (`tests/measure/*`), run before and after each goal on the 320/390/430
matrix. Status: **present**, **partial** (with what is missing), **not yet applicable** (Track C, gated).

| class | guards | probes | cadence | status |
|---|---|---|---|---|
| score-absence — in-product, outbound, report | tests/unit/score-containment.test.ts; tests/unit/protection-score-honesty.test.tsx; tests/unit/email-content-honesty.test.ts | score-render-jsx.tsx.txt; score-render-email.ts.txt; score-render-marketing.tsx.txt; score-internal-use.ts.txt | every commit | present |
| orphaned score derivative | tests/unit/score-containment.test.ts; tests/unit/relationship-vs-protection-score.test.ts; tests/unit/score-vocabulary.test.ts | score-internal-use.ts.txt | every commit | present |
| severity-does-not-order | tests/unit/severity-never-orders.test.ts; tests/unit/gap-severity-display-single-source.test.ts | severity-sort.ts.txt; severity-table.ts.txt; severity-class.tsx.txt; severity-clean.tsx.txt | every commit | present |
| absence-is-not-reassurance | tests/unit/all-clear-honesty.test.ts; tests/unit/record-status.test.tsx; tests/unit/unauthored-branch-state.test.tsx; tests/unit/empty-state-honesty.test.ts | allclear-basis-free-email.html.txt; allclear-declared-unanalysed-email.html.txt; in-test: the {motor, health, home} × {clean, partial, failed, unanalysed, expired} matrix | every commit | present |
| composition-denominator-present | tests/unit/coverage-composition.test.tsx | in-test: a component render asserts the denominator element on every line | every commit | present |
| composition-sums-to-N | tests/unit/coverage-composition.test.tsx | in-test: systematic single-input ablation on every authored branch | every commit | present |
| indeterminate-rendered-when-nonzero | tests/unit/coverage-composition.test.tsx | in-test: indeterminate 0 hides the segment, 1 and all-indeterminate render it | every commit | present |
| provenance-map-completeness (build failure on unmapped category) | tests/unit/provenance-skeleton.test.ts | in-test: an invented authored slug is reported | every commit | present |
| under-review-containment | tests/unit/provenance-skeleton.test.ts | under-review-unfiltered.ts.txt; under-review-filtered.ts.txt | every commit | present |
| checklist-completable-without-extraction | — | — | — | not yet applicable (C1) |
| unconfirmed-value-not-presented-as-fact | tests/unit/record-status.test.tsx | in-test: every resolveRecordStatus caller passes confirmedAt: null | every commit | partial — `confirmed` is unreachable until C1; the per-value guard lands with C1's checklist |
| placeholder-token-leakage | tests/unit/policy-sentinels-unrenderable.test.tsx; tests/measure/metrics.ts#internalTokenLeaks | identity-render-jsx.tsx.txt; identity-render-pair.ts.txt; identity-render-bilingual-alias.ts.txt; identity-render-clean.tsx.txt; sentinel-notification-payload.json.txt | every commit | present |
| task-provenance (every task traces to a dated real-world cause) | — | — | — | not yet applicable (C5) |
| standard-attribution-present | — | — | — | not yet applicable (C4) |
| no-comparative-pricing-claim | tests/unit/no-comparative-pricing-claim.test.ts | pricing-comparative.tsx.txt; pricing-clean.tsx.txt | every commit | present |
| no-fabricated-public-count | tests/unit/no-fabricated-public-count.test.ts | public-count-scale-literal.tsx.txt; public-count-plan-mismatch.tsx.txt; public-count-stat-literal.ts.txt; public-count-clean.tsx.txt | every commit | present |
| locale purity, including report, email and public library | tests/unit/greek-string-inventory.test.ts; tests/unit/no-english-task-in-greek-copy.test.ts; tests/unit/locale-toggle-consistency.test.ts; tests/unit/locale-links.test.ts; tests/measure/metrics.ts#latinSentences | locale-ternary-greek.ts.txt; locale-call-pairs.tsx.txt; inline-el-en-pairs.tsx.txt | every commit | present |
| Greek longest-string at 320px on every new component | tests/measure/metrics.ts#clippedLabels; tests/measure/dashboard.ts#clippedContent | hook-line-overlong-el.txt; hook-line-multibyte-boundary.txt | per goal | partial — the B1 record-status and B3 provenance labels were checked by a ≤24-character proxy, not yet by a 320px capture |
| duplicate-fact and duplicate-action | tests/measure/metrics.ts#duplicateFacts; tests/measure/metrics.ts#duplicateActions; tests/unit/count-instrumentation-registry.test.tsx | count-key-unregistered.tsx.txt; tests/measure/duplicate-facts-probe.spec.ts | per goal (facts also every commit via the registry) | present |
| count consistency across render sites | tests/measure/dashboard.ts#countConsistency; tests/unit/count-instrumentation-registry.test.tsx | count-copy-agreement.ts.txt; count-key-unregistered.tsx.txt | every commit | present |
| tap targets 44×44 | tests/unit/tap-target-floor.test.tsx; tests/measure/metrics.ts#smallTapTargets | clamp-enumeration-probe.tsx.txt | every commit | present |
| contrast 1.4.3 and 1.4.11 | tests/unit/text-contrast.test.ts; tests/unit/contrast-tokens.test.ts; tests/unit/dark-mode-contrast.test.ts; tests/unit/solid-panel-contrast.test.ts; tests/unit/token-contrast-contract.test.ts; tests/measure/metrics.ts#contrastFailures; tests/measure/metrics.ts#nonTextContrastFailures | always-dark-themed-class.tsx.txt | every commit | present |

Every-commit set the spec names — score-absence, under-review-containment, placeholder-token-leakage,
absence-is-not-reassurance, no-fabricated-public-count — all under `tests/unit`, all with probes.

Two guards written in this series that the spec did not name, kept for the same reason: `gap-instance-single-writer`
(one writer of gap rows) and `gap-readers-exclude-superseded` (every reader filters to live rows), both with probe pairs;
and `dashboard-counts-are-doors` (B4: every rendered count navigates), source-level with render checks.
