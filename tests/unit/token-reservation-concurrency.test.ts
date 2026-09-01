/**
 * Token reservation has to be safe when two AI steps run at once.
 *
 * Clarity and gap detection now execute CONCURRENTLY (they depend only on the
 * extraction result, not on each other), so two `reserveTokens` calls for the
 * same user can be in flight together. The subscription pool was already safe:
 * its claim is a single conditional UPDATE on monthly_token_usage, and
 * concurrent claimants serialise on the row lock.
 *
 * The purchased pool was NOT. It read the balance and returned `allowed`
 * without recording anything, so the check and the spend were separated by a
 * whole model call: two concurrent steps both saw the same balance and were
 * both admitted, overdrawing the pool by up to one estimate per extra
 * claimant. It now claims against token_balances.reserved_tokens with the same
 * conditional-UPDATE shape, and releases where it claimed.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

/** Scripted affected-row counts for the token_balances UPDATE, in call order. */
const balanceUpdateResult: number[] = []

const { db, executeRawCalls } = vi.hoisted(() => {
    const executeRawCalls: Array<{ sql: string; values: unknown[]; result: number }> = []
    const db = {
        user: { findUnique: vi.fn() },
        subscription: { findFirst: vi.fn() },
        monthlyTokenUsage: { findUnique: vi.fn(), upsert: vi.fn() },
        tokenBalance: { findUnique: vi.fn() },
        $executeRaw: vi.fn(),
    }
    return { db, executeRawCalls }
})

vi.mock('@/lib/db', () => ({ db }))
vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }))
vi.mock('@/lib/subscription-limits', () => ({ getUserSubscription: vi.fn() }))
vi.mock('@/lib/storage', () => ({ uploadFile: vi.fn(), deleteFile: vi.fn() }))
vi.mock('@/lib/logger', () => ({ logger: vi.fn() }))
// A `pro` tier with a small monthly budget: the subscription claim below is
// scripted to fail, which is what pushes the call into the purchased branch.
vi.mock('@/lib/subscription-entitlements', () => ({
    resolveUserEntitlements: vi.fn(async () => ({ tier: 'pro', limits: { monthlyTokenBudget: 1_000 } })),
    resolveAgentEntitlements: vi.fn(async () => ({ tier: 'pro', limits: { monthlyTokenBudget: 1_000 } })),
}))

import { reserveTokens, releaseTokenReservation, getTokenBalance } from '@/lib/token-tracking'

const PRO_USER = 'usr_pro'

beforeEach(() => {
    vi.clearAllMocks()
    executeRawCalls.length = 0
    balanceUpdateResult.length = 0
    // Every subscription UPDATE affects zero rows (monthly budget exhausted),
    // so the purchased branch is what the assertions below exercise.
    db.$executeRaw.mockImplementation(async (strings: TemplateStringsArray, ...values: unknown[]) => {
        const sql = strings.join('?')
        const result = sql.includes('token_balances') ? (balanceUpdateResult.shift() ?? 0) : 0
        executeRawCalls.push({ sql, values, result })
        return result
    })
    db.user.findUnique.mockResolvedValue({ roles: 'policyholder' })
    db.subscription.findFirst.mockResolvedValue({
        status: 'active',
        stripeSubscriptionId: 'sub_1',
        plan: { planType: 'b2c', codeKey: 'pro', entitlements: {} },
    })
    db.monthlyTokenUsage.upsert.mockResolvedValue({})
})

const balanceUpdates = () => executeRawCalls.filter((c) => c.sql.includes('token_balances'))

describe('purchased-pool reservation is atomic', () => {
    it('claims with a conditional UPDATE, never a read-then-allow', async () => {
        balanceUpdateResult.push(1)

        const result = await reserveTokens(PRO_USER, 1_000)

        expect(result).toMatchObject({ allowed: true, source: 'purchased' })

        // The decision came from the UPDATE's affected-row count, not from a
        // SELECT: a read-then-allow is exactly the race being removed.
        expect(db.tokenBalance.findUnique).not.toHaveBeenCalled()

        const claim = balanceUpdates()[0]
        expect(claim).toBeDefined()
        expect(claim.sql).toContain('reserved_tokens = reserved_tokens +')
        // The guard must net off BOTH recorded usage and in-flight claims.
        expect(claim.sql).toContain('purchased_tokens - used_tokens - reserved_tokens')
        expect(claim.values).toContain(PRO_USER)
    })

    it('refuses the second claimant when the pool only covers one', async () => {
        // Two claimants against a pool with room for one. The first UPDATE
        // takes the headroom, the second finds the guard false and affects zero
        // rows — which is precisely what a real concurrent claimant sees after
        // losing the row lock.
        //
        // Deliberately sequential: prisma is mocked here, so a Promise.all
        // would demonstrate nothing about an actual race. What makes this safe
        // under real concurrency is that the decision IS the conditional
        // UPDATE — asserted structurally above — rather than a read followed by
        // a decision. Postgres serialises the rest.
        balanceUpdateResult.push(1, 0)

        const outcomes = [await reserveTokens(PRO_USER, 1_000), await reserveTokens(PRO_USER, 1_000)]

        expect(outcomes.filter((o) => o.allowed)).toHaveLength(1)
        expect(outcomes.find((o) => !o.allowed)).toMatchObject({
            allowed: false,
            reason: 'insufficient_tokens',
        })
        expect(balanceUpdates()).toHaveLength(2)
    })
})

describe('a purchased claim is released where it was made', () => {
    it('releases against token_balances, not the monthly row', async () => {
        await releaseTokenReservation(PRO_USER, 1_000, 'purchased')

        const release = balanceUpdates()[0]
        expect(release).toBeDefined()
        expect(release.sql).toContain('GREATEST(0, reserved_tokens -')
        // A purchased claim released against monthly_token_usage would leak the
        // purchased pool for ever — that pool has no monthly reset.
        expect(executeRawCalls.some((c) => c.sql.includes('monthly_token_usage'))).toBe(false)
    })

    it('still releases the subscription pool against the monthly row by default', async () => {
        await releaseTokenReservation(PRO_USER, 1_000)

        expect(executeRawCalls.some((c) => c.sql.includes('monthly_token_usage'))).toBe(true)
        expect(balanceUpdates()).toHaveLength(0)
    })
})

describe('reported balance nets off in-flight claims', () => {
    it('subtracts reserved tokens from remaining', async () => {
        db.tokenBalance.findUnique.mockResolvedValue({
            purchasedTokens: BigInt(10_000),
            usedTokens: BigInt(2_000),
            reservedTokens: BigInt(3_000),
        })

        const balance = await getTokenBalance(PRO_USER)

        // Showing a reservation as available is what admitted the second
        // concurrent claimant in the first place.
        expect(balance.remaining_tokens).toBe(5_000)
        expect(balance.reserved_tokens).toBe(3_000)
    })
})
