import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@sentry/nextjs', () => ({ captureMessage: vi.fn() }))
vi.mock('@/lib/db', () => ({
    db: {
        recommendationInstance: {
            findMany: vi.fn(),
            create: vi.fn(),
            updateMany: vi.fn(),
        },
        insuranceProduct: { findMany: vi.fn() },
    },
}))

import { db } from '@/lib/db'
import {
    dedupeRecommendationInputs,
    getActiveRecommendations,
    policyGapConcept,
    policyGapRuleId,
    policyGapsToRecommendations,
    syncRecommendations,
    type RecommendationInput,
} from '@/lib/services/gap-engine/recommendation-generator'

const findMany = db.recommendationInstance.findMany as any
const create = db.recommendationInstance.create as any
const updateMany = db.recommendationInstance.updateMany as any

function gapInstance(overrides: Record<string, any> = {}) {
    return {
        id: overrides.id ?? 'gi-1',
        severity: overrides.severity ?? 'high',
        aiExplanation: overrides.aiExplanation ?? 'The policy excludes theft.',
        aiExplanationEl: overrides.aiExplanationEl ?? 'Το συμβόλαιο εξαιρεί την κλοπή.',
        aiSuggestion: overrides.aiSuggestion ?? null,
        aiSuggestionEl: overrides.aiSuggestionEl ?? null,
        policy: overrides.policy ?? { lineOfBusiness: 'motor', insurerName: 'Εθνική' },
        definition: {
            name: overrides.name ?? 'Theft',
            slug: overrides.slug ?? 'theft',
            description: overrides.description ?? null,
        },
    }
}

function rec(overrides: Partial<RecommendationInput> = {}): RecommendationInput {
    return {
        userId: 'u1',
        lineOfBusiness: 'motor',
        ruleId: 'motor_no_roadside',
        gapInstanceId: null,
        title: { en: 'T', el: 'Τ' },
        description: { en: 'D', el: 'Δ' },
        urgency: 'medium',
        estimatedCostEur: null,
        personalReason: { en: 'R', el: 'Ρ' },
        ...overrides,
    }
}

beforeEach(() => {
    vi.clearAllMocks()
    findMany.mockResolvedValue([])
    create.mockResolvedValue({})
    updateMany.mockResolvedValue({ count: 1 })
})

describe('policy gap rule ids', () => {
    it('keys a rule by concept and branch, so aliases land on one id', () => {
        expect(policyGapRuleId('motor', 'own-vehicle-damage')).toBe('policy_gap:motor:own-damage')
        expect(policyGapRuleId('motor', 'own_damage')).toBe('policy_gap:motor:own-damage')
        expect(policyGapRuleId('MOTOR', 'motor-theft')).toBe('policy_gap:motor:theft')
    })

    it('reads the concept back out, including from legacy two-segment ids', () => {
        expect(policyGapConcept('policy_gap:motor:own-damage')).toBe('own-damage')
        expect(policyGapConcept('policy_gap:own_vehicle_damage')).toBe('own-damage')
        expect(policyGapConcept('motor_expiring_soon')).toBeNull()
        expect(policyGapConcept(null)).toBeNull()
    })

    it('does not merge the same word across branches', () => {
        expect(policyGapRuleId('motor', 'theft')).not.toBe(policyGapRuleId('home', 'theft'))
    })
})

describe('policyGapsToRecommendations', () => {
    it('emits one recommendation per finding, not one per gap instance', () => {
        // One policy, one finding, two AI spellings — plus the seeded rule's
        // own slug for the very same gap.
        const recs = policyGapsToRecommendations('u1', [
            gapInstance({ id: 'a', slug: 'own-damage', severity: 'medium' }),
            gapInstance({ id: 'b', slug: 'own_vehicle_damage', severity: 'critical' }),
            gapInstance({ id: 'c', slug: 'theft' }),
            gapInstance({ id: 'd', slug: 'motor-theft' }),
        ] as any)

        expect(recs).toHaveLength(2)
        const ids = recs.map((r) => r.ruleId).sort()
        expect(ids).toEqual(['policy_gap:motor:own-damage', 'policy_gap:motor:theft'])
        // The most urgent of a colliding set survives.
        expect(recs.find((r) => r.ruleId === 'policy_gap:motor:own-damage')?.urgency).toBe('critical')
    })

    it('titles the card in Greek from the content map, never the raw slug', () => {
        const [only] = policyGapsToRecommendations('u1', [
            gapInstance({ slug: 'glass-breakage', name: 'Glass-Breakage' }),
        ] as any)
        expect(only.title.el).toBe('Πιθανή έλλειψη κάλυψης θραύσης κρυστάλλων')
        expect(only.title.el).not.toMatch(/glass/i)
    })

    it('collapses the same gap detected on two policies of the same branch', () => {
        const recs = policyGapsToRecommendations('u1', [
            gapInstance({ id: 'a', slug: 'theft', policy: { lineOfBusiness: 'motor', insurerName: 'A' } }),
            gapInstance({ id: 'b', slug: 'theft', policy: { lineOfBusiness: 'motor', insurerName: 'B' } }),
        ] as any)
        expect(recs).toHaveLength(1)
    })
})

describe('dedupeRecommendationInputs', () => {
    it('is order-independent — severity decides the winner', () => {
        const low = rec({ ruleId: 'policy_gap:motor:theft', urgency: 'low' })
        const critical = rec({ ruleId: 'policy_gap:motor:theft', urgency: 'critical' })

        expect(dedupeRecommendationInputs([low, critical])).toHaveLength(1)
        expect(dedupeRecommendationInputs([low, critical])[0].urgency).toBe('critical')
        expect(dedupeRecommendationInputs([critical, low])[0].urgency).toBe('critical')
    })

    it('leaves distinct rules alone', () => {
        const recs = dedupeRecommendationInputs([
            rec({ ruleId: 'policy_gap:motor:theft' }),
            rec({ ruleId: 'policy_gap:motor:fire' }),
            rec({ ruleId: 'no_agent_connected' }),
        ])
        expect(recs).toHaveLength(3)
    })
})

describe('syncRecommendations', () => {
    it('writes one row when a run detects the same finding twice', async () => {
        // The original bug: the "already exists" set was built once and never
        // learned about the rows the loop itself created.
        const stats = await syncRecommendations('u1', [
            rec({ ruleId: 'policy_gap:motor:theft' }),
            rec({ ruleId: 'policy_gap:motor:theft' }),
        ])

        expect(create).toHaveBeenCalledTimes(1)
        expect(stats.created).toBe(1)
    })

    it('does not recreate a recommendation the user dismissed as not relevant', async () => {
        findMany.mockResolvedValue([
            {
                id: 'r1',
                ruleId: 'policy_gap:motor:theft',
                lineOfBusiness: 'motor',
                status: 'dismissed',
                dismissReason: 'not_relevant',
            },
        ])

        const stats = await syncRecommendations('u1', [rec({ ruleId: 'policy_gap:motor:theft' })])

        expect(create).not.toHaveBeenCalled()
        expect(stats.created).toBe(0)
    })

    it('does bring a finding back after the engine itself retired it', async () => {
        findMany.mockResolvedValue([
            {
                id: 'r1',
                ruleId: 'policy_gap:motor:theft',
                lineOfBusiness: 'motor',
                status: 'dismissed',
                dismissReason: 'auto:gap_resolved',
            },
        ])

        await syncRecommendations('u1', [rec({ ruleId: 'policy_gap:motor:theft' })])
        expect(create).toHaveBeenCalledTimes(1)
    })

    it('collapses duplicate active rows left behind by earlier runs', async () => {
        findMany.mockResolvedValue([
            { id: 'new', ruleId: 'policy_gap:motor:theft', lineOfBusiness: 'motor', status: 'active', dismissReason: null },
            { id: 'old', ruleId: 'policy_gap:motor:theft', lineOfBusiness: 'motor', status: 'active', dismissReason: null },
            { id: 'legacy', ruleId: 'policy_gap:motor_theft', lineOfBusiness: 'motor', status: 'active', dismissReason: null },
        ])

        await syncRecommendations('u1', [rec({ ruleId: 'policy_gap:motor:theft' })])

        // findMany is ordered newest-first, so 'new' is kept and its copies —
        // including the row written under the legacy rule id — are retired.
        expect(create).not.toHaveBeenCalled()
        expect(updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ id: { in: ['old', 'legacy'] } }),
                data: expect.objectContaining({ dismissReason: 'auto:duplicate' }),
            })
        )
    })

    it('retires a finding that no longer applies', async () => {
        findMany.mockResolvedValue([
            { id: 'r1', ruleId: 'policy_gap:motor:theft', lineOfBusiness: 'motor', status: 'active', dismissReason: null },
        ])

        await syncRecommendations('u1', [])

        expect(updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ id: { in: ['r1'] } }),
                data: expect.objectContaining({ dismissReason: 'auto:gap_resolved' }),
            })
        )
    })

    it('survives a concurrent run winning the insert race', async () => {
        create.mockRejectedValueOnce(Object.assign(new Error('unique'), { code: 'P2002' }))

        const stats = await syncRecommendations('u1', [rec({ ruleId: 'policy_gap:motor:theft' })])

        expect(stats.created).toBe(0) // the other run's row stands
    })
})

describe('getActiveRecommendations', () => {
    it('hides duplicate rows that are already in the database', async () => {
        // Rows written before rule ids carried a concept: three rows, one finding.
        findMany.mockResolvedValue([
            {
                id: 'r1', ruleId: 'policy_gap:own_vehicle_damage', lineOfBusiness: 'motor',
                title: { en: 'Own-Vehicle-Damage', el: 'Own-Vehicle-Damage' },
                description: {}, urgency: 'medium', estimatedCostEur: null, personalReason: {},
                status: 'active', createdAt: new Date('2026-07-10'), product: null,
            },
            {
                id: 'r2', ruleId: 'policy_gap:motor:own-damage', lineOfBusiness: 'motor',
                title: { en: 'Own damage', el: 'Ίδιες ζημιές' },
                description: {}, urgency: 'critical', estimatedCostEur: null, personalReason: {},
                status: 'active', createdAt: new Date('2026-07-14'), product: null,
            },
            {
                id: 'r3', ruleId: 'policy_gap:own-damage', lineOfBusiness: 'motor',
                title: { en: 'Own-Damage', el: 'Own-Damage' },
                description: {}, urgency: 'low', estimatedCostEur: null, personalReason: {},
                status: 'active', createdAt: new Date('2026-07-12'), product: null,
            },
        ])

        const recs = await getActiveRecommendations('u1')

        expect(recs).toHaveLength(1)
        expect(recs[0].id).toBe('r2') // most urgent survives
    })

    it('keeps the same finding on two different branches', async () => {
        findMany.mockResolvedValue([
            {
                id: 'r1', ruleId: 'policy_gap:motor:theft', lineOfBusiness: 'motor',
                title: { en: 'Theft', el: 'Κλοπή' }, description: {}, urgency: 'high',
                estimatedCostEur: null, personalReason: {}, status: 'active',
                createdAt: new Date('2026-07-14'), product: null,
            },
            {
                id: 'r2', ruleId: 'policy_gap:home:theft', lineOfBusiness: 'home',
                title: { en: 'Theft', el: 'Κλοπή' }, description: {}, urgency: 'high',
                estimatedCostEur: null, personalReason: {}, status: 'active',
                createdAt: new Date('2026-07-14'), product: null,
            },
        ])

        expect(await getActiveRecommendations('u1')).toHaveLength(2)
    })
})
