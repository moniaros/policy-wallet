/**
 * Cost controls on the billable suggestQualification path.
 *
 * Reusing the "metered" askQuestion helper RECORDS usage; it does not GATE it.
 * That distinction is what left this button unlimited, so the gates are pinned
 * here at source level: a future edit that drops the rate limit or the budget
 * check fails this suite rather than quietly re-opening the spend.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { estimateSuggestTokens, SUGGEST_OUTPUT_TOKEN_ALLOWANCE } from '@/lib/medic/suggest'

const source = readFileSync(join(process.cwd(), 'app/(protected)/agent/actions.ts'), 'utf8')

/** The suggestQualificationFromNotes body, up to the next exported function. */
function suggestBody(): string {
    const start = source.indexOf('export async function suggestQualificationFromNotes')
    expect(start, 'suggestQualificationFromNotes not found — test is stale').toBeGreaterThan(-1)
    const rest = source.slice(start + 1)
    const end = rest.indexOf('\nexport async function ')
    return end === -1 ? rest : rest.slice(0, end)
}

describe('estimateSuggestTokens', () => {
    it('scales with the payload instead of guessing a flat number', () => {
        const small = estimateSuggestTokens('x'.repeat(400))
        const large = estimateSuggestTokens('x'.repeat(80_000))
        expect(small).toBe(100 + SUGGEST_OUTPUT_TOKEN_ALLOWANCE)
        expect(large).toBe(20_000 + SUGGEST_OUTPUT_TOKEN_ALLOWANCE)
        expect(large).toBeGreaterThan(small)
    })

    it('always reserves room for the model reply', () => {
        expect(estimateSuggestTokens('')).toBe(SUGGEST_OUTPUT_TOKEN_ALLOWANCE)
    })
})

describe('suggestQualificationFromNotes cost controls', () => {
    it('rate-limits per agent', () => {
        const body = suggestBody()
        expect(body).toMatch(/rateLimit\(/)
        expect(body).toMatch(/medic-suggest:/)
        expect(body).toMatch(/RATE_LIMITED/)
    })

    it('has a durable cap that does not depend on Redis', () => {
        // Prod runs RATELIMIT_ALLOW_LOCAL=1 with no Upstash, so the Redis
        // limiter alone is per-instance. The DB count is the real backstop.
        const body = suggestBody()
        expect(body).toMatch(/activityLog\.count\(/)
        expect(body).toMatch(/MEDIC_SUGGESTION_REQUESTED/)
    })

    it('gates on the token budget before spending', () => {
        const body = suggestBody()
        expect(body).toMatch(/canUserUseTokens\(/)
        expect(body).toMatch(/TOKEN_LIMIT_BLOCKED/)
    })

    it('checks the budget BEFORE the AI call, not after', () => {
        const body = suggestBody()
        // Match the CALL SITE, not the word — prose about askQuestion appears
        // in the comments above the gates.
        const call = body.indexOf('aiService.askQuestion(')
        expect(call, 'askQuestion call site not found — test is stale').toBeGreaterThan(-1)
        expect(body.indexOf('canUserUseTokens(')).toBeLessThan(call)
        expect(body.indexOf('rateLimit(')).toBeLessThan(call)
    })

    it('records an auditable activity row for the spend', () => {
        const body = suggestBody()
        expect(body).toMatch(/MEDIC_SUGGESTION_REQUESTED/)
    })

    it('does not write an email into the audit row (GDPR audit M3)', () => {
        const body = suggestBody()
        expect(body).not.toMatch(/adminEmail:\s*authResult\.dbUser\.email/)
    })
})
