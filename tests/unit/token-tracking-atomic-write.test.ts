import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Sentry POLICYWALLET-W and its follow-up.
 *
 * Two defects, one after the other:
 *
 * 1. Usage was recorded inside an INTERACTIVE transaction. Metering runs around
 *    the response — the failing event returned HTTP 200 while this threw — so on
 *    Vercel the instance can be frozen between two awaits inside it and resumed
 *    later while Prisma's timer keeps running (52,779ms against a 15,000ms limit
 *    that had already been raised once).
 *
 * 2. The subscription-vs-purchased split was then computed in JS from a separate
 *    read. That read never locked anything, so concurrent calls both claimed the
 *    same remaining headroom — under-charging.
 *
 * Both are now one raw statement whose ON CONFLICT DO UPDATE row lock serialises
 * callers. The SQL itself is executed against a real Postgres in
 * token-split-atomicity.test.ts; this file covers the TypeScript contract around
 * it — chiefly that neither defect can return unnoticed.
 */

const prismaMock = vi.hoisted(() => ({
    user: { findUnique: vi.fn() },
    subscription: { findFirst: vi.fn() },
    monthlyTokenUsage: { findUnique: vi.fn(), upsert: vi.fn() },
    tokenUsage: { create: vi.fn() },
    tokenBalance: { upsert: vi.fn() },
    $executeRaw: vi.fn(),
    $transaction: vi.fn(),
}))

vi.mock('@/lib/db', () => ({ db: prismaMock }))
vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }))
vi.mock('@/lib/subscription-limits', () => ({ getUserSubscription: vi.fn() }))
vi.mock('@/lib/subscription-entitlements', () => ({
    resolveUserEntitlements: vi.fn(async () => ({
        tier: 'pro',
        limits: { monthlyTokenBudget: 1_000_000 },
    })),
    resolveAgentEntitlements: vi.fn(async () => ({
        tier: 'agency',
        limits: { monthlyTokenBudget: null },
    })),
}))

import * as Sentry from '@sentry/nextjs'
import { trackTokenUsage } from '@/lib/token-tracking'

const BASE = {
    userId: 'user-1',
    operationType: 'qa_session' as const,
    inputTokens: 1000,
    outputTokens: 500,
    model: 'gemini-3.1-flash-lite' as any,
}

beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.user.findUnique.mockResolvedValue({ roles: 'policyholder' })
    prismaMock.subscription.findFirst.mockResolvedValue(null)
    prismaMock.$executeRaw.mockResolvedValue(1)
})

describe('trackTokenUsage — no interactive transaction (POLICYWALLET-W)', () => {
    it('never opens an interactive transaction', async () => {
        await trackTokenUsage(BASE)

        // The callback form is the shape whose client-side timer expires when a
        // serverless instance is frozen mid-flight.
        expect(prismaMock.$transaction).not.toHaveBeenCalled()
    })

    it('applies everything through a single statement', async () => {
        await trackTokenUsage(BASE)

        expect(prismaMock.$executeRaw).toHaveBeenCalledTimes(1)
    })

    it('does not read the monthly row separately any more', async () => {
        await trackTokenUsage(BASE)

        // A separate read is what made the split racy; the statement now derives
        // it from the locked row instead.
        expect(prismaMock.monthlyTokenUsage.findUnique).not.toHaveBeenCalled()
        expect(prismaMock.monthlyTokenUsage.upsert).not.toHaveBeenCalled()
        expect(prismaMock.tokenUsage.create).not.toHaveBeenCalled()
        expect(prismaMock.tokenBalance.upsert).not.toHaveBeenCalled()
    })
})

describe('trackTokenUsage — parameters handed to the statement', () => {
    it('passes the resolved B2C budget and tier', async () => {
        await trackTokenUsage(BASE)

        // Prisma's tagged template gives (strings, ...values).
        const values = prismaMock.$executeRaw.mock.calls[0].slice(1)
        expect(values).toContain('pro')
        expect(values).toContain(BigInt(1_000_000))
        expect(values).toContain(BigInt(1500)) // inputTokens + outputTokens
    })

    it('passes a NULL budget for an unlimited agent plan', async () => {
        prismaMock.user.findUnique.mockResolvedValue({ roles: 'agent' })

        await trackTokenUsage(BASE)

        const values = prismaMock.$executeRaw.mock.calls[0].slice(1)
        expect(values).toContain('agency')
        expect(values).toContain(null)
    })

    it('sends the month as a YYYY-MM-DD string, not a Date', async () => {
        await trackTokenUsage(BASE)

        const values = prismaMock.$executeRaw.mock.calls[0].slice(1)
        const monthArg = values.find(
            (v: unknown) => typeof v === 'string' && /^\d{4}-\d{2}-01$/.test(v)
        )
        // A Date would be resolved in the server's timezone by ::date and could
        // land on the previous month for any zone ahead of UTC.
        expect(monthArg).toBeTruthy()
        expect(values.some((v: unknown) => v instanceof Date)).toBe(false)
    })

    it('sends cost at 6dp so the per-call column keeps its precision', async () => {
        await trackTokenUsage(BASE)

        const values = prismaMock.$executeRaw.mock.calls[0].slice(1)
        const cost = values.find(
            (v: unknown) => typeof v === 'string' && /^\d+\.\d{6}$/.test(v)
        )
        // token_usage.cost_eur is Decimal(10,6); monthly rounds to 2 itself.
        expect(cost).toBeTruthy()
    })
})

describe('trackTokenUsage — metering never fails the AI call', () => {
    it('swallows a statement failure but reports it', async () => {
        prismaMock.$executeRaw.mockRejectedValue(new Error('P2028 transaction closed'))

        await expect(trackTokenUsage(BASE)).resolves.toBeUndefined()
        // Unrecorded provider-billed spend still has to reach ops.
        expect(Sentry.captureException).toHaveBeenCalledTimes(1)
    })

    it('swallows a budget-resolution failure but reports it', async () => {
        prismaMock.user.findUnique.mockRejectedValue(new Error('conn reset'))

        await expect(trackTokenUsage(BASE)).resolves.toBeUndefined()
        expect(Sentry.captureException).toHaveBeenCalledTimes(1)
        expect(prismaMock.$executeRaw).not.toHaveBeenCalled()
    })
})
