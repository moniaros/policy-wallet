import { test, expect } from '@playwright/test'

/**
 * /agent renders the policyholder's "my advisor" page. Without a linked
 * advisor — the default for every new policyholder — it early-returns an empty
 * state, which used to headline at h3, leaving the route with no <h1> and its
 * first heading at level 3.
 *
 * Runs under the ADMIN session because that fixture has no advisor
 * relationship, which is exactly why the original audit saw this as an
 * "admin" problem. The condition is data, not role — so the test asserts the
 * state it actually found rather than assuming which branch rendered.
 */

test('/agent exposes exactly one h1 in whichever branch renders', async ({ page }) => {
    test.setTimeout(90_000)
    await page.goto('/agent')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)

    const h1s = page.locator('h1')
    const count = await h1s.count()

    // The real assertion: never zero (screen-reader users land on a page with
    // no title) and never more than one (the duplicate-h1 defect fixed on
    // /onboarding/agent). Both failure modes are live risks here because the
    // two branches each own a heading.
    expect(count, 'expected exactly one h1 on /agent').toBe(1)
    await expect(h1s.first()).toBeVisible()
    expect((await h1s.first().innerText()).trim().length).toBeGreaterThan(0)

    // Heading order must not start below h1.
    const firstHeadingLevel = await page.evaluate(() => {
        const h = document.querySelector('h1, h2, h3, h4, h5, h6')
        return h ? Number(h.tagName.slice(1)) : null
    })
    expect(firstHeadingLevel, 'first heading on the page must be the h1').toBe(1)
})
