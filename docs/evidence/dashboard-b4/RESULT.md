# B4 — dashboards become routers: before / after (PW-TRANSPARENCY-02)

**Runs:** `data/b4-before` (tree at NEW-UI `85088850` + B1/B3 branch, before any B4 change) vs `data/b4-after` (the same tree with the B4 change). Same metric definitions (`tests/measure/metrics.ts`, `tests/measure/dashboard.ts`), same accounts, same fixtures, same widths. Captured by `tests/measure/dashboard-b4.spec.ts` (B2C: the dedicated dashboard account, portfolio states rebuilt per test) and `tests/measure/agent-book-b4.spec.ts` (B2B: the E2E agent account wired by `scripts/seed-agent-demo.mjs`).

Sections use the shared collector's definition (`section[id]` plus top-level perceived groupings); the B2C figure of 2 is what that definition measures on this layout — the same value before and after, so it is comparable, not a target met by relabelling. The empty B2C state renders onboarding («Τι σε έφερε εδώ;»), not the dashboard, and is reported as measured.

## Acceptance, measured

| audience | capture | sections (≤6) | dup facts (0) | counts w/o door (0) | primary actions (1) | scroll px (↓) | sub-44 (0) | overlaps (0) | renewals in 1st viewport | life events above findings |
|---|---|---|---|---|---|---|---|---|---|---|
| b2c-home | empty-320 | 2 | 0 | 0 | 0 | 767 | 0 | 0 | no → no | no → no |
| b2c-home | empty-390 | 2 | 0 | 0 | 0 | 844 | 0 | 0 | no → no | no → no |
| b2c-home | empty-430 | 2 | 0 | 0 | 0 | 932 | 0 | 0 | no → no | no → no |
| b2c-home | heavy-320 | 2 → **7** ⚠ | 0 | 9 → **0** | 2 → **1** | 5755 → **5751** | 0 | 0 | no → yes | no → yes |
| b2c-home | heavy-390 | 2 → **7** ⚠ | 0 | 9 → **0** | 2 → **1** | 5331 → **5345** ⚠ | 0 | 0 | no → yes | no → yes |
| b2c-home | heavy-430 | 2 → **7** ⚠ | 0 | 9 → **0** | 2 → **1** | 4987 → **4981** | 0 | 0 | no → yes | no → yes |
| b2c-home | typical-320 | 2 → **7** ⚠ | 0 | 6 → **0** | 2 → **1** | 5010 → **5012** ⚠ | 0 | 0 | no → yes | no → yes |
| b2c-home | typical-390 | 2 → **7** ⚠ | 0 | 6 → **0** | 2 → **1** | 4651 → **4671** ⚠ | 0 | 0 | no → yes | no → yes |
| b2c-home | typical-430 | 2 → **7** ⚠ | 0 | 6 → **0** | 2 → **1** | 4391 | 0 | 0 | no → yes | no → yes |
| b2b-book | agent-book-320 | 12 → **5** | 0 | 2 → **0** | 1 | 4287 | 2 → **0** | 0 | — | — |
| b2b-book | agent-book-390 | 12 → **5** | 0 | 2 → **0** | 1 | 3970 | 2 → **0** | 0 | — | — |
| b2b-book | agent-book-430 | 12 → **5** | 0 | 2 → **0** | 1 | 3902 | 2 → **0** | 0 | — | — |

`a → **b**` marks a change; ⚠ marks a change in the wrong direction. "Renewals in first viewport" is true when the renewals card or a renewal fact that is a door to it (`#renewals`) starts inside the viewport; the before-run captured only the card position, so the before value reflects the card alone.

## Primary action per surface, after
- `empty-320`: none
- `empty-390`: none
- `empty-430`: none
- `heavy-320`: «Προσθέστε νέο ασφαλιστήριο» → /wallet/add
- `heavy-390`: «Προσθέστε νέο ασφαλιστήριο» → /wallet/add
- `heavy-430`: «Προσθέστε νέο ασφαλιστήριο» → /wallet/add
- `typical-320`: «Προσθέστε νέο ασφαλιστήριο» → /wallet/add
- `typical-390`: «Προσθέστε νέο ασφαλιστήριο» → /wallet/add
- `typical-430`: «Προσθέστε νέο ασφαλιστήριο» → /wallet/add
- `agent-book-320`: «Νέος πελάτης» → null
- `agent-book-390`: «Νέος πελάτης» → null
- `agent-book-430`: «Νέος πελάτης» → null

## Counts still without a door, after
- none

## R4 — overlapping hit areas, final

`overlappingHitAreas` pairs every interactive element IN THE PAGE FLOW (an off-canvas drawer's contents and anything inside a fixed or sticky bar are out of scope by definition — a bottom navigation overlays whatever scrolls behind it). The column above is that reading: **0 on every capture, both audiences, 320/390/430**. The diagnosis run (`data/r4-diag/`) recorded both readings with element boxes:

| capture | page-flow pairs | including shell (fixed bars + off-canvas) | first shell pair |
|---|---|---|---|
| B2C typical@320 | 0 | 9 | a[portfolio.expiringCount] «1 λήγει μέσα σε 30 ημέρες» [39,653,217,44] × a «Αρχική» [42,658,44,44] |
| B2C typical@430 | 0 | 2 | a «3 από 6 ολοκληρωμένα» [273,878,124,44] × a «Σύμβουλος» [241,870,44,44] |
| agent-book@320 | 0 | (see the verification report: 7–9 before scoping) | drawer footer: «Ρυθμίσεις» [-260,698,247,44] × «ΕΛ» [-163,722,44,44]; bottom bar: «Σύνολο πελατών» × «Πίνακας ελέγχου» |
| agent-book@390 | 0 | (see the verification report: 7–9 before scoping) | drawer footer: «Ρυθμίσεις» [-260,698,247,44] × «ΕΛ» [-163,722,44,44]; bottom bar: «Σύνολο πελατών» × «Πίνακας ελέγχου» |
| agent-book@430 | 0 | (see the verification report: 7–9 before scoping) | drawer footer: «Ρυθμίσεις» [-260,698,247,44] × «ΕΛ» [-163,722,44,44]; bottom bar: «Σύνολο πελατών» × «Πίνακας ελέγχου» |


**B4 introduced none.** The hero fact pills, the header count doors and the inline count doors carry `min-h-11` with small negative vertical margins, and the boxes show no pair of them intersecting (rows sit further apart than the margin extends). The earlier "2–9 pairs per capture" in the verification report were the two shell cases below, counted before the metric was scoped; my prose then attributed the B2C pairs to the pills without boxes to show it — corrected here.

**Pre-existing app-shell items (reported, not fixed — neither is cheap and contained):**
1. The navigation drawer's footer: the «Ρυθμίσεις» link's box (247×44) spans under the language and theme toggles (three 44×44 buttons) — three intersecting targets inside the closed drawer. Proposed owner: app shell / navigation (`components/shell/AppShell.tsx`).
2. The fixed bottom navigation bar overlays the content row at the fold on every scroll position (KPI tiles under «Πίνακας ελέγχου» / «Πελάτες» / «Ευκαιρίες» links). Standard for a fixed bar; the page's bottom inset is what keeps the LAST row reachable (`bottom-inset-probe.spec.ts`). Proposed owner: app shell.

## Where each count now leads (B2C)
- hero facts: `portfolio.policyCount`, `expiredCount`, `neverAnalysedCount`, `failedCount`, `premiumNoAmountCount` → `/wallet` (the list they count is the wallet); `expiringCount` → `#renewals` (the timeline that lists them); `unassessedCount` → `/protection?lens=branch`.
- `portfolio.renewalsNext180Count` → `#renewals`; `plan.stepsDone/Total` → `#protection-plan` (the step list under the count).
- `recommendation.openCount` → `#attention`; `needs.*` and `attention.*` → `/protection?lens=risk` (unsure → the wizard anchor; covered → the branch lens); `gap.provenanceCount` → `/protection?lens=risk`; `portfolio.assessedCount` → `/wallet`, `portfolio.unassessedCount` → `/protection?lens=branch`.

## Where each count now leads (B2B)
- KPI tiles (`agent.*`): clients → `/customers`; expiring → `/customers?filter=expiring`; gaps → `/customers?filter=gaps`; invites → `/customers?filter=invited`; follow-ups → `/tasks`; pipeline → `/opportunities`; completeness → `/customers`. The `filter` parameter is carried for the customer list to honour; until it does, the door lands on the full list (recorded in PROGRESS as a follow-up).
- client card chips (`client.openGapCount`, `client.unassessedPolicyCount`) → `/customers/{id}`.
