/**
 * Checkout return URLs must land on the canonical public site, and the Stripe
 * product must show the human plan name — not the raw machine name.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const userFindUnique = vi.fn()
const planFindUnique = vi.fn()
const sessionsCreate = vi.fn()

vi.mock('@/lib/db', () => ({
    db: {
        user: { findUnique: (...a: unknown[]) => userFindUnique(...a) },
        plan: { findUnique: (...a: unknown[]) => planFindUnique(...a) },
    },
}))
vi.mock('@/lib/stripe', () => ({
    stripe: { checkout: { sessions: { create: (...a: unknown[]) => sessionsCreate(...a) } } },
}))
vi.mock('@/lib/journey/conversion-events', () => ({ recordConversionEvent: vi.fn() }))
vi.mock('@/lib/logger', () => ({ logger: vi.fn() }))
// The bug: checkout used NEXTAUTH_URL (the raw Vercel domain). The fix routes
// return URLs through getSiteOrigin() — the canonical public origin.
vi.mock('@/lib/seo/site', () => ({ getSiteOrigin: () => 'https://policywallet.gr' }))

import { createCheckoutSession } from '@/lib/billing'

beforeEach(() => {
    // These cases exercise checkout itself, so they state a deployment that can
    // take money. Without it `publicCheckoutAvailability()` reads an absent
    // STRIPE_SECRET_KEY as `unconfigured` and createCheckoutSession refuses —
    // correctly (lib/pricing/stripe-mode.ts), but for a reason unrelated to
    // what these assert.
    process.env.STRIPE_SECRET_KEY = "sk_test_fixture"

    vi.clearAllMocks()
    userFindUnique.mockResolvedValue({ email: 'agent@example.com' })
    planFindUnique.mockResolvedValue({
        id: 'agent-starter',
        name: 'agent_starter',          // machine name — must NOT reach Stripe
        displayName: 'Agent Starter',   // human name — must be shown
        price: 19.99,
    })
    sessionsCreate.mockResolvedValue({ id: 'cs_test_1', url: 'https://checkout.stripe.com/x' })
})

describe('createCheckoutSession return URLs', () => {
    it('builds success/cancel URLs on the canonical site, never the Vercel domain', async () => {
        await createCheckoutSession('user-1', 'agent-starter', 'monthly', '/dashboard/agent')
        const args = sessionsCreate.mock.calls[0][0]

        expect(args.success_url).toMatch(/^https:\/\/policywallet\.gr\/upgrade\/success/)
        expect(args.cancel_url.startsWith('https://policywallet.gr')).toBe(true)
        expect(args.success_url).not.toContain('vercel.app')
        expect(args.cancel_url).not.toContain('vercel.app')
        // returnTo context preserved on success, and cancel lands on it directly
        expect(args.success_url).toContain('return=%2Fdashboard%2Fagent')
        expect(args.cancel_url).toBe('https://policywallet.gr/dashboard/agent')
    })

    it('shows the human plan name on the Stripe product, not the machine name', async () => {
        await createCheckoutSession('user-1', 'agent-starter', 'monthly')
        const args = sessionsCreate.mock.calls[0][0]
        const product = args.line_items[0].price_data.product_data

        expect(product.name).toBe('Agent Starter')
        expect(product.name).not.toContain('agent_starter')
    })
})
