/**
 * T-015 baseline — overlays (priority 10, "modals, sheets and dialogs" from
 * SURFACES.md §2). Best-effort: only overlays reachable by a simple, safe
 * click sequence (no destructive confirmation ever pressed) are attempted.
 * Not attempted, with reasons, in this pass: AI Consent Modal (the fixture
 * accounts already hold `aiProcessingConsentVersion`, so the trigger
 * condition does not fire without a fresh never-consented account), Coverage
 * Limit Modal (requires driving the add-policy flow to the plan's exact
 * policy cap), Policy Comparison Dialog (requires selecting exactly two
 * policies via the wallet's selection UI, not traced in this pass).
 *
 * CORRECTION to SURFACES.md §2: the Batch Upload Modal is opened from
 * `/wallet` (the `#tour-fab` add-menu in `components/wallet/PolicyWallet.tsx`),
 * not from `/wallet/add` as the table states — confirmed by reading the
 * component tree, not by observation.
 *
 * PAID tier. Every overlay capture is followed by a CANCEL/close action —
 * nothing here confirms a destructive operation.
 *
 * Run:  npx playwright test --project=measure overlays-baseline
 */
import { test, expect } from "@playwright/test"
import { FIXTURE_SPECS, DEFECT_SPECS, provisionMatrixFixtures } from "./fixtures"
import { evidenceDirs, ensureDirs, openSurface, captureSurface, withDb } from "./surface-harness"

const WIDTHS = [320, 390, 430] as const
const EMAIL = "e2e-ph@policywallet.test"
const dirs = evidenceDirs("overlays")

let ids: Record<string, string> = {}

test.describe.configure({ mode: "serial" })

test.beforeAll(async () => {
    test.setTimeout(300_000)
    ensureDirs(dirs)
    ids = await withDb((db) => provisionMatrixFixtures(db, EMAIL, [...FIXTURE_SPECS, ...DEFECT_SPECS]))
})

test("baseline: Batch Upload Modal, opened from /wallet", async ({ page }) => {
    test.setTimeout(6 * 60_000)
    for (const width of WIDTHS) {
        await openSurface(page, "/wallet", width)
        await page.click("#tour-fab")
        await page.waitForTimeout(300)
        await page.click('[data-testid="wallet-menu-batch-upload"]')
        await page.waitForTimeout(600)
        await captureSurface(page, dirs, "batch-upload-modal", width, [], { tier: "paid", trigger: "/wallet #tour-fab" }, 200)
        // Close without submitting anything — Escape is the least-coupled dismissal.
        await page.keyboard.press("Escape").catch(() => {})
    }
})

test("baseline: Delete Policy Dialog, opened from /wallet/[id]", async ({ page }) => {
    test.setTimeout(6 * 60_000)
    const policyId = ids["motor-active"]
    expect(policyId, "motor-active fixture provisioned").toBeTruthy()
    for (const width of WIDTHS) {
        await openSurface(page, `/wallet/${policyId}`, width)
        // The delete button lives inside the "documents" accordion
        // (PolicySection), which is CLOSED by default and — per that
        // component's own comment — "Unmounted when closed, not hidden": the
        // button does not exist in the DOM at all until the section is
        // expanded. Confirmed the hard way in this pass: `getByRole` on the
        // button returned 0 matches pre-expansion, which read as a hang
        // (repeated auto-wait retries) rather than a clean "not found" — the
        // section header is `#documents button` (a real <button> inside an
        // <h2>, `aria-expanded`), clicked here to open it first.
        await page.locator("#documents button").first().click()
        await page.waitForTimeout(400)
        const trigger = page.getByRole("button", { name: "Διαγραφή ασφαλιστηρίου" })
        await trigger.scrollIntoViewIfNeeded()
        await trigger.click()
        await page.waitForTimeout(500)
        await captureSurface(page, dirs, "delete-policy-dialog", width, [], { tier: "paid", trigger: "/wallet/[id] delete button (documents section expanded)" }, 200)
        // ALWAYS cancel — this fixture backs other specs in this suite.
        const cancel = page.getByRole("button", { name: "Ακύρωση" })
        if (await cancel.isVisible().catch(() => false)) {
            await cancel.click()
        } else {
            await page.keyboard.press("Escape").catch(() => {})
        }
        await page.waitForTimeout(300)
    }
})

test("baseline: Change Password Modal, opened from /account/security", async ({ page }) => {
    test.setTimeout(6 * 60_000)
    for (const width of WIDTHS) {
        await openSurface(page, "/account/security", width)
        const trigger = page.getByRole("button", { name: "Αλλαγή κωδικού" })
        await trigger.scrollIntoViewIfNeeded()
        await trigger.click()
        await page.waitForTimeout(500)
        await captureSurface(page, dirs, "change-password-modal", width, [], { tier: "paid", trigger: "/account/security change-password button" }, 200)
        await page.keyboard.press("Escape").catch(() => {})
    }
})
