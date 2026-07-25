import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * Conduct-risk guard: customer-facing copy must not promise outcomes the
 * product/policy cannot guarantee, and estimates must not masquerade as
 * certainty.
 *
 * - The gap-alert email told policyholders to "review now to ensure you are
 *   fully protected" — reviewing a finding ensures no such thing, and no
 *   policy provides "full protection".
 * - The savings report (a printable, agent-brandable, client-facing document)
 *   headlined a summed AI estimate with per-item "(85% βεβαιότητα)" — an LLM's
 *   self-assessed confidence presented as statistical CERTAINTY — and carried
 *   no methodology or cover-reduction caveat next to the number.
 * - Dead "Full protection based on policy specifications" keys deleted before
 *   anything could wire them.
 */
const MAIL = readFileSync('lib/mail-templates.ts', 'utf-8')
const REPORT = readFileSync('lib/services/reports/savings-report.ts', 'utf-8')
const EL = readFileSync('lib/i18n/translations/el.ts', 'utf-8')
const EN = readFileSync('lib/i18n/translations/en.ts', 'utf-8')

describe('customer emails do not overpromise outcomes', () => {
    it('gap alert does not claim reviewing ensures full protection', () => {
        expect(MAIL).not.toMatch(/fully protected|πλήρη προστασία/)
        expect(MAIL).not.toMatch(/ensure continuous coverage/)
    })
})

describe('savings report presents estimates as estimates', () => {
    it('no pseudo-certainty percentage on AI estimates', () => {
        expect(REPORT).not.toMatch(/βεβαιότητα|% confidence/)
        expect(REPORT).toContain('Ενδεικτική εκτίμηση')
    })

    it('the headline total carries the methodology + cover-reduction caveat', () => {
        expect(REPORT).toMatch(/savings-total .caveat/)
        expect(REPORT).toContain('Χαμηλότερο ασφάλιστρο μπορεί να σημαίνει μικρότερη κάλυψη')
        expect(REPORT).toContain('A lower premium can mean less cover')
        // The policy document stays the authoritative source.
        expect(REPORT).toContain('Αυθεντική πηγή παραμένει το ασφαλιστήριό σας')
    })

    it('uses the standardized policy term and Athens-pinned dates', () => {
        expect(REPORT).toContain('Αριθμός ασφαλιστηρίου')
        expect(REPORT).toContain('timeZone: "Europe/Athens"')
    })
})

describe('no "full protection" claims wait in the translations', () => {
    it('standardCoverageDesc ("Full protection…") is gone from both languages', () => {
        expect(EL).not.toContain('standardCoverageDesc')
        expect(EN).not.toContain('standardCoverageDesc')
        expect(EN).not.toMatch(/Full protection based on policy/)
    })
})
