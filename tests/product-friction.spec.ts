import { expect, test } from "@playwright/test"

test.use({
    storageState: { cookies: [], origins: [] },
})

test.describe("Product Browse Friction", () => {
    test("secondary CTA scrolls to how-it-works and focuses the section heading", async ({ page }) => {
        await page.goto("/product")

        const cta = page.getByRole("button", { name: /see how it works|πώς λειτουργεί/i })
        await cta.focus()
        await page.keyboard.press("Enter")

        // Copy evolved (was "three steps to full control…"); target the stable
        // structural id so the test tracks the MECHANISM (scroll + focus), and
        // assert the current heading text loosely.
        const heading = page.locator("#how-it-works-heading")

        await expect(heading).toBeFocused()

        const box = await heading.boundingBox()
        expect(box).not.toBeNull()
        expect(box!.y).toBeGreaterThanOrEqual(0)
        // Post-repaint header/scroll-margin puts the heading ~290px down;
        // the intent is "scrolled into the upper part of the viewport".
        expect(box!.y).toBeLessThan(400)
    })

    test("categories browse control no longer gates signup and property typo is fixed", async ({ page }) => {
        await page.goto("/product")

        // Same reasoning as the test above: the category grid is asserted by
        // the destination it links to, not by the sentence on the card. This
        // used to require the phrase "υπο-ασφάλιση ακινήτου", which the copy
        // rewrite replaced with plain words for the same idea — and the test
        // then read a rewrite as a missing category.
        const categories = page.locator("#product-categories")
        await expect(categories.locator('a[href="/product/property"]').first()).toBeVisible()
        // The typo this test is named for. Kept page-wide and cheap: the word
        // can come back with the copy, and a doubled kappa is invisible in
        // review to anyone reading quickly in a second language.
        await expect(page.locator("body")).not.toContainText(/ακκινήτου/i)

        const browseControl = page.getByRole("button", { name: /see all|δείτε όλα/i })
        await browseControl.focus()
        await page.keyboard.press("Enter")

        // Structural id, not the heading's text — which now counts the
        // categories ("16 είδη συμβολαίων. Μία ανάλυση.") and so changes
        // whenever the catalog does.
        await expect(page.locator("#product-categories-heading")).toBeFocused()
        await expect(page).toHaveURL(/\/product$/)
    })

    test("product sub-pages expose sibling category links without self-linking", async ({ page }) => {
        await page.goto("/product/motor")

        const explorer = page.getByTestId("product-category-explorer")
        await expect(explorer).toBeVisible()
        await expect(explorer.locator('a[href="/product/property"]')).toBeVisible()
        await expect(explorer.locator('a[href="/product/health"]')).toBeVisible()
        await expect(explorer.locator('a[href="/product/motor"]')).toHaveCount(0)

        await explorer.locator('a[href="/product/property"]').first().click()
        await expect(page).toHaveURL(/\/product\/property$/)
    })
})
