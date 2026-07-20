import { describe, expect, it } from 'vitest'

import {
    RICH_BRANCH_CONTENT,
    buildGenericContent,
    getBranchContent,
    getBranchQuestions,
    type BranchContent,
} from '@/lib/insurance/content'
import { INSURANCE_BRANCHES, getBranch } from '@/lib/insurance/taxonomy'
import { PROFILE_GAP_RULES } from '@/lib/services/gap-engine/profile-gap-rules'

/**
 * Rule ids the editorial commonGaps may reference: live profile rules
 * (imported), portfolio rule ids and seeded GapDefinition slugs (the latter
 * two are string literals in their sources — keep in sync with
 * lib/services/gap-engine/portfolio-rules.ts and prisma/seed.ts).
 */
const PORTFOLIO_RULE_IDS = [
    'motor_expiring_soon',
    'health_low_coverage',
    'unclear_exclusions',
    'no_agent_connected',
]
const SEEDED_GAP_SLUGS = [
    'motor-theft',
    'motor-legal',
    'health-outpatient',
    'home-earthquake',
    'missing_enfia_components',
    'missing_coordination_centre',
    'missing_leishmaniasis',
    'green_card_expiring',
    'low_deductible_premium_waste',
]
const KNOWN_RULE_IDS = new Set([
    ...PROFILE_GAP_RULES.map((rule) => rule.id),
    ...PORTFOLIO_RULE_IDS,
    ...SEEDED_GAP_SLUGS,
])

/**
 * Compliance guard (docs/audits/ai-advice-compliance.md): editorial copy must
 * stay observational — no purchase directives, no absolute coverage or
 * savings promises.
 */
const BANNED_PHRASES = [
    // Greek
    'είστε πλήρως καλυμμέν',
    'είσαι πλήρως καλυμμέν',
    'σίγουρη αποζημίωση',
    'εγγυημένη εξοικονόμηση',
    'πρέπει να αγοράσ',
    'αγόρασε τώρα',
    'αγοράστε τώρα',
    'η καλύτερη ασφάλεια',
    'το ai αποφάσισε',
    // English
    'you are fully covered',
    'guaranteed savings',
    'you should buy',
    'we recommend buying',
    'buy now',
    'the best insurance',
]

/** Collect every user-facing string of a bundle (all Bilingual leaves). */
function collectStrings(content: BranchContent): string[] {
    const out: string[] = []
    const visit = (value: unknown) => {
        if (typeof value === 'string') out.push(value)
        else if (Array.isArray(value)) value.forEach(visit)
        else if (value && typeof value === 'object') Object.values(value).forEach(visit)
    }
    visit(content)
    return out
}

function assertBilingualLeaves(value: unknown, path: string) {
    if (value == null || typeof value !== 'object') return
    if (Array.isArray(value)) {
        value.forEach((item, i) => assertBilingualLeaves(item, `${path}[${i}]`))
        return
    }
    const record = value as Record<string, unknown>
    const keys = Object.keys(record)
    if (keys.includes('el') || keys.includes('en')) {
        expect(typeof record.el, `${path}.el must be a non-empty string`).toBe('string')
        expect(typeof record.en, `${path}.en must be a non-empty string`).toBe('string')
        expect((record.el as string).trim().length, `${path}.el empty`).toBeGreaterThan(0)
        expect((record.en as string).trim().length, `${path}.en empty`).toBeGreaterThan(0)
        return
    }
    for (const key of keys) assertBilingualLeaves(record[key], `${path}.${key}`)
}

describe('branch content — registry completeness', () => {
    it('every rich-tier taxonomy branch has a rich bundle and vice versa', () => {
        const richTaxonomyIds = INSURANCE_BRANCHES.filter((b) => b.contentTier === 'rich').map((b) => b.id).sort()
        expect(Object.keys(RICH_BRANCH_CONTENT).sort()).toEqual(richTaxonomyIds)
    })

    it('bundle branchIds match their registry keys', () => {
        for (const [key, content] of Object.entries(RICH_BRANCH_CONTENT)) {
            expect(content.branchId).toBe(key)
        }
    })

    it('every bundle carries the full content structure', () => {
        for (const content of Object.values(RICH_BRANCH_CONTENT)) {
            expect(content.whyItMatters.length, content.branchId).toBeGreaterThanOrEqual(2)
            expect(content.whatWeAnalyze.length, content.branchId).toBeGreaterThanOrEqual(2)
            expect(content.howToUseBetter.length, content.branchId).toBeGreaterThanOrEqual(2)
            expect(content.commonGaps.length, content.branchId).toBeGreaterThanOrEqual(2)
            expect(content.recommendedActions.length, content.branchId).toBeGreaterThanOrEqual(3)
            expect(content.suggestedQuestions.length, content.branchId).toBeGreaterThanOrEqual(4)
            expect(content.claimsSteps.length, content.branchId).toBeGreaterThanOrEqual(3)
        }
    })
})

describe('branch content — bilingual parity', () => {
    it('every el string has an en counterpart and neither is empty', () => {
        for (const content of Object.values(RICH_BRANCH_CONTENT)) {
            assertBilingualLeaves(content, content.branchId)
        }
    })
})

describe('branch content — compliance tone guard', () => {
    it('contains no directive or absolute-promise phrases', () => {
        for (const content of Object.values(RICH_BRANCH_CONTENT)) {
            for (const text of collectStrings(content)) {
                const lower = text.toLowerCase()
                for (const banned of BANNED_PHRASES) {
                    expect(lower.includes(banned), `"${banned}" found in ${content.branchId}: "${text}"`).toBe(false)
                }
            }
        }
    })

    it('generic fallback copy is also clean', () => {
        const generic = buildGenericContent(getBranch('boat')!)
        for (const text of collectStrings(generic)) {
            const lower = text.toLowerCase()
            for (const banned of BANNED_PHRASES) {
                expect(lower.includes(banned), `"${banned}" in generic bundle`).toBe(false)
            }
        }
    })
})

describe('branch content — relatedRuleId links', () => {
    it('every relatedRuleId points at a live engine rule or seeded gap definition', () => {
        for (const content of Object.values(RICH_BRANCH_CONTENT)) {
            for (const gap of content.commonGaps) {
                if (gap.relatedRuleId) {
                    expect(
                        KNOWN_RULE_IDS.has(gap.relatedRuleId),
                        `${content.branchId}.${gap.id} references unknown rule "${gap.relatedRuleId}"`
                    ).toBe(true)
                }
            }
        }
    })

    it('askAi actions always carry a question', () => {
        for (const content of Object.values(RICH_BRANCH_CONTENT)) {
            for (const action of content.recommendedActions) {
                if (action.ctaType === 'askAi') {
                    expect(action.question, `${content.branchId}.${action.id} askAi without question`).toBeDefined()
                }
            }
        }
    })
})

describe('branch content — resolution', () => {
    it('resolves rich bundles by id and by free-form value', () => {
        expect(getBranchContent('motor').branchId).toBe('motor')
        expect(getBranchContent('Auto Insurance').branchId).toBe('motor')
        expect(getBranchContent('property').branchId).toBe('home')
    })

    it('child branches fall back to the parent rich bundle', () => {
        expect(getBranchContent('motorbike').branchId).toBe('motor')
        expect(getBranchContent('business_interruption').branchId).toBe('business')
    })

    it('basic-tier branches without a rich parent get generic content', () => {
        const boat = getBranchContent('boat')
        expect(boat.branchId).toBe('boat')
        expect(boat.suggestedQuestions.length).toBeGreaterThanOrEqual(4)
    })

    it('unknown values resolve to the other fallback', () => {
        expect(getBranchContent('xyzzy').branchId).toBe('other')
        expect(getBranchContent(null).branchId).toBe('other')
    })

    /**
     * The policy detail page renders claimsSteps as the ordered list in
     * ClaimsGuidanceCard for ANY policy whose line is writeable. A branch that
     * resolves to a bundle with no steps would silently fall back to the
     * generic four — this asserts the surface is actually covered.
     */
    it('every writeEnabled branch resolves to a bundle with claims steps', () => {
        const writeEnabled = INSURANCE_BRANCHES.filter((branch) => branch.writeEnabled)
        expect(writeEnabled.length).toBeGreaterThan(0)

        for (const branch of writeEnabled) {
            const content = getBranchContent(branch.id)
            expect(content, `${branch.id} resolved to nothing`).toBeDefined()
            expect(content.claimsSteps.length, `${branch.id} has no claimsSteps`).toBeGreaterThan(0)
            for (const [i, step] of content.claimsSteps.entries()) {
                expect(step.el.trim().length, `${branch.id}.claimsSteps[${i}].el empty`).toBeGreaterThan(0)
                expect(step.en.trim().length, `${branch.id}.claimsSteps[${i}].en empty`).toBeGreaterThan(0)
            }
        }
    })

    it('getBranchQuestions returns language-resolved strings', () => {
        const el = getBranchQuestions('motor', 'el')
        const en = getBranchQuestions('motor', 'en')
        expect(el).toContain('Έχω οδική βοήθεια;')
        expect(en).toContain('Do I have roadside assistance?')
        expect(el.length).toBe(en.length)
    })
})
