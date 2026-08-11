import { readFileSync } from 'fs'
import { join } from 'path'

import { describe, expect, it } from 'vitest'

import {
    INSURANCE_BRANCHES,
    WRITE_BRANCH_IDS,
    normalizeBranch,
} from '@/lib/insurance/taxonomy'
import { LINES_OF_BUSINESS, isLineOfBusiness } from '@/types/enums'
import { lineOfBusinessEnum } from '@/lib/validations/policy'

const repoRoot = join(__dirname, '..', '..')
const read = (relative: string) => readFileSync(join(repoRoot, relative), 'utf8')

/**
 * Six vocabularies used to answer "which lines of business exist?" and they all
 * gave different answers. `types/enums.ts` carried two ALIASES as ids while
 * missing five real branches; `wallet/actions.ts` held two hand-copied `z.enum`
 * duplicates plus a static `getInsuranceTypes()` shadowing the DB table the seed
 * already builds from the taxonomy; `EditPolicyForm` offered nine options
 * against a write enum of twenty.
 *
 * The concrete defect that produced: a policy classified by extraction as
 * `pension` or `boat` could be created, but opening the edit form offered no
 * option matching its own type — so saving any other field silently changed the
 * line of business.
 *
 * These tests pin every vocabulary as a FUNCTION of the taxonomy so the drift
 * cannot come back quietly.
 */
describe('LoB vocabulary — everything derives from the taxonomy', () => {
    it('types/enums.ts accepts every taxonomy branch', () => {
        for (const branch of INSURANCE_BRANCHES) {
            expect(isLineOfBusiness(branch.id), `LINES_OF_BUSINESS is missing "${branch.id}"`).toBe(true)
        }
    })

    it('keeps the two legacy aliases accepted so older API clients do not break', () => {
        // Both resolve correctly through normalizeBranch; dropping them from the
        // accepted set would be a breaking narrowing of a public query filter.
        expect(isLineOfBusiness('breakdown')).toBe(true)
        expect(isLineOfBusiness('public_liability')).toBe(true)
        expect(normalizeBranch('breakdown').id).toBe('roadside')
        expect(normalizeBranch('public_liability').id).toBe('liability')
    })

    it('rejects values that are neither a branch nor a sanctioned alias', () => {
        expect(isLineOfBusiness('xyzzy')).toBe(false)
        expect(isLineOfBusiness('')).toBe(false)
    })

    it('carries no id that the taxonomy does not know', () => {
        const known = new Set<string>([
            ...INSURANCE_BRANCHES.map((b) => b.id),
            'breakdown',
            'public_liability',
        ])
        for (const value of LINES_OF_BUSINESS) {
            expect(known.has(value), `LINES_OF_BUSINESS has stray value "${value}"`).toBe(true)
        }
    })

    it('the create/edit Zod enum is exactly the writeEnabled set', () => {
        const options = [...(lineOfBusinessEnum.options as readonly string[])].sort()
        const flagged = INSURANCE_BRANCHES.filter((b) => b.writeEnabled).map((b) => b.id).sort()
        expect(options).toEqual(flagged)
    })

    /**
     * Asserted on the source rather than by calling it: `wallet/actions.ts` is a
     * "use server" module whose import chain reaches `lib/env.ts`, which parses
     * the real process environment and throws in a unit context.
     */
    it('getInsuranceTypes() derives from writeEnabled instead of a static list', () => {
        const source = read('app/(protected)/wallet/actions.ts')
        const body = source.slice(source.indexOf('export async function getInsuranceTypes'))
        expect(body).toMatch(/INSURANCE_BRANCHES[\s\S]{0,200}writeEnabled/)
        expect(body).not.toContain('mocking DB for immediate availability')
    })
})

describe('LoB vocabulary — no hand-written lists left in the write path', () => {
    const FILES_THAT_MUST_NOT_HARD_CODE = [
        'app/(protected)/wallet/actions.ts',
        'components/wallet/EditPolicyForm.tsx',
        'components/agent/AddCustomerModal.tsx',
        'components/agent/UploadPolicyModal.tsx',
        'components/collaboration/ProposalCard.tsx',
    ]

    /**
     * A literal list is recognised by three branch ids appearing as adjacent
     * quoted strings — the shape every one of the removed duplicates had. Prose
     * and single ids (a `useState("motor")` default) are deliberately allowed.
     */
    const TRIPLE_LITERAL = /["'](?:motor|health|home|life|travel|liability|pet)["']\s*,\s*["'](?:motor|health|home|life|travel|liability|pet)["']\s*,\s*["'](?:motor|health|home|life|travel|liability|pet)["']/

    for (const file of FILES_THAT_MUST_NOT_HARD_CODE) {
        it(`${file} builds its options from the taxonomy`, () => {
            const source = read(file)
            expect(
                TRIPLE_LITERAL.test(source),
                `${file} still contains a hand-written line-of-business list`
            ).toBe(false)
            expect(
                /lib\/insurance\/taxonomy|lib\/validations\/policy/.test(source),
                `${file} should source its vocabulary from the taxonomy`
            ).toBe(true)
        })
    }

    it('the public API filter validates against the taxonomy rather than a frozen tuple', () => {
        const source = read('app/api/v1/policies/route.ts')
        expect(source).toContain('isLineOfBusiness')
        // The swagger enum used to freeze an 18-value list into the published
        // contract; widening it later would have looked like a breaking change.
        expect(source).not.toMatch(/enum: \[motor, health, home, life, travel, liability/)
    })

    it('the AI write path uses the canonical normalizer', () => {
        const source = read('lib/services/analysis/policy-analysis-orchestrator.service.ts')
        expect(source).toContain('normalizeBranch(value).id')
        // The old local implementation knew only these two spellings.
        expect(source).not.toMatch(/if \(lob === "auto"\) return "motor"/)
    })
})

describe('LoB vocabulary — the branches the supplied documents need', () => {
    /**
     * Each of these is a line that a real Greek policy schedule names and that
     * the extractor is now permitted to emit. Before this change the model was
     * constrained to a 20-value vocabulary with no home for any of them, so a
     * marine cargo policy could only be labelled `boat` or `other`.
     */
    const REQUIRED = [
        'boat_hull',
        'boat_tpl',
        'fine_art',
        'marine_hull',
        'marine_cargo',
        'marine_crew',
        'money',
        'fidelity',
        'transports',
        'employer_liability',
        'professional_liability',
    ]

    for (const id of REQUIRED) {
        it(`${id} is writable and therefore reachable by extraction`, () => {
            expect(WRITE_BRANCH_IDS).toContain(id)
            expect(isLineOfBusiness(id)).toBe(true)
        })
    }
})
