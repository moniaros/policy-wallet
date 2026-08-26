# BASELINE — the duplicate-identity-row metric — P5-wallet-00, PW-MOBILE-TRANSFORM-02

**Date:** 2026-08-25 · **Branch:** NEW-UI · **Surface:** `/wallet` (authenticated policyholder) · **Locale:** `el`
**Harness:** `tests/measure/metrics.ts` (`duplicateIdentityRows`) + `tests/measure/surface-harness.ts`
(`captureSurface` — every capture on every surface now carries this metric, not just the ones below) +
`tests/measure/wallet-identity-duplicates-baseline.spec.ts` (heavy) + `tests/measure/dashboard-wallet-
identity-duplicates.spec.ts` (typical, all-expired).
**Run:**
```
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  npx playwright test tests/measure/wallet-identity-duplicates-baseline.spec.ts --project=measure --no-deps

PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  npx playwright test tests/measure/dashboard-wallet-identity-duplicates.spec.ts --project=measure-dash --no-deps
```

## Status: gate condition met — 3/3 fixtures × 3/3 widths captured, all passed

## Directory discrepancy — resolved

This item's file boundary names `docs/transformation/evidence/wallet/**`. The wallet surface's existing
T-015 evidence (`wallet-list-baseline.spec.ts` / `wallet-list-free.spec.ts`, the 15+2-policy captures)
already lives at `docs/transformation/evidence/wallet-list/`. **Resolution: this item writes to
`evidence/wallet/` — the boundary as stated — rather than appending to `wallet-list/`.** The two
directories now both describe `/wallet` and should be consolidated the next time either is touched;
not done here because moving `wallet-list/`'s existing BASELINE.md and data was outside this item's
write boundary. Flagged in the report back, not silently left inconsistent.

## The metric, exactly as measured

For each rendered wallet row, `duplicateIdentityRows` (`tests/measure/metrics.ts`) extracts the
concatenated text of four IDENTITY fields — **insurer, line of business, date, status** — deliberately
**excluding the policy number** (the disambiguator; including it would make every row unique and prove
nothing). Two rows are counted as duplicates when this four-field string is **byte-identical**. Reported
per capture: **raw duplicate-row count** (how many rows belong to some group of ≥2) and **largest
identical-group size**.

The function is called unconditionally inside `captureSurface` (`tests/measure/surface-harness.ts`), so
every capture this run takes from now on — on any surface, not just `/wallet` — carries this metric. A
surface with no `[data-testid="policy-card"]` rows (e.g. `/dashboard`, `/account/*`) simply reports
`totalRows: 0`.

## Which renderer was measured

**`PolicyCard`, the grid renderer — the ONLY one the 320/390/430 capture matrix can ever render.**
`PolicyWallet.tsx` renders cards unconditionally below the `lg` breakpoint and gates `PolicyTable` (the
list/table renderer) behind `hidden xl:block`, with its own comment: *"cards are ALWAYS the presentation
below lg ... the view toggle is itself desktop-only."* `xl` is 1280px; nothing in this matrix reaches it.
`duplicateIdentityRows` also implements a TABLE-shape extraction path (both renderers share the
`[data-testid="policy-card"]` hook), but that path is **unverified** — no capture in this run ever
produced a `<tr>` row to exercise it.

## How each of the four identity fields was located (verified against the PolicyCard shape)

Neither renderer has a literal `<a href="/wallet/<id>">` — both navigate via `router.push` on click — so
a row is identified by the `[data-testid="policy-card"]` hook (the same one `PolicyTable.tsx`'s own
comment names: *"the wallet defaults to LIST view, so tagging only the grid card left the audit finding
no policy at all"*), not a link.

| field | how it was located | source |
|---|---|---|
| **insurer** | the row's only `span.truncate` inside the clickable button | `PolicyCard.tsx:138` assigns `displayInsurer` to exactly this element |
| **line of business** | the LOB paragraph's own leading text node (before any child span) | `PolicyCard.tsx:149-150` renders `{localizedLob}` as a bare expression immediately followed by the conditional `· <expiry>` fragment, so the first text node is the LOB label alone |
| **date** | the element carrying `data-fact="policy.daysRemaining"` | `PolicyCard.tsx:157`. Despite the key name this is the card's ONE displayed date/expiry signal — `formatRelativeExpiry` returns a relative count inside 60 days and the formatted END DATE beyond that. **Absent from the DOM entirely** (not merely empty) when the card shows nothing (`analyzing`, or no resolvable end date) — treated as `""`, not an extraction failure, because that IS the row's content |
| **status** | the row's only `span.rounded-full` | the one element `StatusPill` renders (`components/ui/StatusPill.tsx`); distinguished from the branch-icon chip, which is `rounded-lg`, never `rounded-full` |

None of the 29+3+4 = 36 rows measured across all 9 captures had an unlocatable field
(`unlocatable: []` on every capture) — insurer, line-of-business and status were found on every row by
the selectors above, with no fallback or substitution needed.

## Results — raw duplicate count and largest group, per fixture per width

| fixture | width | rows | comparable | **duplicate rows** | **largest group** |
|---|---|---|---|---|---|
| heavy (measure account, real) | 320 | 29 | 29 | **19** | **6** |
| heavy | 390 | 29 | 29 | **19** | **6** |
| heavy | 430 | 29 | 29 | **19** | **6** |
| typical (`dashboard-fixtures.ts`) | 320 | 3 | 3 | **0** | **0** |
| typical | 390 | 3 | 3 | **0** | **0** |
| typical | 430 | 3 | 3 | **0** | **0** |
| all-expired (`dashboard-fixtures.ts`) | 320 | 4 | 4 | **0** | **0** |
| all-expired | 390 | 4 | 4 | **0** | **0** |
| all-expired | 430 | 4 | 4 | **0** | **0** |

**Target after the reframe: 0.** The metric is width-invariant within a fixture (expected: the four
identity fields are text content, not layout — 320/390/430 render the same words in a differently-sized
box), so a single width would have been sufficient evidence per fixture; all three were still captured
per the acceptance criteria.

### The heavy wallet's 6 duplicate groups (identical at all three widths)

| count | insurer · line of business · date · status |
|---|---|
| **6** | Interamerican · Αυτοκίνητο · 06/02/2027 · ΕΝΕΡΓΟ |
| 3 | Interamerican · Αυτοκίνητο · Έληξε στις 05/05/2026 · ΛΗΓΜΕΝΟ |
| 3 | Interamerican · Αυτοκίνητο · σε 13 ημέρες · ΛΗΓΕΙ ΣΥΝΤΟΜΑ |
| 3 | Εθνική Ασφαλιστική · Υγεία · 06/02/2027 · ΕΝΕΡΓΟ |
| 2 | Εθνική Ασφαλιστική · Υγεία · 04/02/2027 · ΕΝΕΡΓΟ |
| 2 | Interamerican · Αυτοκίνητο · 05/02/2027 · ΕΝΕΡΓΟ |

6 + 3 + 3 + 3 + 2 + 2 = 19, matching `duplicateRowCount`. The largest group — **six separate policies**
rendering as `Interamerican · Αυτοκίνητο · 06/02/2027 · ΕΝΕΡΓΟ` — is genuinely indistinguishable on the
wallet surface without opening each one: a customer scanning this list has no way to tell which of the
six is the one they came to check, other than trial and error. This is the exact condition the §7.3 asset
reframe is premised on, now measured rather than argued.

## Does the 29-policy wallet actually have duplicate-identity rows?

**Yes — 19 of 29 rows (65%) belong to a duplicate group, with a largest group of 6.** This is real,
accumulated fixture data on the `measure` project's own account (`e2e-ph@policywallet.test`), not a
constructed worst case: the account has grown to 29 policies as a side effect of every other T-015/T-016
spec that provisions against it, and several of those specs deliberately create near-identical policies
(same insurer, same line, same relative dates) because they were testing something else (D11-class
"display values identical to a sibling policy" fixtures, motor/health matrix repetition, etc.). The
duplication is not manufactured for this measurement — it is what the realistic, rough-edged heavy
wallet already looks like.

## Fixture notes

**Heavy (29) — no provisioning needed.** This is NOT `dashboard-fixtures.ts`'s 12-policy `heavy`
`PortfolioState` of the same name. It is the `measure` project's own account, confirmed by direct DB
query before capture to hold 29 live policies (`tests/measure/wallet-identity-duplicates-baseline.spec.ts`'s
`beforeAll` re-verifies this — and asserts ≥20 — on every run, as the staleness/regression guard).

**Typical (3) and all-expired (4) — reused `dashboard-fixtures.ts`'s `applyPortfolioState`, redirected
at `/wallet`.** Nothing about `applyPortfolioState` or `/wallet` is dashboard-specific; pointing the
existing fixture mechanism at a different page is reuse, not a new mechanism, per the item's instruction.

**Contamination found and cleaned before capture.** A direct DB check found the dashboard account
(`e2e-ph-dash@policywallet.test`) holding 34 policies, not the ≤12 any `PortfolioState` would produce —
22 of them `E2E-DASH-UNK-MOT-*`, leftover from `applyUnknownHouseholdFixture` (dashboard-fixtures.ts),
created 2026-08-24 by a run no longer represented by any `.spec.ts` file in this directory.
`applyPortfolioState` only ever clears its own `ΣΥΜΒ-2026-*` prefix by design, so this fixture family
does not self-clean. `dashboard-wallet-identity-duplicates.spec.ts`'s `beforeAll` deletes the
`E2E-DASH-UNK-MOT-*` rows before applying each state; the spec also asserts the rendered row count
equals the fixture's own expected count (`policiesFor(state).length`) on every capture, so a future
re-contamination would fail loudly rather than silently inflate the row count.

## Anything changed outside `tests/measure/**` / `docs/transformation/evidence/wallet/**`

None. `duplicateIdentityRows` required no `data-fact` additions to reach insurer/line-of-business/status —
all three were locatable from existing DOM structure (`span.truncate`, the LOB paragraph's leading text
node, `span.rounded-full`). The one attributed field (`data-fact="policy.daysRemaining"`) already existed.
**One dev-database write was made outside the two files this item touches:** the 22 stale
`E2E-DASH-UNK-MOT-*` policy rows on `e2e-ph-dash@policywallet.test` were deleted (see "Fixture notes"
above) — a targeted cleanup of orphaned test fixture data on a dev-only E2E account, done inside
`dashboard-wallet-identity-duplicates.spec.ts`'s `beforeAll`, not by hand. No file outside the two
boundaries was edited.

## Captures not trusted / discarded

None. All 9 captures (`heavy`/`typical`/`all-expired` × 320/390/430) rendered real wallet content —
`assertRendered`'s floor and `openSurface`'s signin-bounce refusal both passed on every capture, `0`
`unlocatable` fields on every row, and the typical/all-expired row counts matched the fixture's own
expected count exactly (the `beforeAll` assertion added specifically to catch a repeat of the
contamination above).

## Gate status

**This measurement is complete.** The §7.3 asset reframe was blocked on it; per the item, that block is
now lifted. Report the numbers above back before starting the reframe.

---

## Orchestrator's reading — what this measurement decides (2026-08-25)

**The numbers, confirmed by an independent re-run rather than taken from the report:**

| fixture | rows | duplicate rows | largest group |
|---|---|---|---|
| heavy (29) | 29 | **19** | **6** |
| typical (3) | 3 | **0** | **0** |
| all-expired (4) | 4 | **0** | **0** |

Identical at 320, 390 and 430. Zero unlocatable fields across all 36 rows, so nothing was excluded
from the comparison.

### The context the measurement needs to mean anything

**Production holds exactly two wallets: one of 3 policies and one of 1.** Queried directly, not
recalled.

So the fixture that shows the defect (29 policies) is larger than any wallet that exists, and both
fixtures at realistic size score **zero**. The reframe's premise — a customer cannot tell their rows
apart — is **true at 29 policies and false at 3**.

That does not make the metric wasted; it makes it decisive in the opposite direction from the one the
phase assumed. §7.3's reasoning ("a customer thinks *my car* before *policy 4471-B*") is still sound
as design intuition. It is simply not yet a measured defect for anyone who has a wallet.

**Caveat in the other direction, which matters just as much:** CLAUDE.md records zero real users, so
prod's portfolio sizes are the owner's own accounts and are **not evidence about a real customer
base**. A household with two cars, a home and a health policy reaches 5–8 quickly. "Zero duplicates
today" is not "zero duplicates ever", and the threshold between 4 and 29 was not measured.

### The cheaper intervention this exposes

Every duplicate group is `insurer · line · date · status` — for example six rows reading
«Interamerican · Αυτοκίνητο · 06/02/2027 · ΕΝΕΡΓΟ». **What makes them indistinguishable is the
absence of the asset identifier**, and that identifier already exists in the extracted data:
`acordData.vehicle.plateNumber` and `acordData.property.address` (see `ASSET-REFRAME-SPEC.md` §1).

Putting the plate or address on the row would take those six rows to six distinct ones **without
restructuring the wallet at all** — same measured defect, a fraction of the risk, and none of the
capability-loss exposure the ledger warns about for grouping. The reframe would then have to justify
itself on something other than distinguishability.

### Recommendation

**Do not build the asset reframe on this evidence.** Re-run this metric when real portfolios exist;
it is wired into `captureSurface`, so every future capture on every surface carries it and the
after-number will be produced by the same definition as the before-number.

---

## P5-wallet-01a — partial. What is measured, and what is not (2026-08-26)

### varied-household — MEASURED at 390 and 430, and the result is decisive

**7 rows · 2 duplicate rows · largest group 2 · 0 unlocatable.**

The only duplicate group is:

```
x2   Εθνική Ασφαλιστική · Υγεία · σε 39 ημέρες · ΕΝΕΡΓΟ
```

**Two health policies on one insured party — and nothing else.** The two vehicles, the property and
the life policy all distinguish themselves already, before any identifier rule exists.

**This is exactly what H-010 predicts**, and it changes what P5-wallet-01 can achieve on a realistic
wallet: the per-line identifier rule would move **nothing** here, because the only duplicates are the
ones that carry no available identifier. Motor, property and pet are already at zero on this shape,
so their targets are met by the fixture rather than by the fix.

**It also complicates D-034's reopen trigger.** That trigger reads "a realistic household fixture
producing a non-zero count", and the count is 2 — so it fires. But the cause is **H-010, not row
structure**, and the asset reframe would not resolve it either: grouping by asset cannot distinguish
two health policies on the same person. **A mechanical reading of the trigger would reopen the wrong
item.** The trigger should test for a non-zero count *with an available identifier*.

### single-line-concentration — NOT MEASURED

Blocked on the environment, not on the work. Two captures were produced and **both were deleted
rather than published**:

- The first ran the fixture **on top of** varied-household's rows — the two fixtures cleared only
  their own policy-number prefix, so the wallet held 13 rows and the count of 8/6 described neither
  fixture. The spec's own row-count assertion caught it. **Fixed**: both fixtures now clear both
  prefixes, because they are mutually exclusive portfolio *shapes* and render into the same list.
- The retry could not reach the database at all. `connection_limit=5` is mandated locally to stay
  under the session pooler's 15-client ceiling, and that ceiling is **shared with a parallel session
  on this machine**. The app rendered its error boundary and the spec **refused to record**, which is
  the correct behaviour and the reason no bad number reached this file.

`varied-household@320` was overwritten by the contaminated run and has been deleted for the same
reason. 390 and 430 agree exactly, so the shape's result is not in doubt; the missing width is.

### Still owed
- `single-line-concentration` at all three widths, and `varied-household@320`.
- The per-line duplicate breakdown for both fixtures.

Re-run when the pooler is quiet:
`npx playwright test tests/measure/dashboard-wallet-identity-household-fixtures.spec.ts --project=measure-dash --no-deps --workers=1`

---

## P5-wallet-01a-FINISH — the three owed captures, and the per-line split (2026-08-26)

**Collector:** `tests/measure/section-collector.ts`, sha256
`4c708e16ff340b2c8506d0c55e074cd1d2dce6b8953b1e8a4604a1796e2094fc` (the corrected collector landed in
`f66dd435`, unchanged since — same file, same hash, as every other capture in this run). **Duplicate-
identity definition:** `duplicateIdentityRows()` imported unmodified from `tests/measure/metrics.ts`
(via `captureSurface` → `identityDuplicates`, `surface-harness.ts:314`); no local variant exists in
either edited file.

**Run:** pooler verified clear first (`select 1` against `DIRECT_URL`, 1655ms — comparable to the
1298ms baseline the item cites, not a new wedge). Then, foreground, one spec, one worker:
```
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  npx playwright test tests/measure/dashboard-wallet-identity-household-fixtures.spec.ts \
    --project=measure-dash --no-deps --workers=1
```
Exit code checked directly against a file-redirected run (no pipe to swallow it): `0`. 2 passed, 1.8m.

**Scope correction before running — the spec as it stood would have re-run varied-household@390/430,
which the item explicitly forbids** ("wastes a slot and risks contaminating the record"). Fixed by
giving each `FIXTURES` entry its own `widths` array instead of the shared `WIDTHS` constant:
`varied-household: [320]`, `single-line-concentration: WIDTHS` (all three). This is the only behavioural
change to the spec file; the fixture-apply functions, the capture call and the row-count assertion are
untouched.

**Fixture-hygiene bug found and fixed before running.** The item's acceptance criteria states each
apply function must clear BOTH prefixes; `applyVariedHouseholdFixture` already did (visible in the
existing source), but `applySingleLineConcentrationFixture` cleared only its own `WH-CONC-` prefix, not
`WH-VARIED-`. Since the DB held 7 live `WH-VARIED-*` rows from the already-landed capture going into
this run, applying `single-line-concentration` next — exactly this run's sequence — would have
reproduced the 13-row collision the BASELINE.md history already describes once, from the opposite
direction. Fixed in `tests/measure/dashboard-fixtures.ts` (`applySingleLineConcentrationFixture` now
clears `VARIED_HOUSEHOLD_PREFIX` before `SINGLE_LINE_CONCENTRATION_PREFIX`) before the run, not after a
bad capture.

### Row-count verification (fixture hygiene, per the acceptance criteria)

| step | expected | DB before this run | after `varied-household` apply | after `single-line-concentration` apply |
|---|---|---|---|---|
| starting state | — | 7 × `WH-VARIED-*`, 0 × `WH-CONC-*` (the already-landed capture) | — | — |
| varied-household@320 | 7 | — | 7 × `WH-VARIED-*`, 0 × `WH-CONC-*` — matches | — |
| single-line-concentration@{320,390,430} | 6 | — | — | 0 × `WH-VARIED-*`, 6 × `WH-CONC-*` — matches |

Confirmed twice: once by the spec's own in-test assertion (`identityDuplicates.totalRows` must equal
`policiesFor(fixture).length`, which is why the run would have failed loudly rather than publish a
wrong number), and independently by a direct `db.policy.findMany` query after the run completed —
`WH-CONC-MOT1..MOT6` only, 6 rows, no `WH-VARIED-*` survivor. Nothing was discarded; both checks agreed
with the fixture applied.

### Results — the three owed captures

| fixture | width | rows | comparable | duplicate rows | largest group | unlocatable |
|---|---|---|---|---|---|---|
| varied-household | **320** | 7 | 7 | **2** | **2** | 0 |
| single-line-concentration | **320** | 6 | 6 | **6** | **6** | 0 |
| single-line-concentration | **390** | 6 | 6 | **6** | **6** | 0 |
| single-line-concentration | **430** | 6 | 6 | **6** | **6** | 0 |

`varied-household@320` (2 duplicate rows, largest group 2, both health) is **identical in shape** to the
already-landed 390/430 result — the only group is the same `Εθνική Ασφαλιστική · Υγεία · … · ΕΝΕΡΓΟ` pair
(the relative-days text reads 40 at 320 vs 39 at 390/430 only because the three captures ran on different
days/hours against the same `endInDays: 40` fixture row — `formatRelativeExpiry` recomputing against
"now", not a data difference). All three widths of `single-line-concentration` are also identical: one
group of all 6 rows, `Interamerican · Αυτοκίνητο · 22/02/2027 · ΕΝΕΡΓΟ` — confirming the metric is
width-invariant here too, consistent with every other fixture measured under P5-wallet-00/01a.

### `single-line-concentration` has NO target — read this result as an extraction/data question, not a rendering defect

The fixture holds line, insurer, status and date constant by construction, so a 6/6 collision on the
CURRENT four-field identity definition (`insurer · lineOfBusiness · date · status` — `plateNumber`
deliberately excluded, see `metrics.ts`'s own doc comment) is not new information about the row: nothing
today renders the plate, so of course the six cards read identically. **What this fixture actually
tests is whether the one remaining candidate identifier — `vehicle.plateNumber` — is even present and
distinct in the underlying data**, since that is the only field left that COULD distinguish these rows
if a future change exposed it. Checked directly against the DB after capture:

```
WH-CONC-MOT1 -> ΙΝΤ-0001      WH-CONC-MOT4 -> ΙΝΤ-0004
WH-CONC-MOT2 -> ΙΝΤ-0002      WH-CONC-MOT5 -> ΙΝΤ-0005
WH-CONC-MOT3 -> ΙΝΤ-0003      WH-CONC-MOT6 -> ΙΝΤ-0006
```

All six present, all six distinct. **This is not evidence that real extraction reliably produces unique
plates** — this fixture writes `plateNumber` directly into `acordData` (`createIdentityFixturePolicy`,
`dashboard-fixtures.ts`), the same synthetic path every other field in this measurement takes; no
document was ever parsed. Whether AI extraction produces duplicate or missing plates for six real
uploaded schedules is a separate, **unmeasured** question this fixture cannot answer either way — it
only establishes that IF plates are extracted, the schema has room for them to be distinct, and that a
plate-based identifier rule would resolve this fixture's 6-way collision to 6 distinct rows.

### The per-line duplicate breakdown, both fixtures

Built from the fixture source (`variedHouseholdPolicies()` / `singleLineConcentrationPolicies()`,
`dashboard-fixtures.ts`) cross-checked against the captured `identityDuplicates.groups` — every group
that appears names its line-of-business as the second `·`-separated segment of `display`, and a line
with zero rows in `groups` was independently confirmed distinct by comparing its rows' insurer+date
(motor's two rows carry different insurers AND different dates, which alone rules out a shared identity
key without needing a group entry to say so).

| fixture | line | rows | duplicate rows | largest group | resolvable per H-010? |
|---|---|---|---|---|---|
| varied-household | motor | 2 | 0 | 0 | yes (`plateNumber`/`vin` exist) — but not exercised here: these two never collided on insurer+date in the first place |
| varied-household | property (home) | 1 | 0 | 0 | yes (`property.address` exists) — only one row, not exercised |
| varied-household | health | 3 | **2** | **2** | **no** — no insured-party field exists in the schema (`insuredPersons` is a crew/class schedule, not named people) |
| varied-household | life | 1 | 0 | 0 | **no** (`beneficiaries.name` names the beneficiary, not the insured) — only one row, not exercised |
| single-line-concentration | motor | 6 | **6** | **6** | yes — `plateNumber` exists and is populated/distinct in this fixture's data (see above), but is not read by the current identity definition |

Rows sum correctly against the measured totals: varied-household 2+1+3+1 = 7 rows, 0+0+2+0 = 2 duplicate
rows, max(0,0,2,0) = 2 largest group — all match the captured result exactly.

**This is a total, not full coverage of H-010's line list.** Both fixtures together exercise only
**motor, property/home, health and life**. `travel`, `cyber`, `business` and `pension` — the other lines
H-010 predicts as unresolvable — appear in **neither** fixture and are **not measured** anywhere in this
item; `pet` and `marine` — predicted resolvable — are likewise absent from both. Motor and property's
"resolvable" cells above are the schema claim carried over from H-010's audit of
`lib/schemas/acord-data.ts`, not a collision this run actually produced and then broke with an
identifier — the varied-household motor rows never collided at all (different insurer, different date),
so no fixture in this item demonstrates an identifier ACTUALLY resolving a collision. That demonstration
would need a fixture with two motor (or property) rows sharing insurer+date+status — nobody has built
one.

### What this item did NOT measure — stated explicitly

- **The per-line breakdown for heavy/typical/all-expired** (P5-wallet-00's three fixtures) — not
  requested by this item's "still owed" list, and not attempted.
- **Whether an identifier rule actually resolves a collision** — no fixture in this run (or P5-wallet-00)
  contains two motor or two property rows that collide on insurer+date+status, so "motor/property are
  resolvable" remains a schema-availability claim from H-010, not something this measurement watched
  happen.
- **`pet`, `marine`, `travel`, `cyber`, `business`, `pension`** — zero rows of any of these six lines
  exist in either fixture. H-010's resolvable/unresolvable claim for them is untouched by this item.
- **Whether real (non-fixture) AI extraction produces unique, populated plates** for a genuine set of
  near-identical motor uploads — `single-line-concentration`'s plates are hand-written fixture data, not
  extracted from a document; this item cannot speak to extraction reliability.
- **The TABLE-shape (`PolicyTable.tsx`) extraction path** in `duplicateIdentityRows()` — still unverified,
  as recorded under P5-wallet-00 above; nothing in the 320/390/430 matrix reaches `xl`.

### Anything changed outside `tests/measure/**` / `docs/transformation/evidence/wallet/**`

None. Two files edited, both inside the file boundary: `tests/measure/dashboard-fixtures.ts` (the
prefix-clearing fix on `applySingleLineConcentrationFixture`) and
`tests/measure/dashboard-wallet-identity-household-fixtures.spec.ts` (per-fixture `widths`, to avoid
re-running the already-landed captures). No application code, no other item's evidence directory.
`lib/gap-detection.ts` was not touched. `npx tsc --noEmit` passed clean on the edited files before the
run.

### Gate status

**Complete.** All three owed captures are in `docs/transformation/evidence/wallet/data/current/`
(`varied-household-320.json`, `single-line-concentration-{320,390,430}.json`) with matching screenshots.
The per-line breakdown is reported above with its coverage gaps stated rather than implied.

---

## P5-wallet-01 — the identifier on the row: AFTER capture (2026-08-26)

**Change under measurement:** the asset identifier — `vehicle.plateNumber` / `property.address`
(short form) / `pet.name` / `marineVessel.registryNumber` / `travel.destinationScope` — now renders
on every list row, resolved ONLY by `policyAssetIdentifier` / `policyAssetIdentity`
(`lib/wallet/policy-identity.ts`). Surfaces inheriting it in this change: the wallet card
(`PolicyCard` row 2: «Αυτοκίνητο · ΙΝΤ-0001 · 22/02/2027»), the wallet table (`PolicyTable`
secondary line), the dashboard renewal timeline (`RenewalsTimelineCard` — the identifier REPLACES
the policy number when one exists; `data-fact="asset.identifier"`, the plan's reserved key, now
live and registered), the branch page (`BranchDetail` policy rows and renewals), and the comparison
modal's vehicle row (`PolicyComparison` — also closes a masked-plate «(XXXX)» render). A missing,
sentinel or unreadable identifier renders NOTHING and the row stands alone.

**Collector:** `tests/measure/section-collector.ts` sha256
`4c708e16ff340b2c8506d0c55e074cd1d2dce6b8953b1e8a4604a1796e2094fc` — byte-identical to every
baseline above (verified by `shasum` before the run). `duplicateIdentityRows()` in
`tests/measure/metrics.ts` unmodified. The identifier reaches the metric through the card's LOB
line, whose leading text node the collector already reads — the metric definition did not move,
the page did.

**Runs** (foreground, one worker, pooler verified clear at 1237ms first; `MEASURE_RUN=after-p5-wallet-01`
so nothing under `data/current/` was overwritten; exit codes checked from file-redirected output, both 0):
```
MEASURE_RUN=after-p5-wallet-01 PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=… \
  npx playwright test tests/measure/dashboard-wallet-identity-household-fixtures.spec.ts --project=measure-dash --no-deps --workers=1
MEASURE_RUN=after-p5-wallet-01 PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=… \
  npx playwright test tests/measure/wallet-identity-duplicates-baseline.spec.ts --project=measure --no-deps --workers=1
```

### Before/after, per fixture per width

| fixture | width | rows | duplicate rows before → after | largest group before → after |
|---|---|---|---|---|
| single-line-concentration | 320 | 6 | **6 → 0** | **6 → 0** |
| single-line-concentration | 390 | 6 | **6 → 0** | **6 → 0** |
| single-line-concentration | 430 | 6 | **6 → 0** | **6 → 0** |
| varied-household | 320 | 7 | 2 → 2 | 2 → 2 |
| varied-household | 390 | 7 | 2 → 2 | 2 → 2 |
| varied-household | 430 | 7 | 2 → 2 | 2 → 2 |
| heavy (29, real accumulated) | 320 | 29 | 19 → 19 | **6 → 5** |
| heavy | 390 | 29 | 19 → 19 | **6 → 5** |
| heavy | 430 | 29 | 19 → 19 | **6 → 5** |

Zero unlocatable fields on every capture; `pageOverflow.overflowPx = 0` on all nine (the longer
identity line introduced no horizontal overflow at any width).

### Per-line split

- **single-line-concentration — 6 → 0, the fixture that proves the fix.** All six motor rows now
  read «Αυτοκίνητο · ΙΝΤ-000n · 22/02/2027» with n = 1…6 (screenshots). The plates are GREEK
  letters (Ι Ν Τ, U+0399/039D/03A4) rendered byte-honest — no transliteration was needed or done.
- **varied-household — 2 → 2, both health, EXPECTED and correct.** The only group is still the
  «Εθνική Ασφαλιστική · Υγεία · … · ΕΝΕΡΓΟ» family-scheme pair; health has no identifier field in
  the schema, so per the item these rows are reported, not chased. Motor/property/pet/life lines
  stay at 0 — the regression guard holds (their zero predates the change and is not evidence of it).
- **heavy — motor 14 → 14 in count, and the briefed «motor 14 → 0» was NEVER REACHABLE from this
  account's data.** Checked at the byte level before the run: **18 of the 21 motor rows carry the
  SAME Greek plate «ΙΚΖ-4821»** (U+0399 U+039A U+0396), because they are D11-class fixtures built
  by other specs precisely to have identical display values; one row carries the extractor mask
  «XXXX»; one carries Latin «IKZ-4821»; one «IKZ3113»; one is empty. Rendering the identifier
  cannot separate rows whose identifier is byte-identical — and must not pretend to. What DID
  move is exactly what the data allows: the 6-row group split into a 5-row group plus
  `ΣΥΜΒ-2025-DEF-XX` standing alone, because its stored plate is the mask «XXXX» and an
  unreadable key renders nothing (acceptance 2, exercised on real data). The remaining motor
  groups («… · ΙΚΖ-4821 · same date · same status») are now duplicates because the underlying
  fixture rows are genuinely indistinguishable — same insurer, same line, same plate, same date —
  which is the honest reading. Health 5 → 5, unchanged and reported (no identifier exists).
  One movement NOT caused by this change: the baseline's expired group was «Έληξε στις
  05/05/2026» ×3; today's data renders 2×05/05 + 2×08/05 (the account is shared and other specs
  re-provision it) — net ±0 on the total.

### Acceptance 3 — the homoglyph near-miss, observed live

The heavy account genuinely contains the pair: `E2E-MOT-001` stores **Latin** `IKZ-4821`
(U+0049 U+004B U+005A) while the ΣΥΜΒ-2025 motor rows store **Greek** `ΙΚΖ-4821`
(U+0399 U+039A U+0396). During the heavy capture the browser console emitted (captured by the
spec's console listener):

```
[policy-identity] /wallet list: asset identifiers «ΙΚΖ-4821» and «IKZ-4821» are visually
identical but written in different alphabets (Greek/Latin homoglyphs). Rendered as separate
rows on purpose — two different assets can legitimately produce this pair, and merging them
silently would claim one asset where there may be two.
```

Both rows rendered, unmerged. `assetIdentityKey` trims and case-folds ONLY; the homoglyph map
exists solely for detection/logging (`findHomoglyphNearMisses` / `warnOnHomoglyphNearMisses`).

### Other surfaces, verified visually (screenshots in `screenshots/after-p5-wallet-01/`)

- `dashboard-renewal-timeline-390.png` — the /dashboard renewal timeline's six rows read
  «Interamerican · ΙΝΤ-0001…0006» in place of the former `WH-CONC-MOT…` policy numbers
  (the row falls back to the policy number only when no identifier exists — health etc. unchanged).
- `protection-motor-branch-390.png` — /protection/motor «ΤΑ ΑΣΦΑΛΙΣΤΗΡΙΑ ΣΟΥ» rows are
  ΙΝΤ-0001…0006 under the insurer, six distinct rows.

### Guardrails at time of capture

`tsc --noEmit` 0 · full unit suite 5567/5567 (incl. `policy-sentinels-unrenderable`,
`count-instrumentation-registry` after registering `asset.identifier`) · `lint` 0 ·
`lint:i18n-changed` 0 · `lint:utf8` 0 — all run with the change staged.
