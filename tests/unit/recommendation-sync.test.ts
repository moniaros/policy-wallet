import { beforeEach, describe, expect, it, vi } from 'vitest'

const findMany = vi.fn()
const create = vi.fn()
const update = vi.fn()
const updateMany = vi.fn()

vi.mock('@/lib/db', () => ({
    db: {
        recommendationInstance: {
            findMany: (...args: any[]) => findMany(...args),
            create: (...args: any[]) => create(...args),
            update: (...args: any[]) => update(...args),
            updateMany: (...args: any[]) => updateMany(...args),
        },
        $transaction: async (fn: any) =>
            fn({
                recommendationInstance: {
                    findMany: (...args: any[]) => findMany(...args),
                    create: (...args: any[]) => create(...args),
                    update: (...args: any[]) => update(...args),
                    updateMany: (...args: any[]) => updateMany(...args),
                },
            }),
    },
}))

import { syncRecommendations, type RecommendationInput } from '@/lib/services/gap-engine/recommendation-generator'

function rec(ruleId: string, overrides: Partial<RecommendationInput> = {}): RecommendationInput {
    return {
        userId: 'u1',
        lineOfBusiness: 'health',
        ruleId,
        gapInstanceId: null,
        title: { en: 'T', el: 'Τ' },
        description: { en: 'D', el: 'Δ' },
        urgency: 'high',
        estimatedCostEur: 100,
        personalReason: { en: 'R', el: 'Λ' },
        ...overrides,
    }
}

beforeEach(() => {
    findMany.mockReset()
    create.mockReset()
    update.mockReset()
    updateMany.mockReset()
    findMany.mockResolvedValue([])
})

describe('syncRecommendations — one row per (user, rule)', () => {
    it('collapses a duplicate ruleId inside ONE batch (the policy_gap:<slug> case)', async () => {
        // Two policies with the same gap slug produce the same ruleId twice.
        await syncRecommendations('u1', [rec('policy_gap:mental-health-exclusion'), rec('policy_gap:mental-health-exclusion')])

        expect(create).toHaveBeenCalledTimes(1)
    })

    it('updates the existing row instead of inserting a second one', async () => {
        findMany.mockResolvedValue([
            { id: 'r1', ruleId: 'no_health', status: 'active', dismissReason: null },
        ])

        const result = await syncRecommendations('u1', [rec('no_health')])

        expect(create).not.toHaveBeenCalled()
        expect(update).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: 'r1' } })
        )
        expect(result.created).toBe(0)
    })

    it('reactivates a rule the engine itself auto-dismissed', async () => {
        findMany.mockResolvedValue([
            { id: 'r1', ruleId: 'no_health', status: 'dismissed', dismissReason: 'auto:gap_resolved' },
        ])

        await syncRecommendations('u1', [rec('no_health')])

        expect(update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 'r1' },
                data: expect.objectContaining({ status: 'active', dismissReason: null }),
            })
        )
    })

    it('RESPECTS a user dismissal — "not relevant" is not resurrected', async () => {
        findMany.mockResolvedValue([
            { id: 'r1', ruleId: 'no_health', status: 'dismissed', dismissReason: 'not_relevant' },
        ])

        await syncRecommendations('u1', [rec('no_health')])

        expect(create).not.toHaveBeenCalled()
        expect(update).not.toHaveBeenCalled()
    })

    it('auto-dismisses rules that no longer fire', async () => {
        findMany.mockResolvedValue([
            { id: 'r1', ruleId: 'no_health', status: 'active', dismissReason: null },
            { id: 'r2', ruleId: 'vehicles_no_motor', status: 'active', dismissReason: null },
        ])

        const result = await syncRecommendations('u1', [rec('no_health')])

        expect(updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: { in: ['r2'] } },
                data: { status: 'dismissed', dismissReason: 'auto:gap_resolved' },
            })
        )
        expect(result.dismissed).toBe(1)
    })
})


describe('upgrading the engine does not resurrect dismissed cards', () => {
    it('carries a user dismissal across the legacy rule rename', async () => {
        // Every profile-rule id changed when the rules became catalog risks. A
        // customer who had dismissed `mortgage_no_life` would otherwise meet the
        // same finding again the next morning as `risk:life_debt` — the product
        // forgetting, on upgrade, the one thing they took the trouble to say.
        findMany.mockResolvedValue([
            { id: 'old-1', ruleId: 'mortgage_no_life', status: 'dismissed', dismissReason: 'not_relevant' },
        ])

        await syncRecommendations('u1', [rec('risk:life_debt', { lineOfBusiness: 'life' })])

        const written = create.mock.calls.map((c: any) => c[0].data)
        const lifeDebt = written.find((d: any) => d.ruleId === 'risk:life_debt')
        expect(lifeDebt, 'the replacement row was not written').toBeTruthy()
        expect(lifeDebt.status).toBe('dismissed')
        expect(lifeDebt.dismissReason).toBe('not_relevant')
    })

    it('still surfaces a replacement whose predecessor was active', async () => {
        findMany.mockResolvedValue([
            { id: 'old-2', ruleId: 'vehicles_no_motor', status: 'active', dismissReason: null },
        ])

        await syncRecommendations('u1', [rec('risk:motor_liability', { lineOfBusiness: 'motor' })])

        const written = create.mock.calls.map((c: any) => c[0].data)
        expect(written.find((d: any) => d.ruleId === 'risk:motor_liability')?.status).toBe('active')
    })

    it('does not carry a dismissal onto a finding we now make differently', async () => {
        // `no_health` was withdrawn as wrong, not renamed. Someone who dismissed
        // a claim we no longer make has not dismissed the one we now make.
        findMany.mockResolvedValue([
            { id: 'old-3', ruleId: 'no_health', status: 'dismissed', dismissReason: 'not_relevant' },
        ])

        await syncRecommendations('u1', [rec('risk:health_access_delay', { lineOfBusiness: 'health' })])

        const written = create.mock.calls.map((c: any) => c[0].data)
        expect(written.find((d: any) => d.ruleId === 'risk:health_access_delay')?.status).toBe('active')
    })
})
