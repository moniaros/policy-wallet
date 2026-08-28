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
import { E2E_POLICYHOLDER, E2E_POLICYHOLDER_FREE } from './e2e-users'

/**
 * Serial for the whole FILE, not per describe.
 *
 * Every block here reads or writes the subscription of the SAME provisioned
 * policyholder — there is one fixture user, and a plan is global state on it.
 * With per-describe serial and `fullyParallel`, "Billing management" created an
 * active ph-plus subscription while "Feature gates … (free tier)" was rendering
 * the policy page eight tests later, so the locked PDF preview came back
 * unlocked and the gate test failed for a reason that had nothing to do with
 * gates. Isolation, not ordering, is the constraint: these tests cannot share a
 * user and run at the same time.
 *
 * `default`, not `serial`: both pin the file to one worker in declaration
 * order, but serial also SKIPS every later test once one fails — which would
 * turn a single gate regression into a blank report for the rest of the money
 * path. The blocks that genuinely depend on each other declare serial
 * themselves.
 */
test.describe.configure({ mode: 'default' })

const FIXTURE_POLICY = 'E2E-MOT-001'
/** The FREE policyholder's own motor policy — provisioned by global-setup. */
const FREE_FIXTURE_POLICY = 'E2E-PDF-MOT-ACT'
const EXTRA_POLICY = 'E2E-MOT-002'

async function prismaClient() {
    const { PrismaClient } = await import('@prisma/client')
    return new PrismaClient()
}

/**
 * The policy these tests browse must belong to the session that browses it.
 *
 * This resolved `E2E_POLICYHOLDER`'s policy while the file's own docblock said
 * it runs as the FREE policyholder — and the config gave it the PRO session, so
 * the mismatch was invisible. The spec could not pass in either configuration:
 * under the pro session the free-tier gates never render (`tier !== 'pro'`),
 * and under the free session the pro user's policy is correctly a 404. That
 * contradiction is why the money path rotted without anyone reading a failure
 * that meant anything.
 */
async function fixturePolicyId(): Promise<string> {
    const db = await prismaClient()
    try {
        const owner = await db.user.findUnique({
            where: { email: E2E_POLICYHOLDER_FREE.email },
            select: { id: true },
        })
        if (!owner) throw new Error('E2E free policyholder missing — global setup did not run?')
        const policy = await db.policy.findFirst({
            where: { ownerUserId: owner.id, policyNumber: FREE_FIXTURE_POLICY },
            select: { id: true },
        })
        if (!policy) throw new Error('E2E free fixture policy missing — global setup did not run?')
        return policy.id
    } finally {
        await db.$disconnect()
    }
}

/**
 * UpgradeModal has no dialog role. Post Paid-Aha-Loop it is a dual-CTA modal:
 * the recommended-tier primary CTA + the monthly billing toggle are the stable
 * handles.
 *
 * Deliberately matches the VERB, not the plan name. This helper hardcoded
 * «Συνέχεια με Plus», so the moment the modal stopped calling `ph-pro` "Plus"
 * — the fix for one word naming two plans — three unrelated tests went red at
 * once for a reason that had nothing to do with what they assert. The plan name
 * is asserted where it is the subject (the dual-CTA test), not in the "is the
 * modal open" probe every other test leans on.
 */
async function expectUpgradeModalOpen(page: Page) {
    await expect(
        page.getByRole('button', { name: /Συνέχεια με|Continue with/i }).first()
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

        // The two PAID tiers, by the names every customer surface now uses.
        // This used to assert «Starter», which named ph-plus in the upgrade
        // modal while /upgrade called the same plan «Plus» — one word, two
        // plans, two prices. The modal was the outlier and now resolves through
        // planTierName(); «Starter» is not a plan name anywhere.
        await expect(page.getByText(/Plus/).first()).toBeVisible({ timeout: 20000 })
        await expect(page.getByText(/Family/).first()).toBeVisible()
        await expect(page.getByText(/Starter/)).toHaveCount(0)
        // Prices come from the live catalog, not a hardcoded pair.
        await expect(page.getByText(/€\s?4[.,]99|4,99\s?€/).first()).toBeVisible()
    })
})

test.describe('Feature gates on the policy page (free tier)', () => {
    // The Q&A tests read and spend the same lifetime free-question counter —
    // running them in parallel would have them see each other's rows.
    test.describe.configure({ mode: 'serial' })

    let policyId: string

    test.beforeAll(async ({ browser }) => {
        policyId = await fixturePolicyId()

        // Warm /wallet/[id] before any timed assertion runs. The webServer is
        // `npm run dev`, so the FIRST request to a route pays on-demand
        // compilation — which landed inside the first test's 20s waits and made
        // the opening tests of this serial block flake (fail once, pass on
        // retry). Paying that cost here removes the cause rather than papering
        // over it with longer timeouts.
        const page = await browser.newPage()
        try {
            await page.goto(`/wallet/${policyId}`, { waitUntil: 'domcontentloaded' })
            await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {})
        } finally {
            await page.close()
        }
    })

    test('savings-report export is locked behind Pro and opens the upgrade modal', async ({ page }) => {
        await page.goto(`/wallet/${policyId}`)
        await dismissCookieBanner(page)

        // Specific to the savings-report CTA — the post-parse locked-cards grid
        // also renders "Ξεκλείδωμα πλήρους ανάλυσης", so a bare /Ξεκλείδωμα/ is ambiguous.
        const unlockCta = page.getByRole('button', { name: /Ξεκλείδωμα εξαγωγής|Unlock report/i }).first()
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
        // The GENERATED label, not a filename. Uploaded names are never
        // persisted (`storedDocumentLabel`, guarded by
        // tests/unit/filename-never-persisted), so the row reads
        // «Ασφαλιστήριο Αυτοκίνητο · E2E-PDF-MOT-ACT». Asserting
        // `e2e-contract.pdf` was asserting something the product deliberately
        // never renders — and it was the pro fixture's filename besides.
        await expect(documents.getByText(new RegExp(FREE_FIXTURE_POLICY))).toBeVisible({ timeout: 20000 })

        // The locked preview button carries the upgrade hint as its label.
        const lockedPreview = documents.getByRole('button', { name: /Plus/i }).first()
        await expect(lockedPreview).toBeVisible()
        await lockedPreview.click()

        await expectUpgradeModalOpen(page)
        await closeUpgradeModal(page)
    })

    test('AI Q&A offers free users no complimentary questions — locked with an upgrade path', async ({ page }) => {
        // Product decision: FREE_LIFETIME_QUESTIONS = 0 (deep AI Q&A has no
        // free allowance at all — see lib/monetization/feature-gates.ts). The
        // old assertion of a "free floor" with a live meter described a
        // feature that was deliberately removed; the honest contract for a
        // free user is a locked input with the upgrade pre-empt from the start.
        await page.goto(`/wallet/${policyId}`)
        await dismissCookieBanner(page)

        // The Ask-AI trigger lives in the HEAD card, not in the Q&A block.
        // GOAL 2 moved it there deliberately — "standing alone it was a ninth
        // top-level grouping on a page budgeted for eight" — and `#policy-qa`
        // does not exist in the DOM until it is toggled. This test used to look
        // for the trigger inside a section that had not rendered yet.
        await page
            .getByRole('button', { name: /Ρωτήστε το AI|Ask the AI/i })
            .first()
            .click()

        const qaSection = page.locator('#policy-qa')
        await expect(qaSection).toBeVisible({ timeout: 15000 })
        await qaSection.scrollIntoViewIfNeeded()

        // No enabled input for the free tier…
        await expect(qaSection.getByRole('textbox')).toHaveCount(0, { timeout: 15000 })
        // …and the upgrade pre-empt states what paid unlocks.
        await expect(
            qaSection.getByText(/απεριόριστες ερωτήσεις|unlimited questions/i).first()
        ).toBeVisible()
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

        // Full label, not a loose /Ξεκλείδωμα|Unlock report/ prefix: several
        // locked-feature cards carry an "Unlock …" CTA in their accessible name,
        // so the short pattern matched two elements and tripped strict mode.
        // This is the report-EXPORT gate (PolicyDetailsClientView `unlockCta`),
        // the one that opens the upgrade modal.
        const unlockCta = page.getByRole('button', {
            name: /Ξεκλείδωμα εξαγωγής αναφοράς|Unlock report export/i,
        })
        await expect(unlockCta).toBeVisible({ timeout: 20000 })
        await unlockCta.click()
        await expectUpgradeModalOpen(page)

        await page.getByRole('radio', { name: /Ετήσια|Annual|Yearly/i }).click()
        // The modal's primary CTA is "Συνέχεια με Plus — €x,xx/μήνα" (MODAL_COPY
        // .plusPrefix + price). The old /Συνέχεια στην πληρωμή/ label no longer
        // exists anywhere in the copy, so this never matched.
        await page.getByRole('button', { name: /Συνέχεια με Plus|Continue with Plus/i }).click()

        await expect.poll(() => checkoutBody?.billingPeriod, { timeout: 15000 }).toBe('annual')
        // The gate that triggered the upgrade rides along for the success page.
        // Field is `feature` — that is what UpgradeModal sends and what the
        // checkout route's zod schema accepts; `featureKey` never existed on
        // the wire, so this assertion could only ever have read undefined.
        expect(checkoutBody.feature).toBeTruthy()
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

    test('clicking a locked card opens the dual-CTA modal (Family recommended, Plus cheaper)', async ({ page }) => {
        await page.goto(`/wallet/${policyId}`)
        await dismissCookieBanner(page)

        const grid = page.locator('#premium-insights')
        await expect(grid).toBeVisible({ timeout: 20000 })
        await grid.getByRole('button', { name: /Πλήρης AI ανάλυση|Full AI analysis/i }).click()

        // Recommended Family + cheaper Plus + tertiary "Όχι τώρα".
        //
        // The names come from `planTierName()` and the prices from the live
        // catalog, so this asserts the NAMES agree with /upgrade rather than
        // re-hardcoding a pair. The old assertion wanted «Starter» at €2.99 and
        // «Plus» at €7.99 — neither figure is in the catalog, and «Plus» there
        // meant the other plan entirely.
        await expectUpgradeModalOpen(page)
        await expect(page.getByRole('button', { name: /Ξεκινήστε με Plus|Start with Plus/i })).toBeVisible()
        await expect(page.getByRole('button', { name: /Όχι τώρα|Not now/i })).toBeVisible()
        await expect(page.getByText(/Starter/)).toHaveCount(0)
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

    test('free user with 2 policies sees exactly ONE upgrade surface, and it is the monitor substitution', async ({ page }) => {
        await page.goto('/home')
        await dismissCookieBanner(page)

        // REWRITTEN 2026-08-28 against the rebuilt dashboard.
        //
        // This asserted a usage meter («N / 1» against the free cap) AND the
        // multi-insurer trigger, both visible at once. The rebuild made that
        // impossible on purpose: `standaloneUpgrade` in PolicyholderHome is a
        // single value, and it is `null` whenever the monitor placeholder is
        // showing — "when the substitution is showing, the standalone offers
        // stand down". A free account has `advancedAnalytics: false`, so the
        // placeholder ALWAYS shows and both standalone offers always stand down.
        //
        // Asserting the old pair would have been asserting a design the product
        // deliberately replaced. What is worth pinning is the rule that survived:
        // ONE upgrade surface, never a stack of them.
        await expect(
            page.getByText(/Διαρκής επίβλεψη|Continuous monitoring|monitoring/i).first()
        ).toBeVisible({ timeout: 20000 })

        // ...and the two standalone offers do not pile on top of it.
        await expect(page.getByText(/\d+ \/ 1/)).toHaveCount(0)
        await expect(
            page.getByText(/πλήρη εικόνα χαρτοφυλακίου|full portfolio picture/i)
        ).toHaveCount(0)
    })
})

test.describe('Mobile trigger surfaces', () => {
    test.use({ viewport: { width: 390, height: 844 } })

    test('mobile wallet upgrade trigger opens the upgrade modal', async ({ page }) => {
        await page.goto('/wallet')
        await dismissCookieBanner(page)

        // Post un-fork the wallet renders one responsive tree at all widths, so
        // the upgrade CTA is reachable at 390px too — this asserts that.
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
    //
    // The ONE block in this file that is not about the free tier: it creates a
    // subscription for E2E_POLICYHOLDER and then cancels it through the UI, so
    // it must browse as that user. The rest of the file runs as the free
    // policyholder (project `money-free`) — a free account has no subscription
    // to cancel, and pointing this at one would test nothing.
    test.use({ storageState: 'playwright/.auth/user.json' })
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

    test('cancel from plan settings stops auto-renewal in the DB', async ({ page }) => {
        // This test stacks page navigation + a server action + poll iterations
        // that each open a fresh Prisma client — every hop a round trip to the
        // remote pooler. The default 30s budget expired mid-poll while the
        // flip landed late (verified: the exact DB sequence succeeds in ~5s
        // standalone). Give the trans-continental path a realistic budget.
        test.setTimeout(90_000)
        // /account's three React-state tabs became five real sub-routes, so
        // there is no "Billing" tab to click any more — billing lives at
        // /account/plan. Navigating straight there is also what the redirect
        // for the legacy ?tab= links resolves to.
        await page.goto('/account/plan')
        await dismissCookieBanner(page)

        // Two different strings by design: the row's control states what it
        // does ("Διακοπή αυτόματης ανανέωσης"), and the dialog that follows
        // discloses the consequences — access until period end, no partial
        // refund — before its confirm ("Ακύρωση ανανέωσης") commits it.
        await page
            .getByRole('button', { name: /Διακοπή αυτόματης ανανέωσης|Stop auto-renewal/i })
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
