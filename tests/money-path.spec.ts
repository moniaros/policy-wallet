/**
 * Money-path E2E: checkout return states, feature-gate rendering for the
 * free tier, and the upgrade-trigger surfaces shipped in the conversion
 * overhaul (PRs #59–#63).
 *
 * Runs as the provisioned FREE-tier policyholder (storageState from the
 * `setup` project). No Stripe calls are made: the success page's bogus-
 * session path and the gate/trigger UI are all exercisable offline, which
 * is exactly the revenue-integrity contract under test — a made-up
 * session_id must never activate a plan.
 */
import { test, expect, type Page } from '@playwright/test'
import { dismissCookieBanner } from './helpers/ui'
import { E2E_POLICYHOLDER } from './e2e-users'

const FIXTURE_POLICY = 'E2E-MOT-001'
const EXTRA_POLICY = 'E2E-MOT-002'

async function prismaClient() {
    const { PrismaClient } = await import('@prisma/client')
    return new PrismaClient()
}

async function fixturePolicyId(): Promise<string> {
    const db = await prismaClient()
    try {
        const owner = await db.user.findUnique({
            where: { email: E2E_POLICYHOLDER.email },
            select: { id: true },
        })
        if (!owner) throw new Error('E2E policyholder missing — global setup did not run?')
        const policy = await db.policy.findFirst({
            where: { ownerUserId: owner.id, policyNumber: FIXTURE_POLICY },
            select: { id: true },
        })
        if (!policy) throw new Error('E2E fixture policy missing — global setup did not run?')
        return policy.id
    } finally {
        await db.$disconnect()
    }
}

/**
 * UpgradeModal has no dialog role. Post Paid-Aha-Loop it is a dual-CTA modal:
 * the Plus primary CTA + the monthly billing toggle are the stable handles.
 */
async function expectUpgradeModalOpen(page: Page) {
    await expect(
        page.getByRole('button', { name: /Συνέχεια με Plus|Continue with Plus/i })
    ).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('radio', { name: /Μηνιαία|Monthly/i })).toBeVisible()
}

async function closeUpgradeModal(page: Page) {
    await page.getByRole('button', { name: /Όχι τώρα|Not now/i }).first().click()
}

test.describe('Checkout return (revenue integrity)', () => {
    test('a bogus checkout session never activates a plan', async ({ page }) => {
        await page.goto('/upgrade/success?session_id=cs_test_e2e_bogus_session')
        await dismissCookieBanner(page)

        // Pending state, not the activated one.
        await expect(
            page.getByRole('heading', { name: /επεξεργάζεται|processing/i })
        ).toBeVisible({ timeout: 20000 })
        await expect(
            page.getByRole('heading', { name: /ολοκληρώθηκε|complete/i })
        ).not.toBeVisible()

        // Server agrees: the user is still free tier.
        const usage = await page.request.get('/api/v1/tokens/usage')
        expect(usage.ok()).toBeTruthy()
        const body = await usage.json()
        expect(body?.data?.tier).toBe('free')
    })

    test('success page without a session id shows the pending state with a way back', async ({ page }) => {
        await page.goto('/upgrade/success')
        await dismissCookieBanner(page)

        await expect(
            page.getByRole('heading', { name: /επεξεργάζεται|processing/i })
        ).toBeVisible({ timeout: 20000 })
        await expect(
            page.getByRole('link', { name: /πορτοφόλι|wallet|Συνέχεια|Continue/i }).first()
        ).toBeVisible()
    })

    test('upgrade page shows the paid plans to a free user', async ({ page }) => {
        await page.goto('/upgrade')
        await dismissCookieBanner(page)

        await expect(page.getByText(/Plus/).first()).toBeVisible({ timeout: 20000 })
        await expect(page.getByText(/Starter/).first()).toBeVisible()
        await expect(page.getByText(/€7\.99|€2\.99/).first()).toBeVisible()
    })
})

test.describe('Feature gates on the policy page (free tier)', () => {
    // The Q&A tests read and spend the same lifetime free-question counter —
    // running them in parallel would have them see each other's rows.
    test.describe.configure({ mode: 'serial' })

    let policyId: string

    test.beforeAll(async () => {
        policyId = await fixturePolicyId()
    })

    test('savings-report export is locked behind Pro and opens the upgrade modal', async ({ page }) => {
        await page.goto(`/wallet/${policyId}`)
        await dismissCookieBanner(page)

        // Specific to the savings-report CTA — the post-parse locked-cards grid
        // also renders "Ξεκλείδωμα πλήρους ανάλυσης", so a bare /Ξεκλείδωμα/ is ambiguous.
        const unlockCta = page.getByRole('button', { name: /Ξεκλείδωμα εξαγωγής|Unlock report/i })
        await expect(unlockCta).toBeVisible({ timeout: 20000 })
        // The direct export link is Pro-only and must be absent for free users.
        await expect(page.locator(`a[href*="/savings-report"]`)).toHaveCount(0)

        await unlockCta.click()
        await expectUpgradeModalOpen(page)
        await closeUpgradeModal(page)
    })

    test('locked PDF preview routes to the upgrade modal instead of the preview', async ({ page }) => {
        await page.goto(`/wallet/${policyId}`)
        await dismissCookieBanner(page)

        const documents = page.locator('#documents')
        await expect(documents.getByText(/e2e-contract\.pdf/)).toBeVisible({ timeout: 20000 })

        // The locked preview button carries the upgrade hint as its label.
        const lockedPreview = documents.getByRole('button', { name: /Plus/i }).first()
        await expect(lockedPreview).toBeVisible()
        await lockedPreview.click()

        await expectUpgradeModalOpen(page)
        await closeUpgradeModal(page)
    })

    test('AI Q&A gives free users their complimentary questions with a live meter', async ({ page }) => {
        await page.goto(`/wallet/${policyId}`)
        await dismissCookieBanner(page)

        const qaSection = page.locator('#policy-qa')
        await qaSection.scrollIntoViewIfNeeded()
        // The section header's only initial button toggles the chat open.
        await qaSection.getByRole('button').first().click()

        // The free floor: the input is live and the meter states what is left.
        await expect(qaSection.getByRole('textbox')).toBeEnabled({ timeout: 15000 })
        await expect(
            qaSection.getByText(/δωρεάν ερωτήσεις|free questions/i).first()
        ).toBeVisible()
        // No pre-empt card while questions remain.
        await expect(
            qaSection.getByText(/απεριόριστες ερωτήσεις|unlimited questions/i)
        ).toHaveCount(0)
    })

    test('AI Q&A pre-empts with an upgrade nudge once the free questions are used up', async ({ page }) => {
        const db = await prismaClient()
        try {
            const owner = await db.user.findUniqueOrThrow({
                where: { email: E2E_POLICYHOLDER.email },
                select: { id: true },
            })
            // Spend the lifetime free questions the way askPolicyQuestion counts them.
            await db.activityLog.createMany({
                data: Array.from({ length: 3 }, () => ({
                    adminUserId: owner.id,
                    adminEmail: E2E_POLICYHOLDER.email,
                    actionType: 'POLICY_QUESTION_ASKED',
                    description: `money-path fixture question for policy ${policyId}`,
                })),
            })

            await page.goto(`/wallet/${policyId}`)
            await dismissCookieBanner(page)

            const qaSection = page.locator('#policy-qa')
            await qaSection.scrollIntoViewIfNeeded()
            await qaSection.getByRole('button').first().click()

            // Inline trigger variant renders body + CTA (no headline); input is gone.
            await expect(
                qaSection.getByText(/απεριόριστες ερωτήσεις|unlimited questions/i).first()
            ).toBeVisible({ timeout: 15000 })
            await expect(qaSection.getByRole('textbox')).toHaveCount(0)
        } finally {
            await db.activityLog.deleteMany({
                where: {
                    actionType: 'POLICY_QUESTION_ASKED',
                    adminEmail: E2E_POLICYHOLDER.email,
                },
            })
            await db.$disconnect()
        }
    })

    test('the modal\'s annual toggle is what checkout actually charges', async ({ page }) => {
        let checkoutBody: any = null
        // Stop at the boundary: capture the payload, never call Stripe.
        await page.route('**/api/v1/billing/checkout', async (route) => {
            checkoutBody = route.request().postDataJSON()
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ data: { checkout_url: '/upgrade/success' } }),
            })
        })

        await page.goto(`/wallet/${policyId}`)
        await dismissCookieBanner(page)

        const unlockCta = page.getByRole('button', { name: /Ξεκλείδωμα|Unlock report/i })
        await expect(unlockCta).toBeVisible({ timeout: 20000 })
        await unlockCta.click()
        await expectUpgradeModalOpen(page)

        await page.getByRole('radio', { name: /Ετήσια|Annual|Yearly/i }).click()
        await page.getByRole('button', { name: /Συνέχεια στην πληρωμή|Continue to payment/i }).click()

        await expect.poll(() => checkoutBody?.billingPeriod, { timeout: 15000 }).toBe('annual')
        // The gate that triggered the upgrade rides along for the success page.
        expect(checkoutBody.featureKey).toBeTruthy()
    })
})

test.describe('Paid Aha Loop — locked cards + dual-CTA modal (free tier)', () => {
    let policyId: string

    test.beforeAll(async () => {
        policyId = await fixturePolicyId()
    })

    test('policy detail shows the locked premium insight cards to a free user', async ({ page }) => {
        await page.goto(`/wallet/${policyId}`)
        await dismissCookieBanner(page)

        const grid = page.locator('#premium-insights')
        await expect(grid).toBeVisible({ timeout: 20000 })
        await expect(grid.getByText(/Διαθέσιμα με το Plus|Available with Plus/i)).toBeVisible()
        // A couple of the six required locked-card titles.
        await expect(grid.getByText(/Πλήρης AI ανάλυση|Full AI analysis/i)).toBeVisible()
        await expect(grid.getByText(/Ερωτήσεις στο AI|Ask the AI/i)).toBeVisible()
    })

    test('clicking a locked card opens the dual-CTA modal (Plus recommended, Starter cheaper)', async ({ page }) => {
        await page.goto(`/wallet/${policyId}`)
        await dismissCookieBanner(page)

        const grid = page.locator('#premium-insights')
        await expect(grid).toBeVisible({ timeout: 20000 })
        await grid.getByRole('button', { name: /Πλήρης AI ανάλυση|Full AI analysis/i }).click()

        // Primary Plus €7.99 + secondary Starter €2.99 + tertiary "Όχι τώρα".
        await expectUpgradeModalOpen(page)
        await expect(page.getByRole('button', { name: /Ξεκίνα με Starter|Start with Starter/i })).toBeVisible()
        await expect(page.getByRole('button', { name: /Όχι τώρα|Not now/i })).toBeVisible()
        await expect(page.getByText(/€7\.99/).first()).toBeVisible()
        await expect(page.getByText(/€2\.99/).first()).toBeVisible()
        // Plus is the recommended tier.
        await expect(page.getByText(/Προτείνεται|Recommended/i).first()).toBeVisible()

        await closeUpgradeModal(page)
    })
})

test.describe('Home upgrade triggers with a two-policy portfolio', () => {
    test.describe.configure({ mode: 'serial' })

    test.beforeAll(async () => {
        const db = await prismaClient()
        try {
            const owner = await db.user.findUnique({
                where: { email: E2E_POLICYHOLDER.email },
                select: { id: true },
            })
            if (!owner) throw new Error('E2E policyholder missing')
            const existing = await db.policy.findFirst({
                where: { ownerUserId: owner.id, policyNumber: EXTRA_POLICY },
                select: { id: true },
            })
            if (!existing) {
                const now = Date.now()
                await db.policy.create({
                    data: {
                        ownerUserId: owner.id,
                        createdByUserId: owner.id,
                        policyNumber: EXTRA_POLICY,
                        insurerName: 'E2E Second Insurance',
                        lineOfBusiness: 'home',
                        status: 'active',
                        // Expires in ~90 days → inside the 180-day renewal window.
                        startDate: new Date(now - 275 * 24 * 60 * 60 * 1000),
                        endDate: new Date(now + 90 * 24 * 60 * 60 * 1000),
                        premiumAmount: 180,
                        premiumCurrency: 'EUR',
                    },
                })
            }
        } finally {
            await db.$disconnect()
        }
    })

    test.afterAll(async () => {
        const db = await prismaClient()
        try {
            await db.policy.deleteMany({ where: { policyNumber: EXTRA_POLICY } })
        } finally {
            await db.$disconnect()
        }
    })

    test('free user with 2 policies sees the usage meter and multi-insurer trigger', async ({ page }) => {
        await page.goto('/home')
        await dismissCookieBanner(page)

        // Usage banner: the stored policies against the free plan's 1-policy cap.
        // This asserted the literal '2 / 1'. The policyholder fixture is shared and
        // mutable — global-setup provisions one policy, seed-agent-demo adds
        // another, and earlier specs can add more — so the real value was '3 / 1'
        // and the test failed for a reason that had nothing to do with the meter.
        // Worse, the retry reported it as "flaky", which is how a genuine pricing
        // contradiction elsewhere in this file stayed hidden. Assert the BEHAVIOUR:
        // some number of policies against a cap of 1, i.e. the over-limit state.
        await expect(page.getByText(/δωρεάν πλάνο|free plan/i).first()).toBeVisible({ timeout: 20000 })
        await expect(page.getByText(/\d+ \/ 1/).first()).toBeVisible()

        // Multi-insurer insights trigger (two distinct insurers on the book).
        await expect(
            page.getByText(/πλήρη εικόνα χαρτοφυλακίου|full portfolio picture/i).first()
        ).toBeVisible()
    })
})

test.describe('Mobile trigger surfaces', () => {
    test.use({ viewport: { width: 390, height: 844 } })

    test('mobile wallet upgrade trigger opens the upgrade modal', async ({ page }) => {
        await page.goto('/wallet')
        await dismissCookieBanner(page)

        // useIsMobile flips after mount — wait for the mobile trigger card.
        const upgradeCta = page
            .getByRole('button', { name: /Ξεκλείδωμα πλήρους|Unlock full/i })
            .first()
        await expect(upgradeCta).toBeVisible({ timeout: 20000 })
        await upgradeCta.click()

        await expectUpgradeModalOpen(page)
    })
})

test.describe('Billing management (cancel honesty)', () => {
    // A grandfathered (non-Stripe) paid subscription: the in-app cancel must
    // flip autoRenew locally. The Stripe-side cancel path is unit-tested
    // (tests/unit/billing-integrity.test.ts) — no Stripe in E2E by design.
    test.describe.configure({ mode: 'serial' })

    async function ownerId(db: Awaited<ReturnType<typeof prismaClient>>) {
        const owner = await db.user.findUnique({
            where: { email: E2E_POLICYHOLDER.email },
            select: { id: true },
        })
        if (!owner) throw new Error('E2E policyholder missing — global setup did not run?')
        return owner.id
    }

    test.beforeAll(async () => {
        const db = await prismaClient()
        try {
            const userId = await ownerId(db)
            await db.subscription.deleteMany({ where: { userId, planId: 'ph-plus' } })
            await db.subscription.create({
                data: {
                    userId,
                    planId: 'ph-plus',
                    status: 'active',
                    autoRenew: true,
                    currentPeriodStart: new Date(),
                    currentPeriodEnd: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
                },
            })
        } finally {
            await db.$disconnect()
        }
    })

    test.afterAll(async () => {
        const db = await prismaClient()
        try {
            const userId = await ownerId(db)
            await db.subscription.deleteMany({ where: { userId, planId: 'ph-plus' } })
        } finally {
            await db.$disconnect()
        }
    })

    test('cancel from the Billing tab stops auto-renewal in the DB', async ({ page }) => {
        await page.goto('/account')
        await dismissCookieBanner(page)

        await page.getByRole('tab', { name: /Χρέωση|Billing/i }).first().click()
        // The trigger now opens a branded confirmation that discloses the
        // consequences (access until period end, no partial refund) instead of
        // cancelling instantly — click through it.
        await page
            .getByRole('button', { name: /Ακύρωση ανανέωσης|Cancel renewal/i })
            .first()
            .click()
        await page
            .getByRole('dialog')
            .getByRole('button', { name: /Ακύρωση ανανέωσης|Cancel renewal/i })
            .click()

        // The observable contract is the DB flip, not UI copy.
        await expect
            .poll(
                async () => {
                    const db = await prismaClient()
                    try {
                        const userId = await ownerId(db)
                        const sub = await db.subscription.findFirst({
                            where: { userId, planId: 'ph-plus', status: 'active' },
                            select: { autoRenew: true },
                        })
                        return sub?.autoRenew
                    } finally {
                        await db.$disconnect()
                    }
                },
                { timeout: 15000 }
            )
            .toBe(false)
    })
})
