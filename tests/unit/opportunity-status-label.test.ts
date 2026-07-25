import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { opportunityStatusLabel } from '@/lib/opportunity/status-labels'

/**
 * The activity feed composed a bilingual message but interpolated the raw English
 * opportunity status into BOTH languages — so a Greek advisor read
 * «…ενημερώθηκε σε won». opportunityStatusLabel localises it.
 */
describe('opportunityStatusLabel localises the status, both languages', () => {
    it('maps every real status to a non-raw label', () => {
        for (const [status, expectedEl] of [
            ['open', 'Ανοιχτή'],
            ['contacted', 'Σε επικοινωνία'],
            ['won', 'Κερδισμένη'],
            ['lost', 'Χαμένη'],
            ['dismissed', 'Απορρίφθηκε'],
        ] as const) {
            const label = opportunityStatusLabel(status)
            expect(label.el).toBe(expectedEl)
            expect(label.el).toMatch(/[Α-Ωα-ωΆ-Ώά-ώ]/) // actually Greek
            expect(label.en).not.toBe(status) // not the raw code
            expect(label.en[0]).toBe(label.en[0].toUpperCase()) // Title-cased
        }
    })

    it('the activity feed routes opportunity status through the label helper', () => {
        const src = readFileSync('app/(protected)/activity/actions.ts', 'utf-8')
        // No raw ${opp.status} interpolation into a message string survives.
        expect(src).not.toMatch(/ενημερώθηκε σε \$\{opp\.status\}/)
        expect(src).not.toMatch(/changed to \$\{opp\.status\}/)
        expect(src).toContain('opportunityStatusLabel(opp.status)')
    })
})
