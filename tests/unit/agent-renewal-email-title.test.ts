import { describe, it, expect } from 'vitest'
import { agentRenewalEmailTitle } from '@/lib/services/renewal.service'

/**
 * The agent renewal-alert email title interpolated `policy.lineOfBusiness` raw —
 * a taxonomy CODE. For multi-word branches the intermediary received
 * "…Maria's income_protection policy", an underscored machine code in a
 * professional communication. It must resolve to the human branch label.
 */
describe('agentRenewalEmailTitle uses the human branch label, not the raw code', () => {
    it('resolves underscored codes to their label', () => {
        expect(agentRenewalEmailTitle('Maria', 'income_protection')).toBe(
            "Renewal alert: Maria's Income Protection policy",
        )
        expect(agentRenewalEmailTitle('Nikos', 'group_life')).toBe(
            "Renewal alert: Nikos's Group Life policy",
        )
        expect(agentRenewalEmailTitle('Eleni', 'personal_accident')).toBe(
            "Renewal alert: Eleni's Personal Accident policy",
        )
    })

    it('keeps single-word branches readable too', () => {
        expect(agentRenewalEmailTitle('Maria', 'motor')).toBe("Renewal alert: Maria's Motor policy")
        expect(agentRenewalEmailTitle('Maria', 'health')).toBe("Renewal alert: Maria's Health policy")
    })

    it('never leaks a raw underscored code into the subject', () => {
        for (const lob of ['income_protection', 'group_life', 'personal_accident', 'legal_expenses', 'group_pension']) {
            const title = agentRenewalEmailTitle('Client', lob)
            expect(title, `raw code leaked for ${lob}: ${title}`).not.toContain('_')
        }
    })
})
