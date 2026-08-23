/**
 * T-015 baseline — Ειδοποιήσεις `/notifications` (priority 1 of the §4.5 order).
 *
 * PAID session (`measure` project, `e2e-ph@policywallet.test`). Two states:
 *   - `default`  — whatever notification history already exists on the shared
 *     E2E policyholder account from other suites. Not fabricated: this is the
 *     honest "what does a real, lived-in account look like" state.
 *   - `duplicated` — `applyNotificationDuplicateFixture` (dashboard-fixtures.ts,
 *     already parametrised by owner email) applied to THIS account, reproducing
 *     the channel-duplicated-notification condition (P1-04) so the page's
 *     grouping behaviour is measurable, not just its empty/typical layout.
 *
 * Run:  npx playwright test --project=measure notifications-baseline
 */
import { test } from "@playwright/test"
import { applyNotificationDuplicateFixture } from "./dashboard-fixtures"
import { evidenceDirs, ensureDirs, openSurface, captureSurface, withDb } from "./surface-harness"

const WIDTHS = [320, 390, 430] as const
const EMAIL = "e2e-ph@policywallet.test"
const dirs = evidenceDirs("notifications")

test.describe.configure({ mode: "serial" })

test.beforeAll(() => ensureDirs(dirs))

test("baseline: default notification history (paid)", async ({ page }) => {
    test.setTimeout(6 * 60_000)
    for (const width of WIDTHS) {
        await openSurface(page, "/notifications", width, ".pw-page-shell h1, main h1, h1")
        await captureSurface(page, dirs, "default-paid", width, [], { tier: "paid", state: "default" }, 200)
    }
})

test("baseline: channel-duplicated notifications (paid)", async ({ page }) => {
    test.setTimeout(6 * 60_000)
    await withDb((db) => applyNotificationDuplicateFixture(db, EMAIL))
    for (const width of WIDTHS) {
        await openSurface(page, "/notifications", width, ".pw-page-shell h1, main h1, h1")
        await captureSurface(page, dirs, "duplicated-paid", width, [], { tier: "paid", state: "duplicated" }, 200)
    }
})
