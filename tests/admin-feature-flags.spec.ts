import { test, expect } from '@playwright/test'
import { dismissCookieBanner } from './helpers/ui'

/**
 * The feature-flag console.
 *
 * The property worth pinning is not "the page loads" but that it stays honest
 * in the state that actually breaks admin tooling: the migration has not been
 * applied to this environment yet. Code and migration ship separately here (the
 * Prisma migrate CLI cannot reach this database), so that window is real, and
 * the page has to render and SAY so rather than 500.
 *
 * Runs under admin-chromium — /admin/* bounces everyone else.
 */
test.describe('feature flag console', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/admin/automation/flags')
        await dismissCookieBanner(page)
    })

    test('renders every declared flag, whether or not the table exists', async ({ page }) => {
        await expect(page.getByRole('heading', { name: 'Feature flags', level: 1 })).toBeVisible()

        // The seven declared flags, by their registry keys. If the registry
        // grows, this list is where you notice the console was not updated.
        for (const key of [
            'ai.failover_openai',
            'ai.degraded_completion',
            'ai.remediation_alerts',
            'ai.full_failover',
            'ai.remediation_canary',
            'auth.enforce_email_verification',
            'extraction.citations',
        ]) {
            await expect(page.getByText(key, { exact: true })).toBeVisible()
        }
    })

    test('states where each value is coming from', async ({ page }) => {
        // Provenance is the thing an operator cannot get anywhere else: with no
        // override and no env var, a flag must report "code default", not
        // simply "off" — those are different facts.
        const sources = page.getByText(/^(override|environment|code default)$/)
        expect(await sources.count()).toBeGreaterThan(0)
    })

    test('never presents an env-only flag as editable', async ({ page }) => {
        // extraction.citations is read synchronously while building the
        // extraction prompt, so the console lists it for visibility and must
        // not imply it can be changed here.
        const citations = page
            .locator('article')
            .filter({ hasText: 'extraction.citations' })
        await expect(citations.getByText('read-only')).toBeVisible()
        await expect(citations.locator('select')).toHaveCount(0)
    })

    test('is reachable from the automation hub', async ({ page }) => {
        await page.goto('/admin/automation')
        await dismissCookieBanner(page)
        const link = page.getByRole('link', { name: /Feature flags/i })
        await expect(link).toBeVisible()
        await link.click()
        await expect(page).toHaveURL(/\/admin\/automation\/flags/)
    })

    test('does not overflow at 320px', async ({ page }) => {
        await page.setViewportSize({ width: 320, height: 844 })
        await page.goto('/admin/automation/flags')
        await dismissCookieBanner(page)
        const overflow = await page.evaluate(() => {
            const de = document.documentElement
            return { scrollW: de.scrollWidth, vw: de.clientWidth }
        })
        expect(overflow.scrollW).toBeLessThanOrEqual(overflow.vw + 2)
    })
})
