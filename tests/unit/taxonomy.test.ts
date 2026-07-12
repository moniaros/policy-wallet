import { describe, expect, it } from 'vitest'

import {
    BRANCHES_BY_ID,
    INSURANCE_BRANCHES,
    WRITE_BRANCH_IDS,
    getBranch,
    getBranchFamily,
    branchLabel,
    normalizeBranch,
} from '@/lib/insurance/taxonomy'
import { SCORE_CATEGORIES } from '@/lib/services/gap-engine/protection-score'
import { el } from '@/lib/i18n/translations/el'
import { en } from '@/lib/i18n/translations/en'

/** The Zod vocabulary before the taxonomy existed — must never shrink. */
const LEGACY_WRITE_IDS = ['motor', 'health', 'home', 'life', 'business', 'travel', 'pet', 'liability', 'other']

describe('insurance taxonomy — registry integrity', () => {
    it('has unique ids', () => {
        const ids = INSURANCE_BRANCHES.map((b) => b.id)
        expect(new Set(ids).size).toBe(ids.length)
    })

    it('aliases are unique and never collide with ids', () => {
        const ids = new Set(INSURANCE_BRANCHES.map((b) => b.id))
        const aliases = INSURANCE_BRANCHES.flatMap((b) => b.aliases)
        expect(new Set(aliases).size).toBe(aliases.length)
        for (const alias of aliases) {
            expect(ids.has(alias), `alias "${alias}" collides with a branch id`).toBe(false)
        }
    })

    it('every parentId points at an existing branch defined before its children', () => {
        const seen = new Set<string>()
        for (const branch of INSURANCE_BRANCHES) {
            if (branch.parentId) {
                expect(seen.has(branch.parentId), `${branch.id} parent ${branch.parentId} must be defined earlier`).toBe(true)
            }
            seen.add(branch.id)
        }
    })

    it('every branch has non-empty bilingual labels and a Greek genitive', () => {
        for (const branch of INSURANCE_BRANCHES) {
            expect(branch.label.el.length, branch.id).toBeGreaterThan(0)
            expect(branch.label.en.length, branch.id).toBeGreaterThan(0)
            expect(branch.genitiveEl.length, branch.id).toBeGreaterThan(0)
        }
    })

    it('always includes the other fallback', () => {
        expect(BRANCHES_BY_ID.other).toBeDefined()
    })
})

describe('insurance taxonomy — write vocabulary', () => {
    it('is a strict superset of the legacy enum (no write path breaks)', () => {
        for (const legacy of LEGACY_WRITE_IDS) {
            expect(WRITE_BRANCH_IDS).toContain(legacy)
        }
    })

    it('matches the writeEnabled flags exactly', () => {
        const flagged = INSURANCE_BRANCHES.filter((b) => b.writeEnabled).map((b) => b.id).sort()
        expect([...WRITE_BRANCH_IDS].sort()).toEqual(flagged)
    })
})

describe('insurance taxonomy — normalizeBranch', () => {
    it('maps canonical ids to themselves', () => {
        for (const branch of INSURANCE_BRANCHES) {
            expect(normalizeBranch(branch.id).id).toBe(branch.id)
        }
    })

    it('maps every registered alias to its branch', () => {
        for (const branch of INSURANCE_BRANCHES) {
            for (const alias of branch.aliases) {
                expect(normalizeBranch(alias).id, `alias ${alias}`).toBe(branch.id)
            }
        }
    })

    it('maps the values observed across the codebase', () => {
        // marketing catalog ids
        expect(normalizeBranch('property').id).toBe('home')
        expect(normalizeBranch('group-health').id).toBe('group_health')
        expect(normalizeBranch('group-pension').id).toBe('group_pension')
        // legacy i18n keys
        expect(normalizeBranch('breakdown').id).toBe('roadside')
        expect(normalizeBranch('public_liability').id).toBe('liability')
        // free-form extraction output
        expect(normalizeBranch('Auto Insurance').id).toBe('motor')
        expect(normalizeBranch('MOTOR').id).toBe('motor')
        expect(normalizeBranch('lifeAndInvestment').id).toBe('life')
        expect(normalizeBranch('marine').id).toBe('boat')
        expect(normalizeBranch('group health plan').id).toBe('group_health')
        expect(normalizeBranch('motorbike').id).toBe('motorbike')
    })

    it('falls back to other for unknown or empty input', () => {
        expect(normalizeBranch('xyzzy-123').id).toBe('other')
        expect(normalizeBranch('').id).toBe('other')
        expect(normalizeBranch(null).id).toBe('other')
        expect(normalizeBranch(undefined).id).toBe('other')
    })
})

describe('insurance taxonomy — families', () => {
    it('motor family includes its two-wheeler and truck children', () => {
        const family = getBranchFamily('motor')
        expect(family).toContain('motor')
        expect(family).toContain('motorbike')
        expect(family).toContain('truck')
    })

    it('business family includes every b2b child line', () => {
        const family = getBranchFamily('business')
        for (const child of ['business_property', 'equipment', 'stock', 'business_interruption', 'professional_liability']) {
            expect(family).toContain(child)
        }
    })

    it('leaf branches are their own family', () => {
        expect(getBranchFamily('travel')).toEqual(['travel'])
    })
})

describe('insurance taxonomy — protection-score binding', () => {
    it('every SCORE_CATEGORIES coveredByLob is a known taxonomy id (drift guard)', () => {
        for (const category of SCORE_CATEGORIES) {
            for (const lob of category.coveredByLobs) {
                expect(getBranch(lob), `SCORE_CATEGORIES.${category.key} references unknown lob "${lob}"`).toBeDefined()
            }
        }
    })

    it('branch scoreCategory values are valid category keys', () => {
        const keys = new Set(SCORE_CATEGORIES.map((c) => c.key))
        for (const branch of INSURANCE_BRANCHES) {
            if (branch.scoreCategory != null) {
                expect(keys.has(branch.scoreCategory), `${branch.id} → ${branch.scoreCategory}`).toBe(true)
            }
        }
    })
})

describe('insurance taxonomy — i18n coverage', () => {
    it('every branch id has a policyTypes label in both languages', () => {
        const elTypes = el.policyTypes as Record<string, string>
        const enTypes = en.policyTypes as Record<string, string>
        for (const branch of INSURANCE_BRANCHES) {
            expect(elTypes[branch.id], `el policyTypes.${branch.id}`).toBeTruthy()
            expect(enTypes[branch.id], `en policyTypes.${branch.id}`).toBeTruthy()
        }
    })

    it('branchLabel resolves for raw free-form input', () => {
        expect(branchLabel('property', 'el')).toBe('Κατοικία')
        expect(branchLabel('motor', 'en')).toBe('Motor')
    })
})
