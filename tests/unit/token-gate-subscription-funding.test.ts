/**
 * The pre-run token gate must recognise an active paid subscription's monthly
 * allowance as a funding source — with zero purchased tokens and zero usage.
 *
 * Verified failure this pins (dev DB, 2026-08-14): an ACTIVE ph-pro subscriber
 * was blocked with TOKEN_LIMIT_BLOCKED having consumed nothing, because
 * `reserveTokens` bound the month as a JS Date. Postgres compares a DATE
 * column to a bound timestamp by casting the date to server-TZ midnight, so
 * the guarded UPDATE matched zero rows on any non-UTC host and the whole
 * subscription budget was invisible to the step gate. Accounting, meanwhile,
 * addressed the month as a string — writing a DIFFERENT row ('2026-08-01' vs
 * the reservation path's '2026-07-31'). Both now flow through billingMonth().
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { db, executeRawCalls } = vi.hoisted(() => {
    const executeRawCalls: Array<{ sql: string; values: unknown[] }> = []
    const db = {
        user: { findUnique: vi.fn() },
        subscription: { findFirst: vi.fn() },
        monthlyTokenUsage: { findUnique: vi.fn(), upsert: vi.fn() },
        tokenBalance: { findUnique: vi.fn() },
        $executeRaw: vi.fn(async (strings: TemplateStringsArray, ...values: unknown[]) => {
            executeRawCalls.push({ sql: strings.join('?'), values })
            return 1
        }),
    }
    return { db, executeRawCalls }
})

vi.mock('@/lib/db', () => ({ db }))
vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }))
vi.mock('@/lib/subscription-limits', () => ({ getUserSubscription: vi.fn() }))
vi.mock('@/lib/storage', () => ({ uploadFile: vi.fn(), deleteFile: vi.fn() }))
vi.mock('@/lib/logger', () => ({ logger: vi.fn() }))

import {
    billingMonth,
    canUserUseTokens,
    reserveTokens,
    recordUsageAtomically,
} from '@/lib/token-tracking'
import { classifyAnalysisFailure } from '@/lib/services/policy-discard'

/** An active Stripe-backed ph-pro subscription whose plan row still carries
 *  the LEGACY entitlements shape — the resolver must fall back to the code
 *  defaults (pro → 3M monthly budget), never to zero. */
const activeProSubscription = {
    status: 'active',
    stripeSubscriptionId: 'sub_123',
    provider: 'stripe',
    currentPeriodEnd: new Date(Date.now() + 14 * 24 * 3600 * 1000),
    plan: {
        planType: 'policyholder',
        name: 'Pro',
        tierKey: 'pro',
        entitlements: {
            // pre-catalog legacy shape — must NOT parse as canonical
            ai_analyses_per_month: -1,
            full_history: true,
            notifications: true,
            policy_storage: -1,
            priority_processing: true,
        },
    },
}

beforeEach(() => {
    vi.clearAllMocks()
    executeRawCalls.length = 0
    db.user.findUnique.mockResolvedValue({ roles: 'policyholder' })
    db.subscription.findFirst.mockResolvedValue(activeProSubscription)
    db.monthlyTokenUsage.findUnique.mockResolvedValue(null)
    db.tokenBalance.findUnique.mockResolvedValue(null)
})

describe('billingMonth', () => {
    it('key and date name the same day in every timezone', () => {
        const { key, date } = billingMonth(new Date(2026, 7, 14, 23, 55))
        expect(key).toBe('2026-08-01')
        // Prisma serializes DATE columns from the UTC date part — this is the
        // invariant that keeps every reader and writer on one row.
        expect(date.toISOString()).toBe('2026-08-01T00:00:00.000Z')
    })

    it('does not drift into the previous month for TZs ahead of UTC', () => {
        // Local midnight Aug 1 in Athens used to serialize as 2026-07-31.
        const { key, date } = billingMonth(new Date(2026, 7, 1, 0, 0, 1))
        expect(key).toBe('2026-08-01')
        expect(date.getUTCDate()).toBe(1)
        expect(date.getUTCMonth()).toBe(7)
    })
})

describe('an active paid subscriber with zero purchased tokens and zero usage', () => {
    it('passes the run-level gate on the subscription pool', async () => {
        const gate = await canUserUseTokens('user-1', 187_440)
        expect(gate.allowed).toBe(true)
        expect(gate.source).toBe('subscription')
    })

    it('passes the per-step reservation on the subscription pool', async () => {
        const preflight = await reserveTokens('user-1', 85_000)
        expect(preflight.allowed).toBe(true)
        expect(preflight.source).toBe('subscription')
    })

    it('binds the month to raw SQL as a date STRING, never a JS Date', async () => {
        await reserveTokens('user-1', 85_000)
        expect(executeRawCalls.length).toBeGreaterThan(0)
        for (const call of executeRawCalls) {
            for (const value of call.values) {
                expect(value instanceof Date).toBe(false)
            }
        }
        const monthValues = executeRawCalls.flatMap((c) =>
            c.values.filter((v) => typeof v === 'string' && /^\d{4}-\d{2}-01$/.test(v))
        )
        expect(monthValues.length).toBeGreaterThan(0)
    })
})

describe('a subscriber who has genuinely exhausted the monthly allowance', () => {
    it('is blocked, and the block classifies as KEEP-AND-INFORM (TOKEN_LIMIT_BLOCKED)', async () => {
        db.monthlyTokenUsage.findUnique.mockResolvedValue({
            totalTokens: BigInt(3_000_000),
            reservedTokens: BigInt(0),
        })
        const gate = await canUserUseTokens('user-1', 50_000)
        expect(gate.allowed).toBe(false)
        expect(gate.reason).toBe('insufficient_tokens')

        // The reason feeds the disposition machinery: the upload is KEPT and
        // the customer told why in Greek (tests/unit/analysis-failure-
        // disposition.test.ts pins the Greek copy for this code).
        const classified = classifyAnalysisFailure({ blockedReason: gate.reason })
        expect(classified.kind).toBe('inform')
        expect(classified.code).toBe('TOKEN_LIMIT_BLOCKED')
    })
})

describe('recordUsageAtomically balance draw', () => {
    it('caps the purchased-pool debit and never creates a balance row', async () => {
        await recordUsageAtomically({
            userId: 'user-1',
            operationType: 'policy_clarity',
            policyId: null,
            inputTokens: 100,
            outputTokens: 50,
            totalTokens: 150,
            totalCost: 0.001,
            model: 'gemini-2.5-flash' as never,
            tier: 'pro',
            budgetLimit: 0,
            month: billingMonth().date,
        })
        const sql = executeRawCalls.map((c) => c.sql).join('\n')
        // The draw is an UPDATE floored by purchased_tokens — the INSERT arm
        // that manufactured purchased=0/used=N rows (prod remaining: -7,249)
        // must not come back.
        expect(sql).toContain('LEAST(tb."used_tokens"')
        expect(sql).not.toContain('INSERT INTO "token_balances"')
    })
})
