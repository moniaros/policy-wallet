import { describe, expect, it } from 'vitest'

import { getStatusColor, getStatusLabel, resolvePolicyLifecycle } from '@/lib/policy-status'

const future = new Date(Date.now() + 200 * 24 * 60 * 60 * 1000)
const soon = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)

describe('resolvePolicyLifecycle', () => {
    // THE prod bug: envelope holds the real (expired) extracted date while the
    // DB column holds the upload-day placeholder (+365d). The envelope wins.
    it('reports expired from the extracted envelope even when the DB column says +1 year', () => {
        const lifecycle = resolvePolicyLifecycle({
            status: 'active',
            policyNumber: '1651622',
            insurerName: 'ΕΘΝΙΚΗ',
            endDate: future, // placeholder column
            acordData: { policy: { expirationDate: '22-05-2025' } },
        })
        expect(lifecycle.status).toBe('expired')
        expect(lifecycle.endDate?.toISOString().slice(0, 10)).toBe('2025-05-22')
        expect(lifecycle.daysUntilExpiry).toBeLessThan(0)
    })

    it('treats an unparseable envelope date as unknown duration — never the placeholder column', () => {
        const lifecycle = resolvePolicyLifecycle({
            status: 'active',
            policyNumber: 'X',
            insurerName: 'Y',
            endDate: future, // placeholder column must NOT rescue this
            acordData: { policy: { expirationDate: 'σαράντα δύο' } },
        })
        expect(lifecycle.status).toBe('unknown_duration')
        expect(lifecycle.endDate).toBeNull()
        expect(lifecycle.daysUntilExpiry).toBeNull()
    })

    it('uses the DB column when no envelope value exists (manual policies)', () => {
        const lifecycle = resolvePolicyLifecycle({
            status: 'active',
            policyNumber: 'X',
            insurerName: 'Y',
            endDate: future,
            acordData: null,
        })
        expect(lifecycle.status).toBe('active')
        expect(lifecycle.daysUntilExpiry).toBeGreaterThan(30)
    })

    it('flags expiring soon within 30 days', () => {
        const lifecycle = resolvePolicyLifecycle({
            status: 'active',
            policyNumber: 'X',
            insurerName: 'Y',
            endDate: soon,
            acordData: null,
        })
        expect(lifecycle.status).toBe('expiring_soon')
    })

    it('keeps stored cancelled and honours renewal history over the envelope', () => {
        expect(
            resolvePolicyLifecycle({ status: 'cancelled', endDate: future, acordData: null }).status
        ).toBe('cancelled')

        const renewed = resolvePolicyLifecycle({
            status: 'active',
            policyNumber: 'X',
            insurerName: 'Y',
            endDate: null,
            acordData: {
                policy: { expirationDate: '22-05-2025' },
                renewalHistory: [{ endDate: future.toISOString() }],
            },
        })
        expect(renewed.status).toBe('active')
    })
})

describe('status presentation', () => {
    it('expired is amber (a calendar fact), never green or red-alarm', () => {
        const colors = getStatusColor('expired')
        expect(colors.bg).toContain('amber')
        expect(colors.text).toContain('amber')
    })

    it('unknown duration has its own neutral label and styling', () => {
        expect(getStatusLabel('unknown_duration', 'el')).toBe('Άγνωστη διάρκεια')
        expect(getStatusColor('unknown_duration').bg).toContain('stone')
    })

    it('expired label is ΛΗΓΜΕΝΟ in Greek', () => {
        expect(getStatusLabel('expired', 'el')).toBe('Ληγμένο')
    })
})
