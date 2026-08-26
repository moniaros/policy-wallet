/**
 * P5-wallet-01a — the duplicate-identity-row metric, VARIED-HOUSEHOLD and
 * SINGLE-LINE-CONCENTRATION fixtures.
 *
 * Companion to `wallet-identity-duplicates-baseline.spec.ts` (heavy/29, on the
 * `measure` project's own account) and `dashboard-wallet-identity-duplicates.spec.ts`
 * (typical/all-expired, on the dashboard account). Those three fixtures are
 * the ones D-034 was decided on; this pair is what its reopen trigger asked
 * for next — see `dashboard-fixtures.ts`'s P5-wallet-01a doc comment for the
 * exact composition and the identifier-availability table behind it.
 *
 * Filename starts with `dashboard` DELIBERATELY: both fixtures rebuild the
 * DASHBOARD account (`e2e-ph-dash@policywallet.test`), so this spec must land
 * on `measure-dash` (whose storageState is `dash.json`) — the `measure`
 * project's testMatch excludes anything starting with `dashboard`, and a
 * mis-named file here would silently run against the WRONG session/account.
 *
 * Run:  npx playwright test tests/measure/dashboard-wallet-identity-household-fixtures.spec.ts \
 *         --project=measure-dash --no-deps
 */
import { test, expect } from "@playwright/test"
import {
    applyVariedHouseholdFixture,
    applySingleLineConcentrationFixture,
    variedHouseholdPolicies,
    singleLineConcentrationPolicies,
} from "./dashboard-fixtures"
import { evidenceDirs, ensureDirs, openSurface, captureSurface, withDb } from "./surface-harness"

const WIDTHS = [320, 390, 430] as const

// P5-wallet-01 (the identifier fix): this is a FULL re-measurement — the
// after-capture that the baselines above exist to be compared against — so
// WIDTHS is restored on both rows, exactly as the P5-wallet-01a-FINISH note
// here said to do ("Restore WIDTHS on both rows if this file is ever re-run
// for a full re-measurement"). Run it with MEASURE_RUN set to a non-default
// name so the baseline JSONs under data/current/ are never overwritten.
const DASH_EMAIL = "e2e-ph-dash@policywallet.test"
const dirs = evidenceDirs("wallet")

const FIXTURES = [
    { label: "varied-household", apply: applyVariedHouseholdFixture, expectedCount: () => variedHouseholdPolicies().length, widths: WIDTHS },
    { label: "single-line-concentration", apply: applySingleLineConcentrationFixture, expectedCount: () => singleLineConcentrationPolicies().length, widths: WIDTHS },
] as const

test.describe.configure({ mode: "serial" })

test.beforeAll(async () => {
    test.setTimeout(120_000)
    ensureDirs(dirs)
    // Clear OTHER fixture families' leftovers on this shared account before
    // capturing — same lesson as dashboard-wallet-identity-duplicates.spec.ts's
    // own beforeAll (found `E2E-DASH-UNK-MOT-*` contaminating a "typical"
    // capture on 2026-08-25). `applyVariedHouseholdFixture` /
    // `applySingleLineConcentrationFixture` only ever clear their OWN prefix,
    // by design, so whatever a prior `applyPortfolioState` run or the unknown-
    // household fixture left behind would otherwise inflate this capture's row
    // count.
    await withDb(async (db) => {
        const user = await db.user.findUnique({ where: { email: DASH_EMAIL }, select: { id: true } })
        if (!user) throw new Error(`${DASH_EMAIL} not provisioned — run global-setup first`)
        const removed = await db.policy.deleteMany({
            where: {
                ownerUserId: user.id,
                OR: [{ policyNumber: { startsWith: "ΣΥΜΒ-2026-" } }, { policyNumber: { startsWith: "E2E-DASH-UNK-MOT-" } }],
            },
        })
        if (removed.count > 0) {
            console.log(`[cleanup] removed ${removed.count} other-fixture-family policies from ${DASH_EMAIL}`)
        }
    })
})

for (const fixture of FIXTURES) {
    test(`P5-wallet-01a: duplicate-identity rows, ${fixture.label}`, async ({ page }) => {
        test.setTimeout(6 * 60_000)
        await withDb((db) => fixture.apply(db, DASH_EMAIL))
        const expectedCount = fixture.expectedCount()

        for (const width of fixture.widths) {
            await openSurface(page, "/wallet", width)
            const result = await captureSurface(page, dirs, fixture.label, width, [], {
                tier: "unknown",
                state: `${fixture.label}-${expectedCount}-policies`,
            })
            // STATE SANITY — same check as every other fixture in this
            // directory: a row count that doesn't match what was just applied
            // is a stale render or leftover contamination, not this fixture.
            expect(
                result.identityDuplicates.totalRows,
                `${fixture.label}@${width}: expected ${expectedCount} rows from the fixture just applied, DOM shows ${result.identityDuplicates.totalRows} — stale render or leftover policies?`
            ).toBe(expectedCount)
            console.log(
                `[P5-wallet-01a] ${fixture.label}@${width}: rows=${result.identityDuplicates.totalRows} ` +
                `comparable=${result.identityDuplicates.comparableRows} ` +
                `duplicateRowCount=${result.identityDuplicates.duplicateRowCount} ` +
                `largestGroupSize=${result.identityDuplicates.largestGroupSize} ` +
                `unlocatable=${result.identityDuplicates.unlocatable.length}`
            )
        }
    })
}
