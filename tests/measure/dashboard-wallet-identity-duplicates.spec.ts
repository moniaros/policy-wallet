/**
 * P5-wallet-00 — the duplicate-identity-row metric, TYPICAL (3) and
 * ALL-EXPIRED (4) fixtures.
 *
 * Companion to `wallet-identity-duplicates-baseline.spec.ts` (the HEAVY/29
 * fixture, on the `measure` project's own account). Those two portfolio
 * states only exist as `dashboard-fixtures.ts`'s `PortfolioState` rows, which
 * `applyPortfolioState` writes against the DASHBOARD account
 * (`e2e-ph-dash@policywallet.test`) — so this spec runs in `measure-dash`
 * (dash.json session) and points it at `/wallet`, not `/dashboard`.
 * `applyPortfolioState` and `/wallet` are both generic over which account and
 * which page reads it; nothing about either is dashboard-specific, so this is
 * reuse, not a new fixture mechanism.
 *
 * CONTAMINATION FOUND AND CLEANED (2026-08-25): a direct DB check before
 * writing this spec found the dashboard account carrying 34 policies, not the
 * 12 its own `heavy` `PortfolioState` would produce — 22 of them
 * `E2E-DASH-UNK-MOT-*`, `applyUnknownHouseholdFixture`'s fixture
 * (dashboard-fixtures.ts), created 2026-08-24 by some run that is no longer in
 * this directory (no `.spec.ts` file calls that function today).
 * `applyPortfolioState` only ever clears its OWN `ΣΥΜΒ-2026-*` prefix, by
 * design (dashboard-fixtures.ts's own isolation note: "a `PortfolioState`
 * capture run AFTER this fixture will show this account's policy count plus
 * this fixture's 22 ... Use a dedicated account, or clear it first, if that
 * matters to the capture" — it does, here: a 3-row "typical" capture
 * contaminated with 22 unrelated rows is not the fixture the item asked for).
 * `beforeAll` deletes that stale prefix before every state is applied so the
 * captured wallet is exactly the 3 (or 4) policies the fixture specifies.
 *
 * Run:  npx playwright test tests/measure/dashboard-wallet-identity-duplicates.spec.ts \
 *         --project=measure-dash --no-deps
 */
import { test, expect } from "@playwright/test"
import { applyPortfolioState, policiesFor } from "./dashboard-fixtures"
import { evidenceDirs, ensureDirs, openSurface, captureSurface, withDb } from "./surface-harness"

const WIDTHS = [320, 390, 430] as const
const DASH_EMAIL = "e2e-ph-dash@policywallet.test"
const dirs = evidenceDirs("wallet")

const STATES = ["typical", "all-expired"] as const

test.describe.configure({ mode: "serial" })

test.beforeAll(async () => {
    test.setTimeout(120_000)
    ensureDirs(dirs)
    await withDb(async (db) => {
        const user = await db.user.findUnique({ where: { email: DASH_EMAIL }, select: { id: true } })
        if (!user) throw new Error(`${DASH_EMAIL} not provisioned — run global-setup first`)
        const removed = await db.policy.deleteMany({
            where: { ownerUserId: user.id, policyNumber: { startsWith: "E2E-DASH-UNK-MOT-" } },
        })
        if (removed.count > 0) {
            console.log(`[cleanup] removed ${removed.count} stale E2E-DASH-UNK-MOT-* policies from ${DASH_EMAIL}`)
        }
    })
})

for (const state of STATES) {
    test(`P5-wallet-00: duplicate-identity rows, ${state} wallet`, async ({ page }) => {
        test.setTimeout(6 * 60_000)
        await withDb((db) => applyPortfolioState(db, DASH_EMAIL, state))
        const expectedCount = policiesFor(state).length

        for (const width of WIDTHS) {
            await openSurface(page, "/wallet", width)
            const result = await captureSurface(page, dirs, state, width, [], { tier: "unknown", state: `${state}-${expectedCount}-policies` })
            // STATE SANITY: the same lesson dashboard-baseline.spec.ts learned the
            // hard way — a capture whose row count doesn't match the fixture just
            // applied is showing a stale wallet, not this state's.
            expect(
                result.identityDuplicates.totalRows,
                `${state}@${width}: expected ${expectedCount} rows from the fixture just applied, DOM shows ${result.identityDuplicates.totalRows} — stale render or leftover policies?`
            ).toBe(expectedCount)
            console.log(
                `[P5-wallet-00] ${state}@${width}: rows=${result.identityDuplicates.totalRows} ` +
                `comparable=${result.identityDuplicates.comparableRows} ` +
                `duplicateRowCount=${result.identityDuplicates.duplicateRowCount} ` +
                `largestGroupSize=${result.identityDuplicates.largestGroupSize} ` +
                `unlocatable=${result.identityDuplicates.unlocatable.length}`
            )
        }
    })
}
