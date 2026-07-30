import { describe, it, expect } from 'vitest'
import { readFileSync } from "node:fs"
import { globSync } from "../helpers/glob"
import { getBranchIcon } from '@/lib/insurance/branch-icons'

const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

/**
 * One branch, one icon.
 *
 * Three components carried their own private LOB→icon maps, so the same policy
 * changed symbol as the user moved between screens: a life policy was a
 * Landmark in the wallet and a Shield on recommendations and insights; health
 * was HeartPulse in most places and a plain Heart on the recommendation cards;
 * home alternated between House and the older Home glyph.
 */
describe('branch icons come from one source', () => {
    it('no component keeps a private branch→icon map', () => {
        const offenders: string[] = []
        for (const file of globSync('{components,app}/**/*.tsx')) {
            const src = stripComments(readFileSync(file, 'utf-8'))
            // A map literal pairing branch keys with icon components.
            if (/\b(motor|health|home|life):\s*[A-Z]\w+,/.test(src)) offenders.push(file)
        }
        expect(offenders, `private icon maps:\n${offenders.join('\n')}`).toEqual([])
    })

    it('the shared helper answers for every branch the UI asks about', () => {
        for (const branch of ['motor', 'health', 'home', 'life', 'travel', 'pet', 'liability', 'other']) {
            expect(getBranchIcon(branch), branch).toBeTruthy()
        }
    })

    it('gives one stable answer per branch regardless of caller', () => {
        // Raw and normalized forms must resolve to the same component.
        expect(getBranchIcon('motor')).toBe(getBranchIcon('MOTOR'))
        expect(getBranchIcon('health')).toBe(getBranchIcon('Health'))
    })
})

/**
 * The coverage-insights page carries a note saying its priorities "are not a
 * definitive risk assessment". The badges beside that note said "Low risk" and
 * "High risk" — literal risk grades. The product disclaimed risk assessment in
 * one paragraph and graded risk in the next element.
 *
 * A compliance officer reads that as the product doing exactly what it says it
 * does not do. The gap engine emits a profile-based priority; the badge says so.
 */
describe('nothing grades the policyholder’s risk', () => {
    it('has no risk-grade labels anywhere in the UI', () => {
        const offenders: string[] = []
        for (const file of globSync('{components,app,lib}/**/*.{ts,tsx}')) {
            const src = stripComments(readFileSync(file, 'utf-8'))
            if (/(Υψηλός|Χαμηλός|Μέτριος) κίνδυνος|['"](High|Low|Medium) risk['"]/.test(src)) offenders.push(file)
        }
        expect(offenders, `risk grades presented as verdicts:\n${offenders.join('\n')}`).toEqual([])
    })

    it('InsightCard uses the same four priority tiers as the rest of the product', () => {
        const src = readFileSync('components/coverage/InsightCard.tsx', 'utf-8')
        for (const el of ['Χαμηλή προτεραιότητα', 'Μεσαία προτεραιότητα', 'Υψηλή προτεραιότητα', 'Κρίσιμη προτεραιότητα']) {
            expect(src, el).toContain(el)
        }
    })
})
