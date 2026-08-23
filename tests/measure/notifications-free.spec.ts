/**
 * T-015 baseline — Ειδοποιήσεις `/notifications`, FREE tier.
 *
 * Runs in the `measure-free` project (`e2e-ph-free@policywallet.test` session)
 * — tier is a property of the session's user and cannot be passed in
 * (see `policy-detail-free.spec.ts`'s header for why a separate file/project
 * exists at all).
 *
 * Run:  npx playwright test --project=measure-free notifications-free
 */
import { test } from "@playwright/test"
import { applyNotificationDuplicateFixture } from "./dashboard-fixtures"
import { evidenceDirs, ensureDirs, openSurface, captureSurface, withDb } from "./surface-harness"

const WIDTHS = [320, 390, 430] as const
const EMAIL = "e2e-ph-free@policywallet.test"
const dirs = evidenceDirs("notifications")

test.describe.configure({ mode: "serial" })

test.beforeAll(() => ensureDirs(dirs))

test("baseline: default notification history (free)", async ({ page }) => {
    test.setTimeout(6 * 60_000)
    for (const width of WIDTHS) {
        await openSurface(page, "/notifications", width, ".pw-page-shell h1, main h1, h1")
        await captureSurface(page, dirs, "default-free", width, [], { tier: "free", state: "default" }, 200)
    }
})

test("baseline: channel-duplicated notifications (free)", async ({ page }) => {
    test.setTimeout(6 * 60_000)
    await withDb((db) => applyNotificationDuplicateFixture(db, EMAIL))
    for (const width of WIDTHS) {
        await openSurface(page, "/notifications", width, ".pw-page-shell h1, main h1, h1")
        await captureSurface(page, dirs, "duplicated-free", width, [], { tier: "free", state: "duplicated" }, 200)
    }
})
