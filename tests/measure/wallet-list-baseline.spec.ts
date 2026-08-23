/**
 * T-015 baseline — Πορτοφόλι `/wallet` (priority 3 of the §4.5 order), PAID tier.
 *
 * Unlike `/dashboard`, the wallet list has no dedicated portfolio-state
 * fixture matrix of its own — it renders whatever policies the account holds.
 * `provisionMatrixFixtures` (idempotent, already the shared setup for the
 * policy-detail series) guarantees the full 15-policy matrix (6 healthy states
 * + 9 `defect-*` fixtures from T-012) exists on the paid E2E account, so this
 * captures a realistic, rough-edged "populated" wallet rather than a clean one
 * built to look good — the T-012 lesson applied here too: a fixture set that
 * cannot reproduce a defect proves nothing.
 *
 * Run:  npx playwright test --project=measure wallet-list-baseline
 */
import { test } from "@playwright/test"
import { FIXTURE_SPECS, DEFECT_SPECS, provisionMatrixFixtures } from "./fixtures"
import { evidenceDirs, ensureDirs, openSurface, captureSurface, withDb } from "./surface-harness"

const WIDTHS = [320, 390, 430] as const
const EMAIL = "e2e-ph@policywallet.test"
const dirs = evidenceDirs("wallet-list")

test.describe.configure({ mode: "serial" })

test.beforeAll(async () => {
    test.setTimeout(300_000)
    ensureDirs(dirs)
    await withDb((db) => provisionMatrixFixtures(db, EMAIL, [...FIXTURE_SPECS, ...DEFECT_SPECS]))
})

test("baseline: populated wallet, 15 policies incl. 9 defect fixtures (paid)", async ({ page }) => {
    test.setTimeout(8 * 60_000)
    for (const width of WIDTHS) {
        await openSurface(page, "/wallet", width)
        await captureSurface(
            page,
            dirs,
            "populated-paid",
            width,
            [{ key: "policy.longInsurer", value: "Δεύτερος Αλληλασφαλιστικός" }],
            { tier: "paid", state: "populated-15-policies" }
        )
    }
})
