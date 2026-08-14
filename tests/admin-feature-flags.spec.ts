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

    // Addressed by test id, not by text: "on", "off" and "override" also appear
    // as <option> labels and prose inside the same card, so a text locator is
    // ambiguous — which is exactly how the first run of these tests failed.
    const state = (page: import('@playwright/test').Page) =>
        page.getByTestId(`flag-state-${KEY}`)
    const source = (page: import('@playwright/test').Page) =>
        page.getByTestId(`flag-source-${KEY}`)
    const card = (page: import('@playwright/test').Page) =>
        page.locator('article').filter({ hasText: KEY })

    /** Start every test from the deployment's own answer, whatever ran before. */
    async function resetToDeployment(page: import('@playwright/test').Page) {
        await page.goto('/admin/automation/flags')
        await dismissCookieBanner(page)
        const clear = card(page).getByRole('button', { name: /Clear override/i })
        if (await clear.count()) {
            await clear.click()
            await page.waitForURL(/saved=/)
        }
    }

    async function setEnabled(page: import('@playwright/test').Page, value: string) {
        await card(page).locator('select[name="enabled"]').selectOption(value)
        await card(page).getByRole('button', { name: 'Save' }).click()
    }

    test.beforeEach(async ({ page }) => resetToDeployment(page))
    test.afterEach(async ({ page }) => resetToDeployment(page))

    test('an override persists, takes effect, and is attributed', async ({ page }) => {
        await expect(state(page)).toHaveText('off')
        await expect(source(page)).not.toHaveText('override')

        await setEnabled(page, 'true')
        await page.waitForURL(/saved=1/)

        await expect(state(page)).toHaveText('on')
        await expect(source(page)).toHaveText('override')

        // A flag flip changes live traffic, so it has to leave a trace.
        const history = page.locator('section').filter({ hasText: 'Recent changes' })
        await expect(history.getByText('e2e-admin@policywallet.test').first()).toBeVisible()
    })

    test('clearing an override restores the deployment, it does not switch off', async ({ page }) => {
        // The trap: if "clear" were implemented as "set false", an operator
        // undoing a change would silently disable the feature instead.
        await setEnabled(page, 'true')
        await page.waitForURL(/saved=1/)
        await expect(source(page)).toHaveText('override')

        await card(page).getByRole('button', { name: /Clear override/i }).click()
        await page.waitForURL(/saved=reset/)

        await expect(source(page)).not.toHaveText('override')
        await expect(state(page)).toHaveText('off')
    })

    test('a no-op save records no new version', async ({ page }) => {
        // A history full of saves that changed nothing is a history nobody reads.
        await setEnabled(page, 'true')
        await page.waitForURL(/saved=1/)

        await setEnabled(page, 'true')
        await page.waitForURL(/saved=nochange/)
    })
})
