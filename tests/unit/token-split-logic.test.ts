import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { splitTokens } from '@/lib/token-tracking'

/**
 * The subscription/purchased split.
 *
 * The split used to be computed in JS from a separate read. That read never
 * locked anything — Postgres runs at READ COMMITTED — so two concurrent calls
 * for the same user both saw the same "used before" and both claimed the same
 * remaining subscription headroom, skewing toward UNDER-charging. It is now
 * computed inside the statement that applies it, where ON CONFLICT DO UPDATE's
 * row lock serialises callers.
 *
 * SCOPE, stated plainly: these tests exercise `splitTokens`, the reference
 * definition of the rule, plus structural checks on the SQL. They do NOT
 * execute the SQL. A column typo, a syntax error, or a mistranslation of the
 * rule into SQL would pass here and fail in production. Verifying that needs a
 * real Postgres.
 */

describe('splitTokens — the rule', () => {
    it('charges everything to the subscription when it fits', () => {
        expect(splitTokens(1500, 1_000_000, 0)).toEqual({ subscription: 1500, purchased: 0 })
    })

    it('splits at the budget boundary', () => {
        // 500 of headroom left, 1500 requested.
        expect(splitTokens(1500, 1_000_000, 999_500))
            .toEqual({ subscription: 500, purchased: 1000 })
    })

    it('charges everything to purchased once the budget is exhausted', () => {
        expect(splitTokens(1500, 1_000_000, 1_000_000))
            .toEqual({ subscription: 0, purchased: 1500 })
    })

    it('never returns negative headroom when usage already exceeds the budget', () => {
        // Can happen after a budget is lowered mid-month.
        expect(splitTokens(100, 1000, 5000)).toEqual({ subscription: 0, purchased: 100 })
    })

    it('treats a zero budget as everything purchased', () => {
        expect(splitTokens(1500, 0, 0)).toEqual({ subscription: 0, purchased: 1500 })
    })

    it('treats a null budget as unlimited subscription', () => {
        expect(splitTokens(1500, null, 999_999_999))
            .toEqual({ subscription: 1500, purchased: 0 })
    })

    it('handles a zero-token call', () => {
        expect(splitTokens(0, 1000, 500)).toEqual({ subscription: 0, purchased: 0 })
    })

    it('always sums back to the amount', () => {
        for (const amount of [0, 1, 999, 1500, 1_000_000]) {
            for (const budget of [null, 0, 1000, 1_000_000]) {
                for (const used of [0, 999, 1000, 2_000_000]) {
                    const { subscription, purchased } = splitTokens(amount, budget, used)
                    expect(subscription + purchased, `${amount}/${budget}/${used}`).toBe(amount)
                    expect(subscription).toBeGreaterThanOrEqual(0)
                    expect(purchased).toBeGreaterThanOrEqual(0)
                }
            }
        }
    })
})

describe('splitTokens — applied in sequence', () => {
    /** What the database does: each call sees the running total before it. */
    function applySequence(amounts: number[], budget: number | null) {
        let used = 0
        let subscription = 0
        let purchased = 0
        for (const amount of amounts) {
            const s = splitTokens(amount, budget, used)
            subscription += s.subscription
            purchased += s.purchased
            used += amount
        }
        return { used, subscription, purchased }
    }

    it('never grants subscription tokens beyond the budget', () => {
        const r = applySequence([400, 400, 400, 400, 400], 1000)
        expect(r.used).toBe(2000)
        expect(r.subscription).toBe(1000)
        expect(r.purchased).toBe(1000)
    })

    it('reproduces the case the race got wrong', () => {
        // Serialised: 999,500 used, then two 1,500-token calls.
        // The old code let BOTH read 999,500 and each claim 500 of headroom,
        // granting 1,000 subscription tokens past the budget and leaving 500
        // purchased tokens unbilled.
        const r = applySequence([999_500, 1500, 1500], 1_000_000)
        expect(r.subscription).toBe(1_000_000)
        expect(r.purchased).toBe(2500)
    })

    it('is order-independent in totals', () => {
        const a = applySequence([100, 900, 500], 1000)
        const b = applySequence([500, 100, 900], 1000)
        expect(a.subscription).toBe(b.subscription)
        expect(a.purchased).toBe(b.purchased)
    })

    it('bills nothing to purchased while an unlimited budget applies', () => {
        const r = applySequence([5_000_000, 5_000_000], null)
        expect(r.purchased).toBe(0)
        expect(r.subscription).toBe(10_000_000)
    })
})

describe('the SQL still implements the rule', () => {
    const src = readFileSync(join(process.cwd(), 'lib/token-tracking.ts'), 'utf8')

    it('keeps the atomic single-statement shape', () => {
        // These are the load-bearing pieces: the row lock that serialises
        // callers, and the CTEs that keep the three writes in one statement.
        for (const fragment of [
            'WITH usage AS (',
            'rollup AS (',
            'ON CONFLICT ("user_id", "month") DO UPDATE SET',
            'AS purchased_delta',
            'AND rollup.purchased_delta > 0',
            // The balance draw is an UPDATE capped at purchased_tokens. The old
            // INSERT..ON CONFLICT arm created rows at purchased=0/used=N and
            // debited with no floor — which is how a prod user reached
            // remaining -7,249 without ever buying a token. The INSERT must
            // not come back.
            'LEAST(tb."used_tokens" + rollup.purchased_delta, tb."purchased_tokens")',
        ]) {
            expect(src.includes(fragment), `SQL lost: ${fragment}`).toBe(true)
        }
        expect(
            src.includes('INSERT INTO "token_balances"'),
            'the balance-draw INSERT arm (the negative-balance bug) is back'
        ).toBe(false)
    })

    it('expresses the split with LEAST/GREATEST against the pre-update total', () => {
        // The whole fix is that the headroom is read from the LOCKED row inside
        // DO UPDATE, not from a prior SELECT.
        expect(src).toMatch(
            /GREATEST\(\$\{budget\}::bigint - "monthly_token_usage"\."total_tokens", 0\)/
        )
        expect(src).toMatch(/LEAST\(\$\{amount\}::bigint,/)
        expect(src).toMatch(/CASE WHEN \$\{budget\}::bigint IS NULL/)
    })

    it('has not reverted to computing the split in JS', () => {
        // Scoped to trackTokenUsage: getMonthlyUsage and canUserUseTokens read
        // the monthly row legitimately, and flagging those would make this
        // assertion noise that gets deleted rather than a guard that holds.
        const start = src.indexOf('export async function trackTokenUsage')
        expect(start).toBeGreaterThan(-1)
        const body = src.slice(start, src.indexOf('\nexport ', start + 1))

        // The exact shape of the original defect: a read used to compute the
        // split, followed by JS-side arithmetic.
        expect(body).not.toMatch(/const\s+purchasedConsumed\s*=/)
        expect(body).not.toMatch(/monthlyTokenUsage\.findUnique/)
    })

    it('does not use an interactive transaction', () => {
        // POLICYWALLET-W: a callback transaction's client-side timer expires
        // when a serverless instance is frozen mid-flight.
        expect(src).not.toMatch(/\$transaction\(\s*async/)
    })

    it('sends cost at 6dp and the month as a date string', () => {
        // token_usage.cost_eur is Decimal(10,6) while the rollup is (10,2);
        // and a Date cast with ::date resolves in the server's timezone.
        expect(src).toMatch(/toFixed\(6\)/)
        expect(src).toMatch(/monthKey/)
    })
})
