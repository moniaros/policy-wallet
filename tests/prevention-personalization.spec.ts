import { test, expect } from '@playwright/test'
import { config } from 'dotenv'
import { dismissCookieBanner } from './helpers/ui'
config({ path: '.env.local', quiet: true })
let policyId = ''
let ownerId = ''
const oldPeriod = { key: '2024-05-22/2025-05-22', start: '2024-05-22', end: '2025-05-22' }
const period = { key: '2026-05-22/2027-05-22', start: '2026-05-22', end: '2027-05-22' }
const composition = { version: '1', sourceVersion: 'e2e-source-v1', generatedAt: '2026-10-02', activation: 'unconfirmed', issues: ['missing_period','missing_amendment','verification_unavailable'], period,
    documents: [], conditions: [{ text: 'Συνθετικό παράδειγμα: ειδική συμμετοχή για νοσηλεία στις ΗΠΑ.' }],
    benefits: [{ key: 'annual', state: 'conflicting', periods: [oldPeriod, period], sources: { benefit: { documentId: 'fixture-base', documentHash: 'fixture-hash', runId: null }, 'terms.frequency': { documentId: 'fixture-base', documentHash: 'fixture-hash', runId: null } }, conflicts: [{ field: 'network', priorValue: 'Network A (example)', currentValue: 'Network B (example)', priorSource: { documentId: 'fixture-base', documentHash: 'fixture-hash', runId: null }, currentSource: { documentId: 'fixture-renewal', documentHash: 'fixture-new', runId: null, page: 2 } }], perk: { name: { el: 'Δοκιμαστική παροχή check-up', en: 'Test check-up benefit' }, description: { el: 'Μία χρήση ανά ασφαλιστικό έτος, σύμφωνα με τους όρους του παραδείγματος.', en: 'One use per insurance year, under the example terms.' }, rules: { code: 'annual_checkup', frequencyBasis: 'insurance_year', usesPerPeriod: 1, exclusiveWith: ['prenatal_checkup'] }, terms: { frequency: 'Μία φορά ανά ασφαλιστικό έτος', conditions: 'Επικοινωνία με το κέντρο συντονισμού και ταυτοποίηση.' } } }] }
test.describe.configure({ mode: 'serial', timeout: 120000 })
test.beforeAll(async () => {
    test.setTimeout(120000)
    if (!new URL(process.env.DIRECT_URL || '').username.includes('lzqvtvjggylcujenlelh')) throw new Error('Development fixtures only')
    const { db } = require('../lib/db')
    ownerId = (await db.user.findUniqueOrThrow({ where: { email: 'e2e-ph@policywallet.test' }, select: { id: true } })).id
    // Recover only this disposable fixture after a worker/connection failure.
    await db.policy.deleteMany({ where: { ownerUserId: ownerId, policyNumber: 'E2E-PERSONALIZATION' } })
    policyId = (await db.policy.create({ data: { ownerUserId: ownerId, createdByUserId: ownerId, insurerName: 'Test insurer', policyNumber: 'E2E-PERSONALIZATION', nickname: 'Συνθετική δοκιμή παροχών', lineOfBusiness: 'health', status: 'active', startDate: new Date(period.start), endDate: new Date(period.end), acordData: { extraction: { benefitComposition: composition } } } })).id
})
test.afterAll(async () => {
    const { db } = require('../lib/db')
    if (policyId) await db.policy.deleteMany({ where: { id: policyId, ownerUserId: ownerId, policyNumber: 'E2E-PERSONALIZATION' } })
    await db.$disconnect()
})
const cardFor = (page: any) => page.getByTestId('prevention-item').filter({ has: page.getByRole('heading', { name: 'Δοκιμαστική παροχή check-up', exact: true }) })
for (const width of [320,390,430,1280]) test(`personalized evidence and controls fit ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 950 }); await page.goto('/wellness'); await dismissCookieBanner(page)
    const card = cardFor(page); await expect(card).toBeVisible()
    await page.screenshot({ path: info.outputPath(`personalized-top-${width}.png`), animations: 'disabled' })
    await expect(card).toContainText('Το έγγραφο δεν επιβεβαιώνει ότι έχει πληρωθεί')
    await card.locator('summary').filter({ hasText: 'Τι χρειάζεται επιβεβαίωση' }).click()
    await expect(card).toContainText('Λείπει ενδιάμεση περίοδος')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: info.outputPath(`personalized-${width}.png`), animations: 'disabled' })
    await card.locator('summary').filter({ hasText: 'Χρήση παροχής στην περίοδο' }).click()
    await card.getByLabel('Περίοδος παροχής', { exact: true }).selectOption(oldPeriod.key)
    await card.getByRole('combobox', { name: 'Έχετε χρησιμοποιήσει αυτή την παροχή σε αυτή την περίοδο;', exact: true }).selectOption('used')
    await expect(card.getByLabel('Ημερομηνία χρήσης (αν τη γνωρίζετε)')).toHaveAttribute('min', oldPeriod.start)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await card.getByRole('button', { name: 'Αποθήκευση χρήσης', exact: true }).scrollIntoViewIfNeeded(); await page.screenshot({ path: info.outputPath(`personalized-form-${width}.png`), animations: 'disabled' })
    await card.locator('summary').filter({ hasText: 'Όροι και προέλευση' }).click()
    await expect(card).not.toContainText('Δεν έχει καταγραφεί πλήρης προέλευση της εξαγωγής.')
    const missingPageLinks = card.locator('a[href*="fixture-base"]'); await expect(missingPageLinks).toHaveCount(3)
    for (const link of await missingPageLinks.all()) { expect(await link.getAttribute('href')).not.toContain('#page='); await expect(link).not.toContainText('Σελίδα 1') }
    await card.getByRole('heading', { name: 'Αντικρουόμενα στοιχεία', exact: true }).scrollIntoViewIfNeeded()
    await page.screenshot({ path: info.outputPath(`personalized-conflict-${width}.png`), animations: 'disabled' })
})
test('chosen plan, separate period usage, reload and view changes', async ({ page }) => {
    await page.goto('/wellness'); await dismissCookieBanner(page)
    const card = cardFor(page)
    await card.locator('summary').filter({ hasText: 'Επιλογή βήματος' }).click()
    const plan = card.locator('details').filter({ has: page.locator('summary').filter({ hasText: 'Επιλογή βήματος' }) })
    await plan.getByRole('checkbox', { name: /Συμφωνώ/ }).check()
    await plan.getByLabel('Γνωρίζετε πώς χρησιμοποιείται; (προαιρετικό)').selectOption('false')
    await plan.getByLabel('Τι σας δυσκολεύει; (προαιρετικό)').selectOption('cost')
    await plan.getByRole('button', { name: 'Θα το κάνω', exact: true }).click()
    await expect(page.getByText('Η επιλογή αποθηκεύτηκε', { exact: true })).toBeVisible({ timeout: 15000 })
    await page.reload(); await expect(page.getByText('Είναι το βήμα που επιλέξατε.', { exact: true })).toBeVisible(); await page.getByRole('button', { name: 'Ανά ασφαλιστήριο', exact: true }).click()
    await expect(card).toContainText('Θα το κάνω')
    await card.locator('summary').filter({ hasText: 'Χρήση παροχής στην περίοδο' }).click()
    const usage = card.locator('details').filter({ has: page.locator('summary').filter({ hasText: 'Χρήση παροχής στην περίοδο' }) })
    await usage.getByLabel('Περίοδος παροχής', { exact: true }).selectOption(oldPeriod.key)
    await usage.getByLabel('Έχετε χρησιμοποιήσει αυτή την παροχή σε αυτή την περίοδο;').selectOption('used')
    await usage.getByLabel('Ημερομηνία χρήσης (αν τη γνωρίζετε)').fill('2024-06-01')
    await usage.getByRole('checkbox', { name: /Συμφωνώ/ }).check()
    await usage.getByRole('button', { name: 'Αποθήκευση χρήσης', exact: true }).click()
    await expect(usage.getByRole('status')).toHaveText('Η επιλογή αποθηκεύτηκε', { timeout: 30000 })
    await usage.getByLabel('Περίοδος παροχής', { exact: true }).selectOption(period.key)
    await expect(usage.getByLabel('Έχετε χρησιμοποιήσει αυτή την παροχή σε αυτή την περίοδο;')).toHaveValue('unknown')
    await page.reload(); await card.locator('summary').filter({ hasText: 'Χρήση παροχής στην περίοδο' }).click()
    await usage.getByLabel('Περίοδος παροχής', { exact: true }).selectOption(oldPeriod.key)
    await expect(usage.getByLabel('Έχετε χρησιμοποιήσει αυτή την παροχή σε αυτή την περίοδο;')).toHaveValue('used')
    await expect(card).toContainText('Θα το κάνω')
})
test('keyboard and English content', async ({ page }) => {
    await page.request.post('/api/user/language', { data: { language: 'en' } })
    await page.goto('/wellness')
    const card = page.getByTestId('prevention-item').filter({ has: page.getByRole('heading', { name: 'Test check-up benefit', exact: true }) })
    const summary = card.locator('summary').filter({ hasText: 'Benefit use in this period' }); await summary.focus(); await page.keyboard.press('Enter')
    await expect(card.getByLabel('Benefit period', { exact: true })).toBeVisible()
    await expect(card).toContainText('The document does not confirm payment')
    await page.request.post('/api/user/language', { data: { language: 'el' } })
})
