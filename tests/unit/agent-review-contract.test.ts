import { describe, expect, it } from 'vitest'
import { approvalDigest, canDeliverRevision, sourceDigest } from '@/lib/agent/review-contract'
const draft = { body: 'Review the limit on page 2.', language: 'en', recipientUserId: 'customer-a', channel: 'collaboration', sourceDigest: 'v1' }
const approved = { ...draft, status: 'approved', approvalDigest: approvalDigest(draft) }
describe('exact approval boundary', () => {
    it('allows only the approved content, source, recipient and channel', () => {
        expect(canDeliverRevision(approved, 'v1')).toBe(true)
        for (const patch of [{ body: 'Buy this instead' }, { language: 'el' }, { recipientUserId: 'customer-b' }, { channel: 'email' }, { sourceDigest: 'v2' }, { status: 'draft' }, { approvalDigest: null }]) {
            expect(canDeliverRevision({ ...approved, ...patch }, 'v1')).toBe(false)
        }
        expect(canDeliverRevision(approved, 'v2')).toBe(false)
    })
    it('fingerprints nested source facts independently of object ordering', () => {
        expect(sourceDigest({ a: 1, b: { x: false, y: 2 } })).toBe(sourceDigest({ b: { y: 2, x: false }, a: 1 }))
        expect(sourceDigest({ a: [1, 2] })).not.toBe(sourceDigest({ a: [2, 1] }))
    })
})
