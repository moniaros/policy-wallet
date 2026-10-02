import { test, expect } from '@playwright/test'
import { dismissCookieBanner } from './helpers/ui'

test.use({ viewport: { width: 390, height: 844 } })

test('home foregrounds policy reading and prevention, with labelled mobile navigation', async ({ page }, testInfo) => {
    await page.goto('/dashboard')
    await dismissCookieBanner(page)
    await expect(page.locator('#dashboard-title')).toBeVisible()
    await expect(page.locator('#prevention-heading')).toBeAttached()
    const nav = page.getByRole('navigation', { name: /Γρήγορη πλοήγηση|Quick navigation/i })
    await expect(nav.getByRole('link', { name: /Πρόληψη|Prevention/i })).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath('home-mobile.png'), fullPage: false })
    const setup = page.locator('details#plan')
    await expect(setup).not.toHaveAttribute('open', '')
    await setup.locator('summary').click()
    await expect(setup).toHaveAttribute('open', '')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('upload is document-first and automatic category is the default', async ({ page }) => {
    await page.goto('/wallet/add')
    await dismissCookieBanner(page)
    await expect(page.locator('h1')).toBeVisible()
    const input = page.locator('#file-upload')
    await expect(input).toBeAttached()
    const box = await page.locator('h1').boundingBox()
    expect(box!.y).toBeLessThan(400)
    await expect(page.locator('#add-lineOfBusiness')).toHaveValue('')
    await expect(page.locator('details')).not.toHaveAttribute('open', '')
    await page.getByRole('button', { name: /Προσθήκη στο πορτοφόλι|Add to wallet/i }).click()
    await expect(page.locator('#add-policy-files-error')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('notification history remains accessible separately from the inbox', async ({ page }) => {
    await page.goto('/notifications')
    await dismissCookieBanner(page)
    const inbox = page.getByRole('button', { name: /Μέσα στην εφαρμογή|In the app/i })
    const history = page.getByRole('button', { name: /Ιστορικό αποστολών|Delivery history/i })
    await expect(inbox).toHaveAttribute('aria-pressed', 'true')
    await history.click()
    await expect(history).toHaveAttribute('aria-pressed', 'true')
    await inbox.click()
    await expect(inbox).toHaveAttribute('aria-pressed', 'true')
})
