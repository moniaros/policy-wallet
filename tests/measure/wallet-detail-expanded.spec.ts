/**
 * SUPPLEMENTARY capture — `/wallet/[id]` with all 6 accordion sections
 * expanded, added after discovering (via `overlays-baseline.spec.ts`'s Delete
 * Policy Dialog test) that `PolicySection` UNMOUNTS its children when
 * closed — not merely hides them (`components/wallet/policy-detail/PolicySection.tsx`'s
 * own comment: "Unmounted when closed, not hidden: a closed section must not
 * contribute its facts to the page"). Every `<PolicySection>` on this page
 * defaults to closed (no `defaultOpen` prop is ever passed in
 * `PolicyDetailsClientView.tsx`) and at most ONE opens automatically
 * (`openSection = forcedOpen ?? attention.target`). This means
 * `wallet-detail-baseline.spec.ts`'s 45 captures measured the ALWAYS-VISIBLE
 * head (hero, actions, summary, gap banner) but NOT the six collapsible
 * sections' content (coverage, terms/exclusions, review/analysis, dates,
 * claims, documents) — the tap-target, truncation, container and 1.4.11
 * counts in that document are a floor, not the whole page.
 *
 * This file measures the SAME `motor-active` fixture with every section
 * clicked open, so the two numbers can be compared side by side.
 *
 * Run:  npx playwright test --project=measure wallet-detail-expanded
 */
import { test, expect } from "@playwright/test"
import { FIXTURE_SPECS, provisionMatrixFixtures } from "./fixtures"
import { evidenceDirs, ensureDirs, openSurface, captureSurface, withDb } from "./surface-harness"

const WIDTHS = [320, 390, 430] as const
const EMAIL = "e2e-ph@policywallet.test"
const dirs = evidenceDirs("wallet-detail")
const SECTION_IDS = ["coverage", "terms", "review", "dates", "claims", "documents"]

test.describe.configure({ mode: "serial" })

let ids: Record<string, string> = {}

test.beforeAll(async () => {
    test.setTimeout(300_000)
    ensureDirs(dirs)
    ids = await withDb((db) => provisionMatrixFixtures(db, EMAIL, FIXTURE_SPECS))
})

test("supplementary: motor-active with all 6 sections expanded", async ({ page }) => {
    test.setTimeout(10 * 60_000)
    const policyId = ids["motor-active"]
    expect(policyId, "motor-active fixture provisioned").toBeTruthy()
    for (const width of WIDTHS) {
        await openSurface(page, `/wallet/${policyId}`, width)
        for (const id of SECTION_IDS) {
            const header = page.locator(`#${id} button`).first()
            if (await header.count()) {
                const expanded = await header.getAttribute("aria-expanded")
                if (expanded !== "true") {
                    await header.click()
                    await page.waitForTimeout(150)
                }
            }
        }
        await page.waitForTimeout(400)
        await captureSurface(page, dirs, "motor-active-all-expanded", width, [
            { key: "policy.policyNumber", value: "ΣΥΜΒ-2025-MOT-ACT" },
        ], { tier: "paid", note: "all 6 PolicySection accordions force-expanded" })
    }
})
