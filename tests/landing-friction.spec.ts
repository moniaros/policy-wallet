import { expect, test } from "@playwright/test"
import { PUBLIC_NAV_ITEMS } from "@/lib/nav/public-nav"

/**
 * Read the trigger's name from the nav's own source instead of repeating it.
 *
 * This test used to hardcode "Λύσεις", and when that dropdown absorbed the
 * neighbouring "Προϊόντα" link and took its name, the test reported the header
 * as MISSING on four public pages — a rename read as a regression. The thing
 * being guarded is that the dropdown is rendered everywhere, not what it is
 * called this quarter.
 */
const navDropdown = PUBLIC_NAV_ITEMS.find((item) => item.kind === "dropdown")!
const DROPDOWN_TRIGGER = new RegExp(`^(${navDropdown.label.el}|${navDropdown.label.en})$`, "i")

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

    test("the nav dropdown trigger is present across key public pages", async ({ page }) => {
        for (const path of ["/", "/product", "/pricing", "/company"]) {
            await page.goto(path)
            await expect(
                page.getByRole("button", { name: DROPDOWN_TRIGGER }).first(),
                `nav dropdown trigger missing on ${path}`
            ).toBeVisible()
        }
    })

    test("pricing footer uses current year", async ({ page }) => {
        await page.goto("/pricing")
        const year = new Date().getFullYear().toString()
        await expect(page.locator("footer")).toContainText(year)
    })
})
