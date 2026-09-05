# B4 — dashboards become routers: before / after (PW-TRANSPARENCY-02)

**Runs:** `data/b4-before` (tree at NEW-UI `85088850` + B1/B3 branch, before any B4 change) vs `data/b4-after` (the same tree with the B4 change). Same metric definitions (`tests/measure/metrics.ts`, `tests/measure/dashboard.ts`), same accounts, same fixtures, same widths. Captured by `tests/measure/dashboard-b4.spec.ts` (B2C: the dedicated dashboard account, portfolio states rebuilt per test) and `tests/measure/agent-book-b4.spec.ts` (B2B: the E2E agent account wired by `scripts/seed-agent-demo.mjs`).

Sections use the shared collector's definition (`section[id]` plus top-level perceived groupings); the B2C figure of 2 is what that definition measures on this layout — the same value before and after, so it is comparable, not a target met by relabelling. The empty B2C state renders onboarding («Τι σε έφερε εδώ;»), not the dashboard, and is reported as measured.

## Acceptance, measured

| audience | capture | sections (≤6) | dup facts (0) | counts w/o door (0) | primary actions (1) | scroll px (↓) | sub-44 (0) | renewals in 1st viewport | life events above findings |
|---|---|---|---|---|---|---|---|---|---|
| b2c-home | empty-320 | 2 | 0 | 0 | 0 | 767 | 0 | no → no | no → no |
| b2c-home | empty-390 | 2 | 0 | 0 | 0 | 844 | 0 | no → no | no → no |
| b2c-home | empty-430 | 2 | 0 | 0 | 0 | 932 | 0 | no → no | no → no |
| b2c-home | heavy-320 | 2 → **7** † | 0 | 9 → **0** | 2 → **1** | 5755 → **5751** | 0 | no → yes | no → yes |
| b2c-home | heavy-390 | 2 → **7** † | 0 | 9 → **0** | 2 → **1** | 5331 → **5345** ⚠ | 0 | no → yes | no → yes |
| b2c-home | heavy-430 | 2 → **7** † | 0 | 9 → **0** | 2 → **1** | 4987 → **4981** | 0 | no → yes | no → yes |
| b2c-home | typical-320 | 2 → **7** † | 0 | 6 → **0** | 2 → **1** | 5010 → **5012** ⚠ | 0 | no → yes | no → yes |
| b2c-home | typical-390 | 2 → **7** † | 0 | 6 → **0** | 2 → **1** | 4651 → **4671** ⚠ | 0 | no → yes | no → yes |
| b2c-home | typical-430 | 2 → **7** † | 0 | 6 → **0** | 2 → **1** | 4391 | 0 | no → yes | no → yes |
| b2b-book | agent-book-320 | 12 → **5** | 0 | 2 → **0** | 1 | 4287 | 2 → **0** | — | — |
| b2b-book | agent-book-390 | 12 → **5** | 0 | 2 → **0** | 1 | 3970 | 2 → **0** | — | — |
| b2b-book | agent-book-430 | 12 → **5** | 0 | 2 → **0** | 1 | 3902 | 2 → **0** | — | — |

`a → **b**` marks a change; ⚠ marks a change in the wrong direction. † the before figure is the section collector's artefact: with no `section[id]` on the page the whole content grid counted as ONE grouping (plus the title row); the same cards counted one by one were eleven. The after figure is the honest count: **six labelled regions plus the page header (h1 + upload action), which the collector counts as a seventh grouping.** A first pass folded the title row into the overview region to read 6; that was done for the number and was reverted (verification V4a). Scroll height fell at 320 and 430 on both portfolios and rose at 390 (+10 / +16 px, a wrapping difference of the 44px count doors) — reported as measured, not netted. "Renewals in first viewport" is true when the renewals card or a renewal fact that is a door to it (`#renewals`) starts inside the viewport; the before-run captured only the card position, so the before value reflects the card alone.

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

## Where each count now leads (B2C)
- hero facts: `portfolio.policyCount`, `expiredCount`, `neverAnalysedCount`, `failedCount`, `premiumNoAmountCount` → `/wallet` (the list they count is the wallet); `expiringCount` → `#renewals` (the timeline that lists them); `unassessedCount` → `/protection?lens=branch`.
- `portfolio.renewalsNext180Count` → `#renewals`; `plan.stepsDone/Total` → `#protection-plan` (the step list under the count).
- `recommendation.openCount` → `#attention`; `needs.*` and `attention.*` → `/protection?lens=risk` (unsure → the wizard anchor; covered → the branch lens); `gap.provenanceCount` → `/protection?lens=risk`; `portfolio.assessedCount` → `/wallet`, `portfolio.unassessedCount` → `/protection?lens=branch`.

## Where each count now leads (B2B)
- KPI tiles (`agent.*`): clients → `/customers`; expiring → `/customers?filter=expiring`; gaps → `/customers?filter=gaps`; invites → `/customers?filter=invited`; follow-ups → `/tasks`; pipeline → `/opportunities`; completeness → `/customers`. The `filter` parameter is carried for the customer list to honour; until it does, the door lands on the full list (recorded in PROGRESS as a follow-up).
- client card chips (`client.openGapCount`, `client.unassessedPolicyCount`) → `/customers/{id}`.

## V4(b) — overlapping hit areas (layout integrity), after

Two interactive elements whose boxes intersect, neither an ancestor of the other (`overlappingHitAreas`, tests/measure/metrics.ts). **B4 is not done until this is zero.**

| capture | overlapping pairs | first pairs |
|---|---|---|
| agent-book-320 | **7** | a «Ειδοποιήσεις3» × button «ΕΛ» (440px²); a «Ειδοποιήσεις3» × button «EN» (440px²); a «Ειδοποιήσεις3» × button «Εναλλαγή θέματος» (440px²); a «Προφίλ Συμβούλου» × button «ΕΛ» (1408px²); … |
| agent-book-390 | **9** | a «Ρυθμίσεις» × button «ΕΛ» (880px²); a «Ρυθμίσεις» × button «EN» (880px²); a «Ρυθμίσεις» × button «Εναλλαγή θέματος» (880px²); a «Σύνολο πελατών1» × a «Πίνακας ελέγχου» (1936px²); … |
| agent-book-430 | **8** | a «Κέντρο βοήθειας» × button «ΕΛ» (212px²); a «Κέντρο βοήθειας» × button «Αποσύνδεση» (1504px²); a «Με κενά κάλυψης1» × a «Πίνακας ελέγχου» (1669px²); a «Με κενά κάλυψης1» × a «Πελάτες» (1669px²); … |
| heavy-320 | **8** | a[portfolio.expiredCount] «1 έχει λήξει» × a «Αρχική» (1717px²); a[portfolio.expiredCount] «1 έχει λήξει» × a «Φάκελος» (1717px²); a[portfolio.expiredCount] «1 έχει λήξει» × a «Προστασία» (1238px²); a[portfolio.expiringCount] «2 λήγουν μέσα σε 30 ημέρες» × a «Αρχική» (219px²); … |
| heavy-390 | **6** | a[portfolio.neverAnalysedCount] «1 δεν έχει αναλυθεί» × a «Αρχική» (133px²); a[portfolio.neverAnalysedCount] «1 δεν έχει αναλυθεί» × a «Φάκελος» (133px²); a[portfolio.neverAnalysedCount] «1 δεν έχει αναλυθεί» × a «Προστασία» (133px²); a[portfolio.failedCount] «1 δεν διαβάστηκε» × a «Αρχική» (1803px²); … |
| heavy-430 | **4** | a «Έλεγχος της προστασίας μου» × a «Αρχική» (1744px²); a «Έλεγχος της προστασίας μου» × a «Φάκελος» (1744px²); a «Έλεγχος της προστασίας μου» × a «Προστασία» (1744px²); a «Έλεγχος της προστασίας μου» × a «Σύμβουλος» (493px²) |
| typical-320 | **9** | a[portfolio.expiringCount] «1 λήγει μέσα σε 30 ημέρες» × a «Αρχική» (1717px²); a[portfolio.expiringCount] «1 λήγει μέσα σε 30 ημέρες» × a «Φάκελος» (1717px²); a[portfolio.expiringCount] «1 λήγει μέσα σε 30 ημέρες» × a «Προστασία» (1717px²); a[portfolio.expiringCount] «1 λήγει μέσα σε 30 ημέρες» × a «Σύμβουλος» (1717px²); … |
| typical-390 | **0** |  |
| typical-430 | **2** | a «3 από 6 ολοκληρωμένα» × a «Σύμβουλος» (449px²); a «3 από 6 ολοκληρωμένα» × a «Ρυθμίσεις» (1600px²) |

The B2C pairs at 320/430 are the hero fact pills (44px boxes with negative margins) intersecting their neighbours, and on the agent book the sticky top bar's settings link and language/theme buttons overlapping the KPI tiles beneath — the shell overlap predates B4. Not fixed in the verification block (fix scope was V3 only).
