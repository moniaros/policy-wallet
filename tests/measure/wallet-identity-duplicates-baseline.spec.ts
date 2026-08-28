/**
 * P5-wallet-00 — the duplicate-identity-row metric, HEAVY (29-policy) fixture.
 *
 * Gates the §7.3 asset reframe: the reframe's premise is that a customer
 * cannot tell wallet rows apart, and nobody had measured that. This spec is
 * one of the three fixtures the item specifies (heavy/typical/all-expired).
 *
 * "Heavy" here is NOT `dashboard-fixtures.ts`'s 12-policy `PortfolioState`
 * of the same name — it is the `measure` project's own account
 * (`e2e-ph@policywallet.test`), which this run confirmed by direct DB query
 * (2026-08-25) already holds 29 real, live-fixture policies accumulated by
 * every other T-015/T-016 spec that provisions against it (`wallet-list-
 * baseline.spec.ts`'s 15-policy matrix, `wallet-detail-expanded-matrix.spec.ts`,
 * `agent-view-baseline.spec.ts`, etc. — see `overlays-consent-limit-compare-
 * confirm-baseline.spec.ts`'s own comment on the same number). Reusing it
 * rather than inventing a 29-policy fixture is exactly the "reuse the fixture
 * mechanism" instruction: this account IS the realistic, rough-edged heavy
 * wallet, not a clean one built to look good.
 *
 * No provisioning step: the account's population is a side effect of every
 * other spec in this directory, so a `beforeAll` here only VERIFIES it is
 * still populated (the `playwright/.auth/*.json` staleness trap — a lapsed
 * session renders `/auth/signin` at HTTP 200 and would otherwise silently
 * record a folder of sign-in-page captures as "the heavy wallet").
 *
 * Run:  npx playwright test tests/measure/wallet-identity-duplicates-baseline.spec.ts \
 *         --project=measure --no-deps
 */
import { test, expect } from "@playwright/test"
import { evidenceDirs, ensureDirs, openSurface, captureSurface, withDb } from "./surface-harness"

const WIDTHS = [320, 390, 430] as const
const EMAIL = "e2e-ph@policywallet.test"
const dirs = evidenceDirs("wallet")

test.describe.configure({ mode: "serial" })

test.beforeAll(async () => {
    test.setTimeout(60_000)
    ensureDirs(dirs)
    const count = await withDb(async (db) => {
        const user = await db.user.findUnique({ where: { email: EMAIL }, select: { id: true } })
        if (!user) throw new Error(`${EMAIL} not provisioned — run global-setup first`)
        return db.policy.count({ where: { ownerUserId: user.id, status: { not: "deleted" } } })
    })
    console.log(`[heavy fixture] ${EMAIL} holds ${count} policies`)
    // Not a hard 29 — other specs are free to grow this account over time —
    // but a wallet this thin is the staleness trap (stale session → 0 rows
    // rendered, or a DB reset nobody re-seeded), not a real heavy portfolio.
    expect(count, `${EMAIL} has too few policies to be the "heavy" fixture — stale session or unseeded DB?`).toBeGreaterThanOrEqual(20)
})

test("P5-wallet-00: duplicate-identity rows, heavy (29-policy) wallet", async ({ page }) => {
    test.setTimeout(6 * 60_000)
    // P5-wallet-01 acceptance 3: the wallet is expected to LOG the Greek/Latin
    // homoglyph near-miss and render both rows unmerged.
    //
    // CORRECTED 2026-08-28. This said the pair came from `E2E-MOT-001` carrying
    // Latin «IKZ-4821» against the ΣΥΜΒ-2025 fixtures' Greek «ΙΚΖ-4821».
    // E2E-MOT-001 has no acordData at all (tests/global-setup.ts creates it with
    // no vehicle), so that pair did not exist — and every ΣΥΜΒ-2025 motor
    // fixture shared ONE plate, which is what made thirteen motor rows
    // indistinguishable and P5-wallet-01's 0-target unreachable.
    //
    // The pair is now built deliberately and locally in `fixtures.ts`
    // (`HOMOGLYPH_PAIR`): `motor-active` carries Greek «ΙΚΖ-4821» and
    // `motor-expired` Latin «IKZ-4821». Every other motor fixture gets its own
    // plate. Collect the browser-console warnings so the log's firing is
    // evidence, not a claim.
    const homoglyphWarnings: string[] = []
    page.on("console", (msg) => {
        if (msg.type() === "warning" && msg.text().includes("[policy-identity]")) {
            homoglyphWarnings.push(msg.text())
        }
    })
    for (const width of WIDTHS) {
        await openSurface(page, "/wallet", width)
        const result = await captureSurface(page, dirs, "heavy", width, [], { tier: "paid", state: "heavy-29-real" })
        console.log(
            `[P5-wallet-00] heavy@${width}: rows=${result.identityDuplicates.totalRows} ` +
            `comparable=${result.identityDuplicates.comparableRows} ` +
            `duplicateRowCount=${result.identityDuplicates.duplicateRowCount} ` +
            `largestGroupSize=${result.identityDuplicates.largestGroupSize} ` +
            `unlocatable=${result.identityDuplicates.unlocatable.length}`
        )
        for (const group of result.identityDuplicates.groups) {
            console.log(`[P5-wallet-00] heavy@${width} group x${group.count}: ${group.display}`)
        }
    }
    for (const warning of [...new Set(homoglyphWarnings)]) {
        console.log(`[P5-wallet-01 homoglyph log] ${warning}`)
    }
})
