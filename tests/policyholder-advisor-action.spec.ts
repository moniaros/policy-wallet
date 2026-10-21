import { test, expect } from '@playwright/test'
import { config } from 'dotenv'
import { dismissCookieBanner } from './helpers/ui'
config({ path: '.env.local', quiet: true })

test('reviewed question survives failure, retries once, and its reminder can be postponed and completed', async ({ page }, info) => {
    test.setTimeout(120000)
    if (!new URL(process.env.DIRECT_URL || '').username.includes('lzqvtvjggylcujenlelh')) throw new Error('Development fixtures only')
    const { db } = require('../lib/db') as typeof import('../lib/db')
    const holder = await db.user.findUniqueOrThrow({ where: { email: 'e2e-ph@policywallet.test' } })
    const agent = await db.user.findUniqueOrThrow({ where: { email: 'e2e-agent@policywallet.test' } })
    const old = await db.customerRelationship.findUnique({ where: { agentUserId_policyholderUserId: { agentUserId: agent.id, policyholderUserId: holder.id } } })
    const relationship = await db.customerRelationship.upsert({ where: { agentUserId_policyholderUserId: { agentUserId: agent.id, policyholderUserId: holder.id } }, update: { status: 'active', lastInteractionAt: new Date() }, create: { agentUserId: agent.id, policyholderUserId: holder.id, status: 'active', lastInteractionAt: new Date() } })
    const subscription = await db.subscription.create({ data: { userId: holder.id, planId: 'ph-pro', status: 'active', currentPeriodStart: new Date(), currentPeriodEnd: new Date(Date.now() + 86400000), autoRenew: false } })
    const grants = await db.accessGrant.count({ where: { granterUserId: holder.id } })
    let threadId = ''; let actionId = ''
    try {
        await page.setViewportSize({ width: 390, height: 844 })
        await page.goto('/agent?tab=messages'); await dismissCookieBanner(page)
        await page.locator('summary').filter({ hasText: 'Ερώτηση προς τον σύμβουλό σας' }).click()
        await page.getByLabel('Θέμα', { exact: true }).fill('Ελεγχόμενη δοκιμή ερώτησης')
        await page.getByLabel('Η ερώτησή σας', { exact: true }).fill('Παρακαλώ διευκρινίστε τη διαδικασία χρήσης της παροχής. Δοκιμή εφαρμογής.')
        const send = page.getByRole('button', { name: 'Αποστολή ερώτησης', exact: true })
        const consent = page.getByRole('checkbox', { name: /Θέλω να στείλω το παραπάνω κείμενο/ })
        await expect(send).toBeDisabled(); await expect(consent).toHaveAccessibleName(new RegExp(agent.name!)); await consent.check()
        await page.route('**/api/v1/collaboration/threads', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }), { times: 1 })
        await send.click(); await expect(page.locator('form').getByRole('alert')).toContainText('Το κείμενό σας διατηρήθηκε')
        await expect(page.getByLabel('Η ερώτησή σας', { exact: true })).toHaveValue(/Δοκιμή εφαρμογής/)
        const requestPromise = page.waitForRequest(r => r.url().endsWith('/api/v1/collaboration/threads') && r.method() === 'POST')
        await send.click()
        const submitted = (await requestPromise).postDataJSON()
        await page.waitForURL(/\/collaboration\/threads\//)
        threadId = decodeURIComponent(new URL(page.url()).pathname.split('/').at(-1)!)
        await expect(page.getByText(submitted.initialMessage, { exact: true })).toBeVisible({ timeout: 20000 })
        for (const width of [320, 390, 430]) {
            await page.setViewportSize({ width, height: 844 })
            const controls = page.getByRole('heading', { name: submitted.subject, exact: true }).locator('..').getByRole('button')
            await expect(controls).toHaveCount(3)
            const boxes = await controls.evaluateAll(elements => elements.map(element => {
                const box = element.getBoundingClientRect()
                return { label: element.textContent, x: box.x, right: box.right, width: box.width, height: box.height, clipped: element.scrollWidth > element.clientWidth + 1 }
            }))
            expect(boxes.every(box => !box.clipped && box.x >= 0 && box.right <= width && box.height >= 44), JSON.stringify({ width, boxes })).toBe(true)
        }
        await page.setViewportSize({ width: 390, height: 844 })
        const retry = await page.request.post('/api/v1/collaboration/threads', { data: submitted })
        expect(retry.ok()).toBeTruthy(); expect((await retry.json()).data.thread.id).toBe(threadId)
        expect((await page.request.post('/api/v1/collaboration/threads', { data: { ...submitted, initialMessage: 'Changed content' } })).status()).toBe(409)
        const stored = await db.collaborationThread.findUniqueOrThrow({ where: { id: threadId }, include: { messages: true } })
        expect(stored.policyId).toBeNull(); expect(stored.messages).toHaveLength(1)
        expect(await db.accessGrant.count({ where: { granterUserId: holder.id } })).toBe(grants)
        const action = await db.collaborationAction.create({ data: { threadId, assigneeUserId: holder.id, title: 'Ελεγχόμενη εκκρεμότητα', dueDate: new Date(Date.now() - 86400000) } }); actionId = action.id
        await db.notificationEvent.createMany({ data: [1, 2].map(n => ({ userId: holder.id, eventType: 'collaboration_action_overdue', channel: 'in_app', status: 'sent', title: 'Ελεγχόμενη εκκρεμότητα', message: 'Δοκιμή υπενθύμισης', relatedObjectType: 'customer', relatedObjectId: action.id, createdAt: new Date(Date.now() + n) })) })
        await page.goto('/notifications')
        await expect(page.getByText('Ελεγχόμενη εκκρεμότητα', { exact: true })).toHaveCount(1)
        await page.locator(`a[href$="#action-${action.id}"]`).click()
        const row = page.locator(`[id="action-${action.id}"]`)
        await expect(row).toBeVisible()
        await row.getByRole('button', { name: 'Υπενθύμιση σε μία εβδομάδα' }).click()
        await expect.poll(async () => (await db.collaborationAction.findUniqueOrThrow({ where: { id: action.id } })).dueDate!.getTime()).toBeGreaterThan(Date.now())
        await page.goto('/notifications'); await expect(page.getByText('Ελεγχόμενη εκκρεμότητα', { exact: true })).toHaveCount(0)
        await page.getByRole('button', { name: /Ιστορικό αποστολών/ }).click()
        await expect(page.getByText('Ελεγχόμενη εκκρεμότητα', { exact: true })).toHaveCount(2)
        await page.goto(`/collaboration/threads/${encodeURIComponent(threadId)}#action-${action.id}`)
        await row.getByRole('combobox').selectOption('done')
        await expect.poll(async () => (await db.collaborationAction.findUniqueOrThrow({ where: { id: action.id } })).status).toBe('done')
        await page.screenshot({ path: info.outputPath('completed-action-mobile.png') })
    } finally {
        if (actionId) await db.notificationEvent.deleteMany({ where: { relatedObjectId: actionId, userId: holder.id } })
        if (threadId) {
            await db.notificationEvent.deleteMany({ where: { relatedObjectId: threadId, userId: agent.id } })
            await db.collaborationThread.deleteMany({ where: { id: threadId, createdByUserId: holder.id } })
        }
        await db.subscription.delete({ where: { id: subscription.id } })
        if (old) await db.customerRelationship.update({ where: { id: old.id }, data: { status: old.status, lastInteractionAt: old.lastInteractionAt } })
        else await db.customerRelationship.delete({ where: { id: relationship.id } })
        await db.$disconnect()
    }
})
