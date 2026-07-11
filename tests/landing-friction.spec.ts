import { expect, test } from "@playwright/test"

test.describe("Landing Friction Regressions", () => {
    test("cookie banner persists accepted state across public pages", async ({ page, context }) => {
        await context.clearCookies()

        await page.goto("/")
        const acceptAll = page.getByRole("button", { name: /accept all|αποδοχή όλων/i })
        await expect(acceptAll).toBeVisible()
        await acceptAll.click()
        await expect(acceptAll).toBeHidden()

        await page.goto("/product")
        await expect(page.getByRole("button", { name: /accept all|αποδοχή όλων/i })).toHaveCount(0)

        await page.goto("/pricing")
        await expect(page.getByRole("button", { name: /accept all|αποδοχή όλων/i })).toHaveCount(0)
    })

    test("contact CTA routes to contact page instead of mailto", async ({ page }) => {
        await page.goto("/")

        // Both header and footer carry the contact link — assert the first
        const contactCta = page.getByRole("link", { name: /contact us|επικοινωνία/i }).first()
        await expect(contactCta).toHaveAttribute("href", "/contact")
    })

    test("solutions dropdown trigger is present across key public pages", async ({ page }) => {
        await page.goto("/")
        await expect(page.getByRole("button", { name: /solutions|λύσεις/i }).first()).toBeVisible()

        await page.goto("/product")
        await expect(page.getByRole("button", { name: /solutions|λύσεις/i }).first()).toBeVisible()

        await page.goto("/pricing")
        await expect(page.getByRole("button", { name: /solutions|λύσεις/i }).first()).toBeVisible()

        await page.goto("/company")
        await expect(page.getByRole("button", { name: /solutions|λύσεις/i }).first()).toBeVisible()
    })

    test("pricing footer uses current year", async ({ page }) => {
        await page.goto("/pricing")
        const year = new Date().getFullYear().toString()
        await expect(page.locator("footer")).toContainText(year)
    })
})
