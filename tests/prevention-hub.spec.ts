import { test, expect } from '@playwright/test'
import { config } from 'dotenv'
import { dismissCookieBanner } from './helpers/ui'
config({ path: '.env.local', quiet: true })
let policyId = ''
let ownerId = ''
test.describe.configure({ mode: 'serial' })
test.beforeAll(async () => {
    test.setTimeout(120000)
    if (!new URL(process.env.DIRECT_URL || '').username.includes('lzqvtvjggylcujenlelh')) throw new Error('Development fixtures only')
    const { db } = require('../lib/db')
    const owner = await db.user.findUniqueOrThrow({ where: { email: 'e2e-ph@policywallet.test' }, select: { id: true } }); ownerId = owner.id
    const data = { ownerUserId: ownerId, createdByUserId: ownerId, insurerName: 'Test insurer', policyNumber: 'E2E-CROSS-LINE-BENEFIT', nickname: 'Δοκιμή παροχής αυτοκινήτου', lineOfBusiness: 'motor', status: 'active', startDate: new Date('2026-01-01'), endDate: new Date('2027-12-31'),
        acordData: { perksAndBenefits: [{ perkType: 'discount', name: { el: 'Έκπτωση αιματολογικών εξετάσεων', en: 'Blood test discount' }, description: { el: 'Έκπτωση για τον οδηγό σε συγκεκριμένο δίκτυο.', en: 'A discount for the driver within a specified network.' }, terms: { beneficiaries: 'Οδηγός', cost: '20% έκπτωση', network: 'Δίκτυο δοκιμής' } }], extraction: { documentId: 'fixture-document', analysisRunId: 'fixture-run', extractedAt: '2026-10-01', sources: { 'acordData.perksAndBenefits.0': { page: 2, snippet: 'Έκπτωση 20% για τον οδηγό.', verified: true } } } } }
    const existing = await db.policy.findFirst({ where: { ownerUserId: ownerId, policyNumber: data.policyNumber }, select: { id: true } })
    policyId = existing ? (await db.policy.update({ where: { id: existing.id }, data })).id : (await db.policy.create({ data })).id
    await db.preventionProgress.deleteMany({ where: { userId: ownerId, policyId } })
})
test.afterAll(async () => {
    const { db } = require('../lib/db')
    if (policyId) await db.policy.deleteMany({ where: { id: policyId, ownerUserId: ownerId, policyNumber: 'E2E-CROSS-LINE-BENEFIT' } })
    await db.$disconnect()
})
for (const width of [320, 390, 1280]) {
    test(`cross-line benefit and optional disclosure fit ${width}px`, async ({ page }, info) => {
        await page.setViewportSize({ width, height: 900 }); await page.goto('/wellness'); await dismissCookieBanner(page)
        await expect(page.getByRole('heading', { name: 'Πρόληψη & παροχές', exact: true })).toBeVisible()
        const card = page.getByTestId('prevention-item').filter({ has: page.getByRole('heading', { name: 'Έκπτωση αιματολογικών εξετάσεων', exact: true }) })
        await expect(card).toContainText('Έκπτωση · όχι δωρεάν υπηρεσία')
        await card.locator('summary').filter({ hasText: 'Όροι και προέλευση' }).click()
        await expect(card).toContainText('Σελίδα 2'); await expect(card).toContainText('Δεν επιβεβαιώνει δικαίωμα χρήσης')
        await expect(card.getByText('Οδηγός', { exact: true })).toBeVisible()
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
        await page.getByRole('button', { name: 'Ανά ασφαλιστήριο', exact: true }).click()
        await expect(page.getByRole('button', { name: 'Ανά ασφαλιστήριο', exact: true })).toHaveAttribute('aria-pressed', 'true')
        await expect(page.getByRole('button', { name: 'Ανά τομέα ζωής', exact: true })).toHaveAttribute('aria-pressed', 'false')
        await expect(card).toBeVisible(); await expect(page.locator('[data-fact="prevention.item"]')).not.toHaveCount(0)
        await page.screenshot({ path: info.outputPath(`prevention-${width}.png`), fullPage: false, animations: 'disabled' })
    })
}
test('explicit health consent, persisted progress in both views, and clearing', async ({ page }) => {
    await page.goto('/wellness'); await dismissCookieBanner(page)
    const card = page.getByTestId('prevention-item').filter({ has: page.getByRole('heading', { name: 'Έκπτωση αιματολογικών εξετάσεων', exact: true }) })
    await card.locator('summary').filter({ hasText: 'Επιλογή βήματος' }).click()
    const done = card.getByRole('button', { name: 'Το ολοκλήρωσα', exact: true })
    await expect(done).toBeDisabled()
    await card.getByRole('checkbox', { name: /Συμφωνώ να αποθηκευτεί ιδιωτικά/ }).check()
    await done.click(); await expect(page.getByText('Η επιλογή αποθηκεύτηκε', { exact: true })).toBeVisible()
    await page.reload(); await page.getByRole('button', { name: 'Ανά ασφαλιστήριο', exact: true }).click()
    await expect(card).toContainText('Το ολοκλήρωσα')
    await card.locator('summary').filter({ hasText: 'Επιλογή βήματος' }).click()
    await card.getByRole('button', { name: 'Καθαρισμός επιλογής' }).click()
    await expect(page.getByText('Η επιλογή αποθηκεύτηκε', { exact: true })).toBeVisible()
})
test('English copy, keyboard disclosure, and no active score', async ({ page }) => {
    await page.request.post('/api/user/language', { data: { language: 'en' } })
    await page.goto('/wellness'); await dismissCookieBanner(page)
    await expect(page.getByRole('heading', { name: 'Prevention & benefits', exact: true })).toBeVisible()
    const habit = page.locator('summary').filter({ hasText: 'Your everyday life' })
    await habit.focus(); await page.keyboard.press('Enter')
    await expect(page.getByLabel('Over the past week, on how many days were you active?')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Save answers', exact: true })).toBeDisabled()
    await expect(page.locator('[data-fact="wellness.score"]')).toHaveCount(0)
    await page.request.post('/api/user/language', { data: { language: 'el' } })
})

test('the next-step link stays visible after domain filtering', async ({ page }) => {
    await page.goto('/wellness'); await dismissCookieBanner(page)
    await page.getByRole('combobox', { name: 'Εμφάνιση', exact: true }).selectOption('mobility')
    const step = page.getByRole('link', { name: 'Δείτε το βήμα', exact: true })
    const target = (await step.getAttribute('href'))!.slice(1)
    await step.click()
    await expect(page.locator(`[id="${target}"]`)).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Έκπτωση αιματολογικών εξετάσεων', exact: true })).toHaveCount(0)
})
