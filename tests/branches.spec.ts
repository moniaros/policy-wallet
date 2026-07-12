import { test, expect } from "@playwright/test"

import { dismissCookieBanner } from "./helpers/ui"

/**
 * Branch overview pages (/branches, /branches/[branch]) — Wave 3 of the
 * insurance-branch product system. Desktop policyholder flow.
 */
test.describe("Branch pages", () => {
    test.beforeEach(async ({ page }, testInfo) => {
        test.skip(/Mobile|agent|sentry/i.test(testInfo.project.name), "Desktop policyholder flow only")
    })

    test("branches index renders the coverage grid with all rich branches", async ({ page }) => {
        await page.goto("/branches")
        await dismissCookieBanner(page)

        await expect(page.getByRole("heading", { name: /Κλάδοι ασφάλισης|Insurance branches/ })).toBeVisible()

        const tiles = page.locator('a[href^="/branches/"]')
        expect(await tiles.count()).toBeGreaterThanOrEqual(9)

        // The 9 rich branches are always present
        for (const branchId of ["motor", "home", "health", "life", "pension", "travel", "cyber", "pet", "business"]) {
            await expect(page.locator(`a[href="/branches/${branchId}"]`)).toBeVisible()
        }
    })

    test("motor branch page renders the content sections", async ({ page }) => {
        await page.goto("/branches/motor")
        await dismissCookieBanner(page)

        await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
        // Editorial sections from the content bundle chrome
        await expect(page.getByText(/Γιατί έχει σημασία|Why it matters/i)).toBeVisible()
        await expect(page.getByText(/Τι αναλύει το PolicyWallet|What PolicyWallet analyzes/i)).toBeVisible()
        await expect(page.getByText(/Συχνά κενά κάλυψης|Common coverage gaps/i)).toBeVisible()
        await expect(page.getByText(/Προτεινόμενες ενέργειες|Recommended actions/i)).toBeVisible()
        // Agent CTA always renders (exact match — action pills reuse the phrase as a prefix)
        await expect(page.getByRole("link", { name: /^(Ρώτησε τον σύμβουλό σου|Ask your advisor)$/ })).toBeVisible()
    })

    test("branch page suggested questions deep-link into policy Q&A", async ({ page }) => {
        await page.goto("/branches/motor")
        await dismissCookieBanner(page)

        // The fixture policyholder owns a motor policy, so question links must
        // target /wallet/<id>?q=…#policy-qa (they hide when no policy exists).
        const questionLinks = page.locator('a[href*="?q="][href*="#policy-qa"]')
        const count = await questionLinks.count()
        if (count > 0) {
            const href = await questionLinks.first().getAttribute("href")
            expect(href).toMatch(/^\/wallet\/.+\?q=.+#policy-qa$/)
        } else {
            // No policy in this branch for the fixture user — the empty state
            // with an upload CTA must render instead.
            await expect(page.getByRole("link", { name: /Ανέβασε συμβόλαιο|Upload policy/i })).toBeVisible()
        }
    })

    test("generic-tier branch renders the fallback content", async ({ page }) => {
        await page.goto("/branches/boat")
        await dismissCookieBanner(page)

        await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
        await expect(page.getByText(/Γιατί έχει σημασία|Why it matters/i)).toBeVisible()
    })

    test("unknown branch id renders the not-found page", async ({ page }) => {
        // Streaming can emit a 200 before notFound() resolves, so assert the
        // rendered not-found UI rather than the response status.
        await page.goto("/branches/bogus-branch")
        await expect(page.getByText(/404|could not be found|δεν βρέθηκε/i).first()).toBeVisible()
    })

    test("sidebar navigation includes the branches entry", async ({ page }) => {
        await page.goto("/dashboard")
        await dismissCookieBanner(page)

        const navLink = page.locator('a[href="/branches"], button:has-text("Κλάδοι"), button:has-text("Branches")').first()
        await expect(navLink).toBeVisible()
    })
})
