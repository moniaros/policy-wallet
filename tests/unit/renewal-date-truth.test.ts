import { describe, it, expect } from 'vitest'
import { resolvePolicyLifecycle, effectivePolicyStatus } from '@/lib/policy-status'

/**
 * The agent's client page showed `status: effectivePolicyStatus(p)` — the
 * resolved lifecycle — directly beside `expiresAt: p.endDate`, the stored
 * column. resolvePolicyLifecycle treats that column as the LAST fallback,
 * behind a renewal re-upload and the extracted envelope, so the two fields
 * could describe different policies: a renewed motor policy rendered as
 * "Ενεργό · 25 Μαΐ 2025" — active, next to an expiry that had already passed.
 *
 * The renewal date is the date an insurance servicing workflow runs on, so
 * these assertions pin the precedence rather than the call shape.
 */
describe('a renewed policy reports its renewed end date, not the stale column', () => {
    const now = new Date('2026-07-24T00:00:00Z')

    // Column says it lapsed last year; the renewal re-upload says 2027.
    const renewed = {
        status: 'active',
        policyNumber: 'P-1',
        insurerName: 'ΕΘΝΙΚΗ',
        endDate: new Date('2025-05-25T00:00:00Z'),
        acordData: {
            renewalHistory: [{ endDate: '2027-05-25' }],
        },
    }

    it('resolves to the renewal date, not the stored column', () => {
        const { endDate } = resolvePolicyLifecycle(renewed, now)
        expect(endDate?.getUTCFullYear()).toBe(2027)
    })

    it('would have contradicted itself if the column were rendered', () => {
        // The exact bug: status says active, the column says it expired in 2025.
        expect(effectivePolicyStatus(renewed)).toBe('active')
        expect(renewed.endDate.getTime()).toBeLessThan(now.getTime())
    })

    it('prefers the extracted envelope over the column when there is no renewal', () => {
        const extracted = {
            status: 'active',
            policyNumber: 'P-2',
            insurerName: 'ΕΘΝΙΚΗ',
            endDate: new Date('2025-01-01T00:00:00Z'),
            // The envelope lives under acordData.policy, not at the root.
            acordData: { policy: { expirationDate: '2026-12-31' } },
        }
        expect(resolvePolicyLifecycle(extracted, now).endDate?.getUTCFullYear()).toBe(2026)
    })

    it('still falls back to the column when nothing better exists', () => {
        const plain = {
            status: 'active',
            policyNumber: 'P-3',
            insurerName: 'ΕΘΝΙΚΗ',
            endDate: new Date('2026-11-30T00:00:00Z'),
            acordData: {},
        }
        expect(resolvePolicyLifecycle(plain, now).endDate?.getUTCFullYear()).toBe(2026)
    })
})
