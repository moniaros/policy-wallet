import { test, expect } from '@playwright/test'
import { config } from 'dotenv'
import { dismissCookieBanner } from '../helpers/ui'
config({ path: '.env.local', quiet: true })

/** Compatibility journey for the prevention pilot. The old yearly check-up
 * record remains canonical: both views use it, and no second reminder row is
 * created. Broad responsive/health-consent coverage lives in prevention-hub.spec.
 * The retired score/sharing journey has intentionally been replaced. */
let ownerId = ''
let policyId = ''
let year = 0
const number = 'E2E-PREV-LEGACY-BRIDGE'
test.describe.configure({ mode: 'serial' })
test.beforeAll(async () => {
    test.setTimeout(120000)
    if (!new URL(process.env.DIRECT_URL || '').username.includes('lzqvtvjggylcujenlelh')) throw new Error('Development fixtures only')
    const { db } = require('../../lib/db')
    ownerId = (await db.user.findUniqueOrThrow({ where: { email: 'e2e-ph@policywallet.test' }, select: { id: true } })).id
    year = Number(new Intl.DateTimeFormat('en', { timeZone: 'Europe/Athens', year: 'numeric' }).format(new Date()))
    const data = { ownerUserId: ownerId, createdByUserId: ownerId, policyNumber: number, insurerName: 'Test insurer', nickname: 'Δοκιμή παλιάς παροχής', lineOfBusiness: 'motor', status: 'active', startDate: new Date(`${year}-01-01`), endDate: new Date(`${year + 1}-12-31`), acordData: { health: { annualCheckupIncluded: true, checkup: { frequency: 'Μία φορά ανά έτος' } }, extraction: { sources: { 'acordData.health.annualCheckupIncluded': { page: 1, snippet: 'Ετήσιος προληπτικός έλεγχος', verified: true } } } } }
    const existing = await db.policy.findFirst({ where: { ownerUserId: ownerId, policyNumber: number }, select: { id: true } })
    policyId = existing ? (await db.policy.update({ where: { id: existing.id }, data })).id : (await db.policy.create({ data })).id
    await db.healthBenefitUsage.deleteMany({ where: { userId: ownerId, policyKey: policyId } })
    await db.healthBenefitUsage.create({ data: { userId: ownerId, policyKey: policyId, benefit: 'annual_checkup', year, status: 'available', intent: 'later', remindAt: new Date(`${year + 1}-01-02`) } })
})
test.afterAll(async () => {
    const { db } = require('../../lib/db')
    if (policyId) {
        await db.healthBenefitUsage.deleteMany({ where: { userId: ownerId, policyKey: policyId } })
        await db.policy.deleteMany({ where: { id: policyId, ownerUserId: ownerId, policyNumber: number } })
    }
    await db.$disconnect()
})
test('legacy reminder survives both views, completion updates its original record without a duplicate', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 })
    await page.goto('/wellness'); await dismissCookieBanner(page)
    const card = page.locator(`[id="checkup:${policyId}"]`)
    await expect(card).toContainText('Αργότερα')
    await expect(card).toContainText('Ημερομηνία υπενθύμισης')
    await page.getByRole('button', { name: 'Ανά ασφαλιστήριο', exact: true }).click()
    await expect(card).toContainText('Αργότερα')
    await card.locator('summary').filter({ hasText: 'Επιλογή βήματος' }).click()
    await card.getByRole('checkbox', { name: /Συμφωνώ να αποθηκευτεί ιδιωτικά/ }).check()
    await card.getByRole('button', { name: 'Το ολοκλήρωσα', exact: true }).click()
    await expect(page.getByText('Η επιλογή αποθηκεύτηκε', { exact: true })).toBeVisible()
    await page.reload()
    await expect(card).toContainText('Το ολοκλήρωσα')
    await expect(card).not.toContainText('Ημερομηνία υπενθύμισης:')
    const { db } = require('../../lib/db')
    const records = await db.healthBenefitUsage.findMany({ where: { userId: ownerId, policyKey: policyId } })
    expect(records).toHaveLength(1)
    expect(records[0]).toMatchObject({ status: 'completed', remindAt: null })
    expect(await db.preventionProgress.count({ where: { userId: ownerId, policyId } })).toBe(0)
})
