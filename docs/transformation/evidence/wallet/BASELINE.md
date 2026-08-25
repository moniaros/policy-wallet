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
