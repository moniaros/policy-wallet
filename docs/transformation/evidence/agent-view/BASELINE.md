# BASELINE — Σύμβουλος `/agent` — T-015, PW-MOBILE-TRANSFORM-01

**Date:** 2026-08-23 · **Branch:** NEW-UI · **Surface:** `/agent` (authenticated policyholder's
adviser view — NOT the B2B agent console) · **Locale:** `el`
**Harness:** `tests/measure/metrics.ts` + `tests/measure/surface-harness.ts` +
`tests/measure/agent-view-baseline.spec.ts` (paid) + `tests/measure/agent-view-free.spec.ts` (free).
**Run:** `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npx playwright test --project=measure agent-view-baseline` / `--project=measure-free agent-view-free`

## Two harness defects found and fixed on THIS surface specifically (read before the numbers)

`/agent` (`app/(protected)/agent/AgentClient.tsx`) is the surface that exposed both of this run's
generic-harness assumptions as wrong, back to back:

1. **`.pw-page-shell` is not universal.** `AgentClient.tsx` uses NEITHER `.pw-page-shell` NOR an
   `<h1>`-per-se convention the way most other B2C surfaces do. `openSurface`'s readiness wait (which
   defaulted to `.pw-page-shell`) waited the full 45s×2 for a selector that can never appear on this
   page — confirmed by a direct server-rendered `curl` fetch (bypassing the browser and Playwright
   entirely) returning real, complete content in ~5s while the Playwright capture kept "refusing to
   measure". Fixed: `openSurface`'s default is now `main#main-content`, the one element every
   `app/(protected)/**` route has because `AppShell` (mounted once, in the shared layout) wraps every
   page's children in it — confirmed present in the raw HTML.
2. **`sectionCount()` structurally cannot return >0 here.** Its definition (unchanged, `metrics.ts`)
   only ever matches `section[id]` elements or direct children of `.pw-page-shell` — with neither
   present, the count is 0 regardless of real content, and the harness's own "refuse a non-render
   below 1 section" floor treated every real capture of this page as a crash. Fixed:
   `assertRendered`/`captureSurface` gained a `minSections` parameter (default 1, explicitly 0 on this
   surface's calls) — documented in-line so the exception is visible, not silently baked into a
   changed default.

Both fixes are now in `tests/measure/surface-harness.ts` for every future surface with the same shape.

## Confirmed finding: the "unmodified relationship" state is NOT what it was intended to be

Both captures in this pass — `no-advisor-fixture-paid` (before any fixture) and `connected-paid`
(after `applyLongAdvisorFixture`) — are **byte-identical** (`fullText` compared directly: `True`).
Investigated rather than published as-is: `e2e-ph@policywallet.test` already carries a real, ACTIVE
`CustomerRelationship` to `e2e-agent@policywallet.test` ("Νίκος Παπαδόπουλος") from other E2E specs
(agent-journey and siblings), and the page's query
(`db.customerRelationship.findFirst({ where: { policyholderUserId, status: 'active' } })`) has no
`orderBy`, so it returns whichever row the database happens to return first — the pre-existing
relationship, not the newly-created long-name one. **Consequence: this pass captured ONE real state
(connected to a real advisor), not two, and never exercised the long-insurer-name-style truncation
candidate the `applyLongAdvisorFixture` fixture was built for.** Relabelled below accordingly rather
than reporting two states that are actually one.

## 0a. Metric table — 3 widths, the one real state captured (paid)

| width | scrollHeight | screens | sections | containers/depth | sub-44 | 1.4.3 | **1.4.11** | truncation | leaks |
|---|---|---|---|---|---|---|---|---|---|
| 320 | 1191 | 1.7 | 0 | 18/4 | 0 | 0 | 7 | 9 | 1 |
| 390 | 1067 | 1.3 | 0 | 18/4 | 0 | 0 | 7 | 9 | 1 |
| 430 | 1076 | 1.2 | 0 | 18/4 | 0 | 0 | 7 | 7 | 1 |

`sections = 0` at every width is the harness limitation above, not the page being empty — 1191px of
real content renders (advisor card, tab bar, shared-policy list, disconnect card).

## 0b. Confirmed findings — sharpens two already-suspected candidates with real measurements

### Confirms LEDGER row S-02, and it is WORSE than the ledger's own note
`docs/transformation/LEDGER.md`: *"Four tabs: overview · messages · documents · proposals — §4.3
records the fourth clipped."* Measured: **all four clip**, not only the fourth —
«Επισκόπηση» 102/61px, «Μηνύματα» 88/56px, «Έγγραφα» 81/53px, «Προτάσεις» 90/56px (`scrollWidth/
clientWidth`, 320px). The tab STRIP itself also overflows its row (`div.flex.gap-1`, 279/254px).

### Confirms candidate #2.5's «Νίκος Παπαδό…» — the advisor's own name clips severely
`<h1 class="text-2xl font-black">Νίκος Παπαδόπουλος</h1>` measures **266px content in a 114px box** —
under HALF the name fits at 320px. This is the single worst truncation ratio measured on any surface
in this pass.

### 1.4.11 — 4 of 7 findings are `control` class (gated), on THIS surface unlike the healthy wallet-detail matrix
- «Επισκόπηση» tab, 1.25:1
- «Email» link, 1.12:1
- «Ανάκληση» (revoke share) button, 1.14:1 — a DESTRUCTIVE-adjacent control with a near-invisible boundary
- (a fourth, in the raw JSON)

### Leak (fixture noise, not a product defect)
`internalTokenLeaks` flags `"Interamerican · E2E-MOT-001"` as an "E2E fixture identifier" — this is
the shared-policy line item rendering a real (fixture) policy number that happens to start with the
literal string "E2E", a false positive of the leak probe's own pattern on a fixture artifact, not a
production-reachable string. Noted so it is not miscounted as a leak in any rollup.

## FREE tier — a genuinely DIFFERENT state, and it is the true "no advisor" empty state

`e2e-ph-free@policywallet.test` carries no pre-existing relationship, so this capture is what the
paid account's label falsely claimed to be: *"Συνδεθείτε με τον ασφαλιστικό σας σύμβουλο"* ("Connect
with your insurance advisor"), with a labelled **«ΠΑΡΑΔΕΙΓΜΑ»** (EXAMPLE) mock preview card
("Γιώργος Π. — Ασφαλιστικός σύμβουλος") showing what a connected view would look like.

| width | scrollHeight | screens | sections | containers/depth | sub-44 | 1.4.3 | 1.4.11 | truncation | leaks |
|---|---|---|---|---|---|---|---|---|---|
| 320 | 1072 | 1.5 | 0 | 14/4 | 1 | 0 | 2 | 3 | 0 |
| 390 | 988 | 1.2 | 0 | 14/4 | 0 | 0 | 2 | 2 | 0 |
| 430 | 1076 | 1.2 | 0 | 14/4 | 0 | 0 | 2 | 2 | 0 |

**A confirmed layout defect specific to this state, at 320px:** the EXAMPLE card's name/subtitle text
containers measure `clientWidth: 1` — effectively collapsed to nothing — while `scrollWidth` is 24px
and 248px respectively. The text still renders (browsers paint overflow content), but the box meant
to hold it has collapsed, which is a flex/sizing defect on the invite-preview card, not a truncation
in the normal sense (truncation implies a box that is too small but non-zero; this box has no width
at all). Not present at 390/430.

**1.4.11 control findings:** «Αποστολή πρόσκλησης» (Send invitation) button, 2.74:1 — close to the
3:1 floor but under it; «Σύμβουλος» (Adviser) nav link, 1.25:1.

**Sub-44px, 320px only:** an unlabelled `<input>` at 34×45 (width fails by 10px) — present at 320px
only, absent at 390/430 (the input presumably grows past 44px once its container has room).

## Not captured in this pass
- The long-insurer-name-style advisor truncation candidate — masked by the pre-existing relationship
  on the paid account (see above); the free account's example card uses a short fixed name so it
  cannot reproduce this candidate either.
- Messages / Documents / Proposals tab CONTENTS on the connected (paid) view — only the Overview tab
  (the tab `findFirst`/default selection lands on) was captured; the other three tabs' own content
  was not opened and measured.
- The actual "connect an adviser" FLOW (clicking «Αποστολή πρόσκλησης» and completing it) — only the
  landing state of the free account's empty view was captured.

---

## Second pass (T-016b) — the genuine paid "no advisor" empty state

§5.3 requires the empty state, and the shared fixture account could not produce it: it carries a
pre-existing `CustomerRelationship`, so `/agent` never rendered its empty case at paid tier. A
genuine no-relationship paid fixture now exists.

| capture | scroll @320 | sections | containers/depth | sub-44 | truncation | leaks |
|---|---|---|---|---|---|---|
| `no-advisor-genuine-paid` | 1072 | 0* | 14/4 | 1 | 0 | 0 |
| `no-advisor-fixture-free` (free tier, from the FREE tier table above) | 1072 | 0* | 14/4 | 1 | 0 | 0 |

`*` the known no-`section[id]` artifact on this surface.

**`no-advisor-genuine-paid` is byte-identical in every metric to the free tier's own empty state**
(1072px, 14 containers, 1 sub-44, at every one of the three widths) — confirming what the code
already implies: `NoAgentEmptyState` (`AgentClient.tsx`) takes no tier prop, so its markup does not
vary by plan. This is the FIRST genuine measurement of the paid-tier empty state; T-015 never
reached it (see "Confirmed finding" above).

### CORRECTION — an earlier draft of this section reported a second "deactivated relationship"
### rendering (1191px/18 containers) that does not exist; it was the SAME mislabeled capture T-015
### already found and named, read a second time

An intermediate version of this document reused `no-advisor-fixture-paid` (T-015's own capture,
1191px/18 containers) and presented it as a distinct "relationship deactivated" empty state, sitting
alongside `no-advisor-genuine-paid` as if the two were different product renderings. They are not.
`no-advisor-fixture-paid` is the EXACT SAME capture the "Confirmed finding" section above already
identified and explained: the connected-advisor page (Νίκος Παπαδόπουλος's card, tab bar, shared-
policy list), byte-identical to `connected-paid` — not a variant of the empty state at all, just the
same T-015 mislabeling read again without re-checking the earlier finding.

The actual bug behind it, found while building `no-advisor-genuine-paid`: `e2e-ph@policywallet.test`
carries **two** `CustomerRelationship` rows, not one (`cmrynz33t...`, created 2026-07-24, and
`cmt6206v6...`, created 2026-08-23) — both `active`. The first version of
`wallet-edit-and-agent-noadvisor-baseline.spec.ts`'s relationship-terminating test used
`findFirst({ orderBy: { createdAt: "desc" } })`, which only ever sees the newest, so terminating it
left the OLDER relationship active — and `/agent`'s own query (`where: { status: "active" }`, no
`orderBy`) found that one instead, rendering "connected" regardless. That first run's capture
(1191px/18 containers) is arithmetically identical to `no-advisor-fixture-paid` for exactly this
reason: both are the SAME underlying bug (an active relationship the test failed to remove), not two
independent samples of two different real states. Fixed by terminating EVERY non-terminated
relationship for the duration of the capture, not just the one the query happens to return first —
`no-advisor-genuine-paid` is the corrected result, verified against the DB directly afterward (both
relationships restored to `active`).

**There is one genuine paid "no advisor" empty state, and it matches free tier exactly.** The §4.4.3
"one empty state per component" concern this section previously raised does not apply here — retract
it. What DOES generalize from this: a relationship-count assumption ("the account has at most one")
baked into a test can silently reproduce the exact defect class T-015's own "unmodified relationship"
finding warned about, even in a spec written specifically to work around it.
