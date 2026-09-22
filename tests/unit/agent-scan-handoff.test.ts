import { afterEach, expect, it, vi } from 'vitest'
import { openScan, sealScan } from '@/lib/services/analysis/scan-handoff'
afterEach(() => vi.unstubAllEnvs())
it('binds reusable extraction to the actor, bytes, contract and expiry', () => {
    vi.stubEnv('AUTH_SECRET', 'unit-test-secret')
    const expected = { actorId: 'agent-a', hash: 'document-a', version: 'v1' }
    const extraction = { insurerName: 'Example', policyNumber: '123' } as any
    const token = sealScan({ ...expected, extraction }, 1000)!
    expect(openScan(token, expected, 1001)).toEqual(extraction)
    expect(openScan(token, { ...expected, actorId: 'agent-b' }, 1001)).toBeNull()
    expect(openScan(token, { ...expected, hash: 'other-file' }, 1001)).toBeNull()
    expect(openScan(token, { ...expected, version: 'v2' }, 1001)).toBeNull()
    expect(openScan(token, expected, 3601000)).toBeNull()
    expect(openScan(token.slice(0, -5) + 'abcde', expected, 1001)).toBeNull()
})
it('never substitutes unsigned artifacts when signing is unconfigured', () => {
    vi.stubEnv('AUTH_SECRET', '')
    vi.stubEnv('NEXTAUTH_SECRET', '')
    expect(sealScan({ actorId: 'a', hash: 'b', version: 'v1', extraction: {} as any })).toBeNull()
    expect(openScan('anything', { actorId: 'a', hash: 'b', version: 'v1' })).toBeNull()
})
