import { describe, expect, it } from 'vitest'
import { getPolicyStatusView, isAttentionKey, resolvePolicyStatusKey } from '@/lib/wallet/policy-status-view'

const NOW = new Date('2026-07-14T12:00:00Z')

// Minimal stand-in for the translation bundle; only t.policyStatus is read.
const t = {
    policyStatus: {
        active: 'Ενεργή',
        expiringSoon: 'Λήγει Σύντομα',
        expired: 'Ληγμένο',
        unknownDuration: 'Άγνωστη διάρκεια',
        actionNeeded: 'Απαιτείται Ενέργεια',
        cancelled: 'Ακυρωμένη',
        analyzing: 'Ανάλυση',
    },
}

function policy(overrides: Record<string, unknown> = {}) {
    return {
        status: 'active',
        policyNumber: 'PN-1',
        insurerName: 'Interamerican',
        endDate: new Date('2027-01-01T00:00:00Z'),
        ...overrides,
    }
}

describe('getPolicyStatusView', () => {
    it('never paints an expired policy as a red alarm — expiry is a calendar fact, not an emergency', () => {
        // The wallet used to collapse expired into action_needed, which rendered red.
        const view = getPolicyStatusView(
            policy({ acordData: { policy: { expirationDate: '2025-03-10' } } }),
            t,
            NOW
        )

        expect(view.key).toBe('expired')
        expect(view.tone).toBe('warning')
        expect(view.tone).not.toBe('critical')
        expect(view.pillClass).toContain('FEF3C7') // amber
        expect(view.label).toBe('Ληγμένο')
    })

    it('reads the real end date, not the never-recomputed stored status', () => {
        // Stored 'active', actually expired — the shape that leaked everywhere.
        const stale = policy({
            status: 'active',
            endDate: new Date('2027-06-01T00:00:00Z'), // placeholder, still future
            acordData: { policy: { expirationDate: '2025-03-10' } },
        })

        expect(resolvePolicyStatusKey(stale, NOW)).toBe('expired')
    })

    it('gives the alarm colour to expiring_soon — the one the user can still act on', () => {
        const view = getPolicyStatusView(
            policy({ acordData: { policy: { expirationDate: '2026-07-28' } } }),
            t,
            NOW
        )

        expect(view.key).toBe('expiring_soon')
        expect(view.tone).toBe('critical')
    })

    it('stays neutral when the end date is unreadable rather than inventing a state', () => {
        const view = getPolicyStatusView(
            policy({ acordData: { policy: { expirationDate: 'δεν αναγράφεται' } } }),
            t,
            NOW
        )

        expect(view.key).toBe('unknown_duration')
        expect(view.tone).toBe('neutral')
        expect(view.endDate).toBeNull()
        expect(view.daysUntilExpiry).toBeNull()
    })

    it('keeps the needs-review signal from a failed extraction, which the lifecycle does not model', () => {
        // Stored action_needed with a perfectly good future date: the lifecycle alone
        // calls this "active" and the user never learns the extraction failed.
        const view = getPolicyStatusView(policy({ status: 'action_needed' }), t, NOW)

        expect(view.key).toBe('action_needed')
        expect(view.tone).toBe('warning')
    })

    it('lets the calendar win over a stale needs-review flag — expired first, review second', () => {
        const view = getPolicyStatusView(
            policy({ status: 'action_needed', acordData: { policy: { expirationDate: '2025-01-01' } } }),
            t,
            NOW
        )

        expect(view.key).toBe('expired')
    })

    it('surfaces analyzing, which the lifecycle does not model', () => {
        expect(resolvePolicyStatusKey(policy({ status: 'analyzing' }), NOW)).toBe('analyzing')
        expect(getPolicyStatusView(policy({ status: 'analyzing' }), t, NOW).tone).toBe('info')
    })

    it('localises every state — a raw slug must never reach the UI', () => {
        const keys = ['active', 'expiring_soon', 'expired', 'unknown_duration', 'cancelled', 'analyzing'] as const
        const samples = [
            policy(),
            policy({ acordData: { policy: { expirationDate: '2026-07-28' } } }),
            policy({ acordData: { policy: { expirationDate: '2020-01-01' } } }),
            policy({ acordData: { policy: { expirationDate: 'χχχ' } } }),
            policy({ status: 'cancelled' }),
            policy({ status: 'analyzing' }),
        ]

        const views = samples.map((p) => getPolicyStatusView(p, t, NOW))

        expect(views.map((v) => v.key)).toEqual(keys)
        for (const view of views) {
            expect(view.label).not.toBe('')
            expect(view.label).not.toMatch(/_/) // no snake_case slug leaked through
        }
    })

    it('counts exactly the states that should pull the user in', () => {
        expect(isAttentionKey('expired')).toBe(true)
        expect(isAttentionKey('expiring_soon')).toBe(true)
        expect(isAttentionKey('action_needed')).toBe(true)
        expect(isAttentionKey('unknown_duration')).toBe(true)
        expect(isAttentionKey('active')).toBe(false)
        expect(isAttentionKey('cancelled')).toBe(false)
    })
})
