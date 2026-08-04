// @vitest-environment node
// PGlite loads a WASM build of Postgres; the repo-wide jsdom environment has no
// working fetch/arrayBuffer for it, so this file runs in node.
import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { PGlite } from '@electric-sql/pglite'

/**
 * The subscription-vs-purchased split, executed against a REAL Postgres.
 *
 * The split used to be computed in JS from a separate read. That read never
 * locked anything — Postgres runs at READ COMMITTED — so two concurrent calls
 * for the same user both saw the same "used before" and both awarded themselves
 * the same remaining subscription headroom. It skews toward UNDER-charging.
 *
 * The fix folds the read into the write so ON CONFLICT DO UPDATE's row lock
 * serialises callers. That is raw SQL in a billing path, so these tests run it
 * against an actual Postgres (PGlite, in-process WASM) rather than asserting on
 * the query string. A string assertion would have happily passed on SQL that
 * does not parse.
 */

let db: PGlite

const SCHEMA = `
CREATE TABLE token_usage (
  usage_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  operation_type TEXT NOT NULL,
  policy_id TEXT,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  total_tokens INTEGER NOT NULL,
  cost_eur NUMERIC(10,6) NOT NULL,
  model TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE monthly_token_usage (
  summary_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  month DATE NOT NULL,
  tier TEXT NOT NULL,
  total_tokens BIGINT NOT NULL,
  reserved_tokens BIGINT NOT NULL DEFAULT 0,
  total_cost_eur NUMERIC(10,2) NOT NULL,
  subscription_tokens BIGINT NOT NULL,
  purchased_tokens_used BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, month)
);
CREATE TABLE token_balances (
  balance_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  purchased_tokens BIGINT NOT NULL DEFAULT 0,
  used_tokens BIGINT NOT NULL DEFAULT 0,
  last_purchase_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
`

/**
 * The production statement, parameterised positionally.
 *
 * Kept byte-identical in shape to lib/token-tracking.ts `recordUsageAtomically`
 * — Prisma's tagged template turns each `${}` into $1..$n in order, which is
 * what this mirrors. If the two drift, the expectations below stop meaning
 * anything, so `matches the production statement` guards that.
 */
const SQL = `
WITH usage AS (
    INSERT INTO "token_usage"
        ("usage_id", "user_id", "operation_type", "policy_id",
         "input_tokens", "output_tokens", "total_tokens", "cost_eur",
         "model", "created_at")
    VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8::numeric, $9, now())
),
rollup AS (
    INSERT INTO "monthly_token_usage"
        ("summary_id", "user_id", "month", "tier", "total_tokens",
         "total_cost_eur", "subscription_tokens", "purchased_tokens_used", "created_at")
    VALUES (
        $10, $2, $11::date, $12, $13,
        $8::numeric,
        CASE WHEN $14::bigint IS NULL THEN $13::bigint
             ELSE LEAST($13::bigint, GREATEST($14::bigint, 0)) END,
        $13::bigint - CASE WHEN $14::bigint IS NULL THEN $13::bigint
             ELSE LEAST($13::bigint, GREATEST($14::bigint, 0)) END,
        now()
    )
    ON CONFLICT ("user_id", "month") DO UPDATE SET
        "total_tokens" = "monthly_token_usage"."total_tokens" + $13::bigint,
        "total_cost_eur" = "monthly_token_usage"."total_cost_eur" + $8::numeric,
        "subscription_tokens" = "monthly_token_usage"."subscription_tokens"
            + CASE WHEN $14::bigint IS NULL THEN $13::bigint
                   ELSE LEAST($13::bigint,
                              GREATEST($14::bigint - "monthly_token_usage"."total_tokens", 0)) END,
        "purchased_tokens_used" = "monthly_token_usage"."purchased_tokens_used"
            + ($13::bigint
               - CASE WHEN $14::bigint IS NULL THEN $13::bigint
                      ELSE LEAST($13::bigint,
                                 GREATEST($14::bigint - "monthly_token_usage"."total_tokens", 0)) END),
        "tier" = $12
    RETURNING (
        $13::bigint
        - CASE WHEN $14::bigint IS NULL THEN $13::bigint
               ELSE LEAST($13::bigint,
                          GREATEST($14::bigint
                                   - ("monthly_token_usage"."total_tokens" - $13::bigint), 0)) END
    ) AS purchased_delta
)
INSERT INTO "token_balances"
    ("balance_id", "user_id", "purchased_tokens", "used_tokens", "created_at", "updated_at")
SELECT $15, $2, 0, rollup.purchased_delta, now(), now()
FROM rollup
WHERE rollup.purchased_delta > 0
ON CONFLICT ("user_id") DO UPDATE SET
    "used_tokens" = "token_balances"."used_tokens" + EXCLUDED."used_tokens",
    "updated_at" = now()
`

const USER = 'user-1'
const MONTH = '2026-08-01'
let seq = 0

async function record(amount: number, budget: number | null, cost = '0.001000') {
    seq++
    await db.query(SQL, [
        `usage-${seq}`, USER, 'qa_session', null,
        Math.floor(amount / 2), Math.ceil(amount / 2), amount, cost,
        'gemini-3.1-flash-lite',
        `summary-${seq}`, MONTH, 'pro', String(amount), budget === null ? null : String(budget),
        `balance-${seq}`,
    ])
}

async function monthly() {
    const r = await db.query<any>(
        `SELECT total_tokens, subscription_tokens, purchased_tokens_used, total_cost_eur
         FROM monthly_token_usage WHERE user_id = $1`, [USER]
    )
    return r.rows[0]
}

async function balance() {
    const r = await db.query<any>(
        `SELECT used_tokens FROM token_balances WHERE user_id = $1`, [USER]
    )
    return r.rows[0] ?? null
}

beforeEach(async () => {
    db = new PGlite()
    await db.exec(SCHEMA)
    seq = 0
})

afterAll(async () => {
    await db?.close()
})

describe('atomic split — insert path', () => {
    it('puts everything on the subscription when it fits the budget', async () => {
        await record(1500, 1_000_000)

        const m = await monthly()
        expect(Number(m.total_tokens)).toBe(1500)
        expect(Number(m.subscription_tokens)).toBe(1500)
        expect(Number(m.purchased_tokens_used)).toBe(0)
        expect(await balance()).toBeNull()
    })

    it('splits at the boundary on a fresh row', async () => {
        await record(1500, 1000)

        const m = await monthly()
        expect(Number(m.subscription_tokens)).toBe(1000)
        expect(Number(m.purchased_tokens_used)).toBe(500)
        expect(Number((await balance()).used_tokens)).toBe(500)
    })

    it('charges everything to purchased when the budget is zero', async () => {
        await record(1500, 0)

        const m = await monthly()
        expect(Number(m.subscription_tokens)).toBe(0)
        expect(Number(m.purchased_tokens_used)).toBe(1500)
        expect(Number((await balance()).used_tokens)).toBe(1500)
    })

    it('treats a NULL budget as unlimited subscription', async () => {
        await record(1500, null)

        const m = await monthly()
        expect(Number(m.subscription_tokens)).toBe(1500)
        expect(Number(m.purchased_tokens_used)).toBe(0)
        expect(await balance()).toBeNull()
    })
})

describe('atomic split — conflict path', () => {
    it('consumes remaining headroom then spills to purchased', async () => {
        await record(999_500, 1_000_000)   // fills all but 500
        await record(1500, 1_000_000)      // 500 subscription, 1000 purchased

        const m = await monthly()
        expect(Number(m.total_tokens)).toBe(1_001_000)
        expect(Number(m.subscription_tokens)).toBe(1_000_000)
        expect(Number(m.purchased_tokens_used)).toBe(1000)
        expect(Number((await balance()).used_tokens)).toBe(1000)
    })

    it('never awards subscription tokens beyond the budget', async () => {
        for (let i = 0; i < 5; i++) await record(400, 1000)

        const m = await monthly()
        expect(Number(m.total_tokens)).toBe(2000)
        // The invariant that the race broke.
        expect(Number(m.subscription_tokens)).toBe(1000)
        expect(Number(m.purchased_tokens_used)).toBe(1000)
        expect(Number(m.subscription_tokens)).toBeLessThanOrEqual(1000)
    })

    it('keeps subscription + purchased equal to the total, always', async () => {
        await record(300, 1000)
        await record(900, 1000)
        await record(50, 1000)

        const m = await monthly()
        expect(Number(m.subscription_tokens) + Number(m.purchased_tokens_used))
            .toBe(Number(m.total_tokens))
    })

    it('accumulates the purchased balance across calls', async () => {
        await record(1000, 1000)   // exactly fills
        await record(200, 1000)    // all purchased
        await record(300, 1000)    // all purchased

        expect(Number((await balance()).used_tokens)).toBe(500)
    })
})

describe('atomic split — concurrency', () => {
    it('is exact when calls overlap', async () => {
        // The original defect: both callers read 999,500, both claimed the same
        // 500 of headroom, so subscription went 1,000 over budget and 500
        // purchased tokens were never billed.
        await record(999_500, 1_000_000)

        await Promise.all([record(1500, 1_000_000), record(1500, 1_000_000)])

        const m = await monthly()
        expect(Number(m.total_tokens)).toBe(1_002_500)
        expect(Number(m.subscription_tokens)).toBe(1_000_000)
        expect(Number(m.purchased_tokens_used)).toBe(2500)
        expect(Number((await balance()).used_tokens)).toBe(2500)
    })

    it('holds the invariant under many overlapping calls', async () => {
        await Promise.all(Array.from({ length: 20 }, () => record(100, 700)))

        const m = await monthly()
        expect(Number(m.total_tokens)).toBe(2000)
        expect(Number(m.subscription_tokens)).toBe(700)
        expect(Number(m.purchased_tokens_used)).toBe(1300)
        expect(Number((await balance()).used_tokens)).toBe(1300)
    })
})

describe('atomic split — side effects', () => {
    it('writes one usage row per call', async () => {
        await record(100, 1000)
        await record(100, 1000)

        const r = await db.query<any>(`SELECT count(*)::int AS n FROM token_usage`)
        expect(r.rows[0].n).toBe(2)
    })

    it('keeps per-call cost at 6dp while the monthly rollup rounds to 2dp', async () => {
        await record(100, 1000, '0.000123')

        const u = await db.query<any>(`SELECT cost_eur FROM token_usage`)
        expect(Number(u.rows[0].cost_eur)).toBeCloseTo(0.000123, 6)
        const m = await monthly()
        expect(Number(m.total_cost_eur)).toBe(0)
    })

    it('applies the rollup even when no balance row is written', async () => {
        // Data-modifying CTEs run exactly once regardless of whether the outer
        // query reads them — the rollup must not depend on purchased_delta > 0.
        await record(100, 1_000_000)

        expect(await monthly()).toBeTruthy()
        expect(await balance()).toBeNull()
    })
})

describe('the test SQL matches the production statement', () => {
    it('has the same shape as recordUsageAtomically', async () => {
        const { readFileSync } = await import('node:fs')
        const src = readFileSync('lib/token-tracking.ts', 'utf8')

        // Structural landmarks: if the production SQL is rewritten, these fail
        // and the expectations above must be revisited rather than silently
        // testing a statement the app no longer runs.
        for (const fragment of [
            'WITH usage AS (',
            'rollup AS (',
            'ON CONFLICT ("user_id", "month") DO UPDATE SET',
            'AS purchased_delta',
            'WHERE rollup.purchased_delta > 0',
            'ON CONFLICT ("user_id") DO UPDATE SET',
        ]) {
            expect(src.includes(fragment), `production SQL lost: ${fragment}`).toBe(true)
        }
        // And it must not have reverted to computing the split in JS.
        expect(src).not.toMatch(/const\s+purchasedConsumed\s*=/)
    })
})
