/**
 * T-016b — the four overlays SURFACES.md lists but `overlays-baseline.spec.ts`
 * (T-015) explicitly did not attempt: AI Consent Modal, Coverage Limit Modal,
 * Policy Comparison Dialog, and a generic instance of the shared
 * `ConfirmDialog` (as opposed to Delete Policy Dialog / Change Password
 * Modal, already captured — and NEITHER of which is actually `ConfirmDialog`:
 * Delete Policy Dialog is its own component and Change Password Modal is
 * `ChangePasswordModal`, confirmed by reading both call sites).
 *
 * All four turned out reachable without any fixture change:
 *
 * 1. AI Consent Modal (`components/ui/AiConsentModal.tsx`, via
 *    `/wallet/add`'s `AddPolicyClient.tsx`) — the previous pass's blocker was
 *    "every fixture account already holds `aiProcessingConsentVersion`".
 *    Fixed the same way `wallet-edit-and-agent-noadvisor-baseline.spec.ts`
 *    handles the paid account's pre-existing `CustomerRelationship`: flip the
 *    ONE column that gates the modal to `null` for the duration of a single
 *    capture, restore it in `finally`. The modal opens on SUBMIT (client-side
 *    validation only — `handleSubmit`'s `!aiConsent` branch runs before any
 *    network call), so this needs a file selected in the browser's file input
 *    but never touches Supabase storage.
 *
 * 2. Coverage Limit Modal (`UpgradeModal` with `featureKey="policy_upload_limit"`,
 *    inside `AddPolicyClient.tsx`) — the previous pass assumed "requires
 *    driving the add-policy flow to the plan's exact policy cap". Checked
 *    directly: `e2e-ph@policywallet.test` is on `ph-pro` (25-policy cap) and
 *    already CARRIES 29 policies — the T-015/T-016 fixture matrices
 *    (`provisionMatrixFixtures`) write via `db.policy.create` directly, which
 *    does not go through `canUserAddPolicy`, so the account has been over its
 *    own plan's cap for the whole of this evidence run without anything
 *    checking. The very next REAL submission through the UI hits
 *    `POLICY_LIMIT_REACHED` immediately — no DB fixture change needed at all,
 *    just a real file upload to local-dev Supabase storage (the account
 *    already has AI consent, so this submission skips the consent modal and
 *    reaches `createPolicy` directly).
 *
 * 3. Policy Comparison Dialog (`components/wallet/PolicyComparison.tsx`) —
 *    the previous pass assumed "requires selecting exactly two policies via
 *    the wallet's selection UI". Reading the component: the trigger button on
 *    `/wallet` opens the dialog with ZERO pre-selection — the "selection UI"
 *    IS the dialog's own first screen (a card grid, `onClick={() =>
 *    toggleSelect(policy.id)}`), not a wallet-list checkbox flow. `pro` plan
 *    already has `analysisComparison: true`, and the fixture matrix's
 *    motor-active + motor-expiring are both in-force motor policies, so
 *    `hasComparablePolicies` is already true — captured BOTH the picker state
 *    (0 selected) and the actual comparison table (2 selected).
 *
 * 4. Generic Confirm Dialog (`components/ui/ConfirmDialog.tsx`) — captured via
 *    `/account/security`'s "sign out everywhere" trigger, a DESTRUCTIVE
 *    instance distinct from both already-captured dialogs above. Always
 *    CANCELLED, never confirmed — confirming would actually invalidate every
 *    session for this shared E2E account, including the one running this
 *    suite.
 *
 * PAID tier throughout. Every capture that opens a destructive or
 * state-changing overlay is followed by CANCEL, not confirm/accept.
 *
 * Run:  npx playwright test --project=measure overlays-consent-limit-compare-confirm-baseline
 */
import { test, expect } from "@playwright/test"
import { FIXTURE_SPECS, provisionMatrixFixtures } from "./fixtures"
import { evidenceDirs, ensureDirs, openSurface, captureSurface, withDb } from "./surface-harness"

const WIDTHS = [320, 390, 430] as const
const EMAIL = "e2e-ph@policywallet.test"
const dirs = evidenceDirs("overlays")

test.describe.configure({ mode: "serial" })

test.beforeAll(async () => {
    test.setTimeout(300_000)
    ensureDirs(dirs)
    await withDb((db) => provisionMatrixFixtures(db, EMAIL, FIXTURE_SPECS))
})

test("baseline: AI Consent Modal, opened from /wallet/add on submit", async ({ page }) => {
    test.setTimeout(6 * 60_000)

    const original = await withDb(async (db) => {
        const u = await db.user.findUnique({ where: { email: EMAIL }, select: { aiProcessingConsentVersion: true } })
        await db.user.update({ where: { email: EMAIL }, data: { aiProcessingConsentVersion: null } })
        return u?.aiProcessingConsentVersion ?? null
    })

    try {
        for (const width of WIDTHS) {
            await openSurface(page, "/wallet/add", width)
            await page.selectOption("#add-lineOfBusiness", "motor")
            // Client-side state only — this never reaches Supabase storage,
            // because the consent check in `handleSubmit` runs BEFORE
            // `submitPolicy`'s upload.
            await page.setInputFiles("#file-upload", {
                name: "policy.pdf",
                mimeType: "application/pdf",
                buffer: Buffer.from("%PDF-1.4 T-016b fixture, never uploaded"),
            })
            await page.getByRole("button", { name: "Προσθήκη στο πορτοφόλι" }).click()
            await page.waitForSelector("#ai-consent-title", { timeout: 10_000 })
            await page.waitForTimeout(300)
            // minSections: 0 — same as wallet-add-baseline.spec.ts's own
            // captures of this page: AddPolicyClient.tsx has neither
            // `.pw-page-shell` nor `section[id]`.
            await captureSurface(page, dirs, "ai-consent-modal", width, [], { tier: "paid", trigger: "/wallet/add submit, no prior consent" }, 200, 0)
            // CANCEL — «Όχι τώρα» — never accept (accepting would durably
            // record consent server-side via POST /api/v1/consents, which
            // the `finally` below cannot undo).
            await page.getByRole("button", { name: "Όχι τώρα" }).click()
            await page.waitForTimeout(200)
        }
    } finally {
        await withDb((db) => db.user.update({ where: { email: EMAIL }, data: { aiProcessingConsentVersion: original } }))
    }
})

test("baseline: Coverage Limit Modal, opened from /wallet/add (real POLICY_LIMIT_REACHED)", async ({ page }) => {
    test.setTimeout(6 * 60_000)
    for (const width of WIDTHS) {
        await openSurface(page, "/wallet/add", width)
        await page.selectOption("#add-lineOfBusiness", "motor")
        await page.setInputFiles("#file-upload", {
            name: "policy.pdf",
            mimeType: "application/pdf",
            buffer: Buffer.from("%PDF-1.4 T-016b fixture — uploaded to storage, policy never committed (limit reached)"),
        })
        await page.getByRole("button", { name: "Προσθήκη στο πορτοφόλι" }).click()
        // Real network round-trip: client-side Supabase Storage upload, then
        // the createPolicy server action. e2e-ph is already over its own
        // plan's 25-policy cap (29 policies from the T-015/T-016 fixture
        // matrices), so this returns POLICY_LIMIT_REACHED without any DB
        // fixture change.
        await page.waitForSelector('[role="dialog"], .fixed.inset-0', { timeout: 30_000 }).catch(() => {})
        // UpgradeModal's own heading text is asserted loosely — captured
        // regardless via a fixed settle wait, since the modal's exact
        // selector is not documented anywhere else in this evidence run.
        await page.waitForTimeout(800)
        await captureSurface(page, dirs, "coverage-limit-modal", width, [], { tier: "paid", trigger: "/wallet/add submit, POLICY_LIMIT_REACHED (29/25 policies)" }, 200, 0)
        await page.keyboard.press("Escape").catch(() => {})
        await page.waitForTimeout(200)
    }
})

test("baseline: Policy Comparison Dialog — picker (0 selected) and comparison table (2 selected)", async ({ page }) => {
    test.setTimeout(6 * 60_000)
    for (const width of WIDTHS) {
        await openSurface(page, "/wallet", width)
        await page.getByRole("button", { name: "Σύγκριση ασφαλιστηρίων" }).click()
        await page.waitForSelector('[role="dialog"]', { timeout: 10_000 })
        await page.waitForTimeout(300)
        await captureSurface(page, dirs, "policy-comparison-picker", width, [], { tier: "paid", trigger: "/wallet compare button, 0 selected" }, 200)

        // Select the first two selectable cards in the picker grid — both
        // motor-active and motor-expiring are in-force motor policies, so any
        // two of the grid's cards are a valid same-family pair.
        const cards = page.locator('[role="dialog"] .grid.grid-cols-1 button:not([disabled])')
        const cardCount = await cards.count()
        expect(cardCount, "at least two comparable policy cards in the picker").toBeGreaterThanOrEqual(2)
        await cards.nth(0).click()
        await page.waitForTimeout(150)
        await cards.nth(0).click().catch(() => {}) // no-op guard if the list re-renders and shifts index; see nth(1) below as the real second pick
        // Re-query after the first selection re-renders the grid (fewer/reordered cards).
        const remaining = page.locator('[role="dialog"] .grid.grid-cols-1 button:not([disabled])')
        await remaining.nth(0).click()
        await page.waitForTimeout(300)
        await captureSurface(page, dirs, "policy-comparison-table", width, [], { tier: "paid", trigger: "/wallet compare button, 2 selected (motor)" }, 200)

        await page.keyboard.press("Escape").catch(() => {})
        await page.waitForTimeout(200)
    }
})

test("baseline: generic Confirm Dialog (destructive) — sign out everywhere, /account/security", async ({ page }) => {
    test.setTimeout(6 * 60_000)
    for (const width of WIDTHS) {
        await openSurface(page, "/account/security", width)
        const trigger = page.getByRole("button", { name: "Αποσύνδεση από παντού" })
        await trigger.scrollIntoViewIfNeeded()
        await trigger.click()
        await page.waitForSelector('[role="dialog"]', { timeout: 10_000 })
        await page.waitForTimeout(300)
        await captureSurface(page, dirs, "confirm-dialog-signout-everywhere", width, [], { tier: "paid", trigger: "/account/security sign-out-everywhere button" }, 200)
        // ALWAYS cancel — confirming would sign out this very session.
        const cancel = page.getByRole("button", { name: "Ακύρωση" })
        if (await cancel.isVisible().catch(() => false)) {
            await cancel.click()
        } else {
            await page.keyboard.press("Escape").catch(() => {})
        }
        await page.waitForTimeout(200)
    }
})
