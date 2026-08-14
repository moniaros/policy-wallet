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

/**
 * The write path, end to end.
 *
 * Everything above proves the console RENDERS. None of it proves it SAVES —
 * and the earlier runs all happened against a database with no flags table, so
 * the whole persistence path had never once been exercised. These tests close
 * that gap before anyone applies the migration to production: an override that
 * takes effect, a revision recorded against it, and a clear that hands control
 * back to the deployment rather than switching the feature off.
 *
 * Uses ai.remediation_alerts: a boolean flag that defaults OFF, is not
 * safety-critical (so it needs no stated reason), and whose only consumer is
 * the AI remediation path, which nothing in this suite exercises.
 */
test.describe('feature flag write path', () => {
    const KEY = 'ai.remediation_alerts'

    const card = (page: import('@playwright/test').Page) =>
        page.locator('article').filter({ hasText: KEY })

    test.afterEach(async ({ page }) => {
        // Leave the flag as the deployment defines it, whatever the test did.
        await page.goto('/admin/automation/flags')
        await dismissCookieBanner(page)
        const clear = card(page).getByRole('button', { name: /Clear override/i })
        if (await clear.count()) {
            await clear.click()
            await page.waitForURL(/saved=/)
        }
    })

    test('an override persists, takes effect, and is attributed', async ({ page }) => {
        await page.goto('/admin/automation/flags')
        await dismissCookieBanner(page)

        // Registry default is off, and nothing has overridden it.
        await expect(card(page).getByText('on', { exact: true })).toHaveCount(0)

        await card(page).locator('select[name="enabled"]').selectOption('true')
        await card(page).getByRole('button', { name: 'Save' }).click()
        await page.waitForURL(/saved=1/)

        // The resolved value moved, and the console says WHERE it came from —
        // "override", not "environment" or "code default".
        await expect(card(page).getByText('on', { exact: true })).toBeVisible()
        await expect(card(page).getByText('override', { exact: true })).toBeVisible()

        // A flag flip changes live traffic, so it has to leave a trace.
        const history = page.locator('section').filter({ hasText: 'Recent changes' })
        await expect(history.getByText(KEY, { exact: false }).first()).toBeVisible()
        await expect(history.getByText('e2e-admin@policywallet.test').first()).toBeVisible()
    })

    test('clearing an override restores the deployment, it does not switch off', async ({ page }) => {
        // The trap this guards: if "clear" were implemented as "set false", an
        // operator undoing a change would silently disable the feature instead.
        await page.goto('/admin/automation/flags')
        await dismissCookieBanner(page)

        await card(page).locator('select[name="enabled"]').selectOption('true')
        await card(page).getByRole('button', { name: 'Save' }).click()
        await page.waitForURL(/saved=1/)
        await expect(card(page).getByText('override', { exact: true })).toBeVisible()

        await card(page).getByRole('button', { name: /Clear override/i }).click()
        await page.waitForURL(/saved=reset/)

        // Back to whatever the deployment says — provenance is no longer
        // "override", and the row no longer claims control.
        await expect(card(page).getByText('override', { exact: true })).toHaveCount(0)
        await expect(card(page).getByText(/environment|code default/)).toBeVisible()
    })

    test('a no-op save records no new version', async ({ page }) => {
        // A version history full of saves that changed nothing is a history
        // nobody can read.
        await page.goto('/admin/automation/flags')
        await dismissCookieBanner(page)

        await card(page).locator('select[name="enabled"]').selectOption('true')
        await card(page).getByRole('button', { name: 'Save' }).click()
        await page.waitForURL(/saved=1/)

        await card(page).locator('select[name="enabled"]').selectOption('true')
        await card(page).getByRole('button', { name: 'Save' }).click()
        await page.waitForURL(/saved=nochange/)
    })
})
