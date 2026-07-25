import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { DEFAULT_ENTITLEMENT_LIMITS } from '@/lib/pricing/plan-defaults'

/**
 * The help center is the one surface where the product describes ITSELF — and it
 * shipped fabricated/stale claims a policyholder could act on: a free-plan limit
 * of "3 policies" (actual: 1), a "Premium" plan that doesn't exist, an "Expert
 * chat with real humans, Mon–Fri 9–6" that was never built, renewal reminders at
 * "30/14/3 days" (actual ladder: 90/60/30/15/7 paid, 30 free), an AI scan in
 * "10–30 seconds" (analysis queues — minutes), and share-flow steps through a
 * settings path that doesn't exist. This locks help to reality.
 */
const HELP = readFileSync('lib/help-content.ts', 'utf-8')

describe('help center states only facts the product actually implements', () => {
    it('the free-plan policy limit in help matches the plan catalog', () => {
        const limit = DEFAULT_ENTITLEMENT_LIMITS.free.policies
        expect(limit).toBe(1) // if the catalog changes, update the help sentences AND this line
        expect(HELP).toContain(`The free plan includes ${limit} policy`)
        expect(HELP).toContain(`Το δωρεάν πλάνο περιλαμβάνει ${limit} ασφαλιστήριο`)
        expect(HELP).not.toMatch(/limited to 3 active policies|περιορίζονται σε 3 ενεργά/)
    })

    it('never names the nonexistent "Premium" plan', () => {
        // Real B2C display names: Starter / Plus (tiers free|plus|pro).
        const valueSide = HELP.replace(/\/\/[^\n]*/g, '') // strip comments
        expect(valueSide).not.toMatch(/Premium/)
    })

    it('never claims the never-built expert chat / support hours', () => {
        expect(HELP).not.toMatch(/not bots|όχι bots/i)
        expect(HELP).not.toMatch(/Monday - Friday|Δευτέρα - Παρασκευή/)
        expect(HELP).not.toMatch(/Expert Agent|Ειδικού Συμβούλου"/)
    })

    it('states the real renewal-reminder ladder, not the invented 30/14/3', () => {
        expect(HELP).not.toMatch(/30, 14,? (and|και) 3/)
        expect(HELP).toMatch(/90, 60, 30, 15 (and|και) 7/)
    })

    it('does not promise a 10–30 second analysis (it queues; takes minutes)', () => {
        expect(HELP).not.toMatch(/10-30 (seconds|δευτερόλεπτα)/)
        expect(HELP).toMatch(/within a few minutes|μέσα σε λίγα λεπτά/)
    })

    it('sharing steps use the real per-policy Share flow, not a settings path', () => {
        expect(HELP).not.toMatch(/Grant Access|Παραχώρηση Πρόσβασης/)
        expect(HELP).toContain('Share with Advisor')
        expect(HELP).toContain('Κοινοποίηση σε σύμβουλο')
    })
})
