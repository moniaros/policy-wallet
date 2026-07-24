import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { FREE_LIFETIME_QUESTIONS } from '@/lib/monetization/feature-gates'

const strip = (s: string) => s.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
const el = strip(readFileSync('lib/monetization/upgrade-copy.el.ts', 'utf-8'))
const en = strip(readFileSync('lib/monetization/upgrade-copy.en.ts', 'utf-8'))

/**
 * The AI Q&A paywall said «Έκανες τις δωρεάν ερωτήσεις σου για αυτόν τον μήνα» /
 * "You've used your free questions for this month."
 *
 * FREE_LIFETIME_QUESTIONS is 0. The reader never had any free questions, so they
 * cannot have used them — and the allowance is LIFETIME, so no reset is coming.
 * Someone who read that and waited for next month would wait forever. Wrong on
 * both halves, on a paywall, which is the worst place to be loose with a claim.
 *
 * Found by chasing an E2E failure through a false alarm of my own — a stale
 * .next was preventing hydration, which made the toggle look dead. A clean
 * rebuild showed the real upgrade path, and this copy inside it.
 */
describe('paywall copy does not describe an allowance that never existed', () => {
    it('the premise still holds: there is no free question allowance', () => {
        // If this ever becomes > 0, the copy below may legitimately change.
        expect(FREE_LIFETIME_QUESTIONS).toBe(0)
    })

    it('does not claim the reader spent free questions', () => {
        expect(el).not.toMatch(/Έκανες τις δωρεάν ερωτήσεις σου/)
        expect(en).not.toMatch(/used your free questions/i)
    })

    it('does not promise a monthly reset', () => {
        expect(el).not.toMatch(/για αυτόν τον μήνα/)
        expect(en).not.toMatch(/for this month/i)
    })

    it('says plainly that the feature belongs to the paid plans', () => {
        expect(el).toMatch(/περιλαμβάνονται στα επί πληρωμή πλάνα/)
        expect(en).toMatch(/included in the paid plans/i)
    })
})
