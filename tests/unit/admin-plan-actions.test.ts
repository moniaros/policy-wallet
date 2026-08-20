import { describe, it, expect } from 'vitest'

import { computePlanDiff, parsePlanUpdateForm } from '@/lib/admin/plan-update'
import { entitlementFieldKinds } from '@/lib/pricing/entitlement-schema'
import { DEFAULT_ENTITLEMENT_LIMITS } from '@/lib/pricing/plan-defaults'

/** Build a FormData-like map for a full, valid B2C edit form. */
function formFor(
    overrides: Record<string, string | null> = {},
    limits = DEFAULT_ENTITLEMENT_LIMITS.pro
) {
    const values = new Map<string, string>()
    values.set('displayName', 'PolicyWallet Plus')
    values.set('price', '7.99')
    values.set('annualPrice', '79')
    values.set('trialDays', '14')
    values.set('isActive', 'on')
    values.set('isPublic', 'on')
    values.set('sortOrder', '2')
    for (const { key, kind } of entitlementFieldKinds('policyholder')) {
        const value = (limits as unknown as Record<string, number | boolean | null>)[key]
        if (kind === 'boolean') {
            if (value === true) values.set(`ent_${key}`, 'on')
        } else if (value === null) {
            values.set(`ent_${key}_unlimited`, 'on')
        } else {
            values.set(`ent_${key}`, String(value))
        }
    }
    for (const [key, value] of Object.entries(overrides)) {
        if (value === null) values.delete(key)
        else values.set(key, value)
    }
    return { get: (name: string) => values.get(name) ?? null }
}

const storedPro = {
    displayName: 'PolicyWallet Plus',
    price: 7.99,
    annualPrice: 79,
    trialDays: 14,
    isActive: true,
    isPublic: true,
    sortOrder: 2,
    entitlements: { ...DEFAULT_ENTITLEMENT_LIMITS.pro } as Record<string, unknown>,
}

describe('parsePlanUpdateForm', () => {
    it('round-trips a full valid form', () => {
        const parsed = parsePlanUpdateForm(formFor(), 'policyholder')
        expect(parsed.scalars.price).toBe(7.99)
        expect(parsed.scalars.annualPrice).toBe(79)
        expect(parsed.entitlements).toEqual(DEFAULT_ENTITLEMENT_LIMITS.pro)
    })

    it('empty annual price means null (12× monthly fallback)', () => {
        const parsed = parsePlanUpdateForm(formFor({ annualPrice: '' }), 'policyholder')
        expect(parsed.scalars.annualPrice).toBeNull()
    })

    it('unchecked checkboxes parse as false', () => {
        const parsed = parsePlanUpdateForm(
            formFor({ isActive: null, ent_notifications: null }),
            'policyholder'
        )
        expect(parsed.scalars.isActive).toBe(false)
        expect((parsed.entitlements as { notifications: boolean }).notifications).toBe(false)
    })

    it('the Unlimited checkbox overrides any typed number', () => {
        const parsed = parsePlanUpdateForm(
            formFor({ ent_policies: '5', ent_policies_unlimited: 'on' }),
            'policyholder'
        )
        expect((parsed.entitlements as { policies: number | null }).policies).toBeNull()
    })

    it('rejects an out-of-range price', () => {
        expect(() => parsePlanUpdateForm(formFor({ price: '1000' }), 'policyholder')).toThrow(
            /price/i
        )
        expect(() => parsePlanUpdateForm(formFor({ price: '-1' }), 'policyholder')).toThrow(
            /price/i
        )
    })

    it('rejects an out-of-range trial and a non-numeric limit', () => {
        expect(() => parsePlanUpdateForm(formFor({ trialDays: '91' }), 'policyholder')).toThrow(
            /trialDays/i
        )
        expect(() =>
            parsePlanUpdateForm(
                formFor({ ent_policies: 'lots', ent_policies_unlimited: null }),
                'policyholder'
            )
        ).toThrow(/policies/i)
    })

    it('a limit left empty without Unlimited is rejected (never silently 0)', () => {
        expect(() =>
            parsePlanUpdateForm(
                formFor({ ent_monthlyTokenBudget: '', ent_monthlyTokenBudget_unlimited: null }),
                'policyholder'
            )
        ).toThrow(/monthlyTokenBudget/i)
    })

    it('there are no identity fields — tierKey/planType cannot be smuggled in', () => {
        const parsed = parsePlanUpdateForm(
            formFor({ tierKey: 'agency', planType: 'agent' }),
            'policyholder'
        )
        expect(Object.keys(parsed.scalars)).not.toContain('tierKey')
        expect(Object.keys(parsed.scalars)).not.toContain('planType')
        // parsed against the B2C schema regardless of smuggled fields
        expect((parsed.entitlements as { policies: unknown }).policies).toBeDefined()
    })
})

describe('computePlanDiff', () => {
    it('is empty for a no-op save', () => {
        const parsed = parsePlanUpdateForm(formFor(), 'policyholder')
        expect(computePlanDiff(storedPro, parsed)).toEqual({})
    })

    it('captures scalar and entitlement changes with from/to', () => {
        const parsed = parsePlanUpdateForm(
            formFor({ price: '8.99', ent_policies: '10', ent_policies_unlimited: null }),
            'policyholder'
        )
        const diff = computePlanDiff(storedPro, parsed)
        expect(diff.price).toEqual({ from: 7.99, to: 8.99 })
        // `from` is whatever the catalog holds — derived, so a catalog change
        // shows up as a copy/config decision rather than a failing fixture.
        expect(diff['entitlements.policies']).toEqual({
            from: DEFAULT_ENTITLEMENT_LIMITS.pro.policies,
            to: 10,
        })
        expect(Object.keys(diff)).toHaveLength(2)
    })

    it('a legacy-shape row diffs every entitlement on first canonical save', () => {
        const legacyRow = { ...storedPro, entitlements: { policy_storage: 'unlimited' } }
        const parsed = parsePlanUpdateForm(formFor(), 'policyholder')
        const diff = computePlanDiff(legacyRow, parsed)
        expect(diff['entitlements.policies']).toBeDefined()
        expect(diff['entitlements.monthlyTokenBudget']).toBeDefined()
    })
})
