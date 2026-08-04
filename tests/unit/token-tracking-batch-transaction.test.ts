import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Sentry POLICYWALLET-W.
 *
 * trackTokenUsage recorded usage inside an INTERACTIVE transaction
 * (`$transaction(async (tx) => ...)`). Metering runs around the response — the
 * failing event returned HTTP 200 while this threw — so on Vercel the instance
 * can be frozen between two awaits inside that transaction and resumed much
 * later. Prisma's timer keeps running: the reported failure was 52,779ms
 * against a 15,000ms limit that had ALREADY been raised from the 5,000ms
 * default for this same P2028 error.
 *
 * The consequence is a metering gap, not a user-facing error: the outer catch
 * swallows it, so provider-billed tokens were consumed and never counted
 * against the user's budget.
 *
 * The fix is the BATCH form — one round trip, no client-side timer spanning a
 * JS await. These tests pin that, because reverting to the callback form would
 * look harmless in review.
 */

// vi.mock factories are hoisted above module scope, so the mock has to be
// created inside vi.hoisted to exist by the time the factory runs.
const prismaMock = vi.hoisted(() => ({
    user: { findUnique: vi.fn() },
    subscription: { findFirst: vi.fn() },
    monthlyTokenUsage: { findUnique: vi.fn(), upsert: vi.fn() },
    tokenUsage: { create: vi.fn() },
    tokenBalance: { upsert: vi.fn() },
    $transaction: vi.fn(),
}))

vi.mock('@/lib/db', () => ({ db: prismaMock }))
vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }))
vi.mock('@/lib/subscription-limits', () => ({ getUserSubscription: vi.fn() }))
vi.mock('@/lib/subscription-entitlements', () => ({
    resolveUserEntitlements: vi.fn(async () => ({
        tier: 'free',
        limits: { monthlyTokenBudget: 1_000_000 },
    })),
    resolveAgentEntitlements: vi.fn(async () => ({
        tier: 'agent_free',
        limits: { monthlyTokenBudget: 1_000_000 },
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
    prismaMock.monthlyTokenUsage.findUnique.mockResolvedValue({ totalTokens: BigInt(0) })
    prismaMock.$transaction.mockResolvedValue([])
    // The model builders return plain descriptors here; the batch form only
    // needs them to be collected into an array.
    prismaMock.tokenUsage.create.mockReturnValue({ op: 'tokenUsage.create' })
    prismaMock.monthlyTokenUsage.upsert.mockReturnValue({ op: 'monthlyTokenUsage.upsert' })
    prismaMock.tokenBalance.upsert.mockReturnValue({ op: 'tokenBalance.upsert' })
})

describe('trackTokenUsage — batch transaction (POLICYWALLET-W)', () => {
    it('uses the ARRAY form, never an interactive callback', async () => {
        await trackTokenUsage(BASE)

        expect(prismaMock.$transaction).toHaveBeenCalledTimes(1)
        const arg = prismaMock.$transaction.mock.calls[0][0]
        // An interactive transaction passes a function; that is the shape whose
        // client-side timer expires when the instance is frozen mid-flight.
        expect(typeof arg).not.toBe('function')
        expect(Array.isArray(arg)).toBe(true)
    })

    it('reads the monthly row OUTSIDE the transaction', async () => {
        await trackTokenUsage(BASE)

        // Read on the top-level client, not on a tx handle — and it must have
        // happened before the batch was dispatched.
        expect(prismaMock.monthlyTokenUsage.findUnique).toHaveBeenCalledTimes(1)
        const readOrder = prismaMock.monthlyTokenUsage.findUnique.mock.invocationCallOrder[0]
        const txOrder = prismaMock.$transaction.mock.invocationCallOrder[0]
        expect(readOrder).toBeLessThan(txOrder)
    })

    it('batches the usage row and the monthly rollup together', async () => {
        await trackTokenUsage(BASE)

        const ops = prismaMock.$transaction.mock.calls[0][0]
        expect(ops).toHaveLength(2)
        expect(prismaMock.tokenUsage.create).toHaveBeenCalledTimes(1)
        expect(prismaMock.monthlyTokenUsage.upsert).toHaveBeenCalledTimes(1)
        expect(prismaMock.tokenBalance.upsert).not.toHaveBeenCalled()
    })

    it('adds the balance write only when purchased tokens are consumed', async () => {
        // Budget already exhausted, so the whole 1500 comes from purchased.
        prismaMock.monthlyTokenUsage.findUnique.mockResolvedValue({
            totalTokens: BigInt(1_000_000),
        })

        await trackTokenUsage(BASE)

        const ops = prismaMock.$transaction.mock.calls[0][0]
        expect(ops).toHaveLength(3)
        expect(prismaMock.tokenBalance.upsert).toHaveBeenCalledTimes(1)
        const arg = prismaMock.tokenBalance.upsert.mock.calls[0][0] as any
        expect(arg.update.usedTokens.increment).toBe(BigInt(1500))
    })

    it('splits across subscription and purchased at the budget boundary', async () => {
        // 500 of the 1500 still fits the subscription budget.
        prismaMock.monthlyTokenUsage.findUnique.mockResolvedValue({
            totalTokens: BigInt(999_500),
        })

        await trackTokenUsage(BASE)

        const monthly = prismaMock.monthlyTokenUsage.upsert.mock.calls[0][0] as any
        expect(monthly.update.subscriptionTokens.increment).toBe(BigInt(500))
        expect(monthly.update.purchasedTokensUsed.increment).toBe(BigInt(1000))
    })

    it('treats an unlimited budget as all-subscription usage', async () => {
        // Only the AGENT path can yield a genuinely null limit: the B2C branch
        // does `monthlyTokenBudget ?? TOKEN_LIMITS[tier]`, so null there falls
        // back to the tier limit rather than meaning unlimited.
        prismaMock.user.findUnique.mockResolvedValue({ roles: 'agent' })
        const ents = await import('@/lib/subscription-entitlements')
        vi.mocked(ents.resolveAgentEntitlements).mockResolvedValue({
            tier: 'agency',
            limits: { monthlyTokenBudget: null },
        } as any)

        await trackTokenUsage(BASE)

        const monthly = prismaMock.monthlyTokenUsage.upsert.mock.calls[0][0] as any
        expect(monthly.update.subscriptionTokens.increment).toBe(BigInt(1500))
        expect(monthly.update.purchasedTokensUsed.increment).toBe(BigInt(0))
        expect(prismaMock.tokenBalance.upsert).not.toHaveBeenCalled()
    })

    it('never throws at the caller — metering must not fail the AI call', async () => {
        prismaMock.$transaction.mockRejectedValue(new Error('P2028 transaction closed'))

        await expect(trackTokenUsage(BASE)).resolves.toBeUndefined()
        // ...but unrecorded provider-billed spend still has to reach ops.
        expect(Sentry.captureException).toHaveBeenCalledTimes(1)
    })

    it('reports to Sentry when the pre-transaction read fails too', async () => {
        prismaMock.monthlyTokenUsage.findUnique.mockRejectedValue(new Error('conn reset'))

        await expect(trackTokenUsage(BASE)).resolves.toBeUndefined()
        expect(Sentry.captureException).toHaveBeenCalledTimes(1)
        expect(prismaMock.$transaction).not.toHaveBeenCalled()
    })
})
