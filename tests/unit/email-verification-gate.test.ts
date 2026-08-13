/**
 * The email-verification hard gate.
 *
 * The switch moved into the feature-flag layer so it can be turned on without a
 * redeploy. What these tests pin is that the move changed nothing: with no
 * database row the gate still resolves through ENFORCE_EMAIL_VERIFICATION and
 * then to OFF. Getting this wrong locks every unverified customer out of the
 * product, so "unchanged" is the property worth asserting.
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import { emailVerificationRequired } from '@/lib/auth-helpers'

// Pass through so each call re-reads the environment.
vi.mock('next/cache', () => ({
    unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
    revalidateTag: vi.fn(),
    revalidatePath: vi.fn(),
}))
// No rows — the "nobody has touched the console" path.
vi.mock('@/lib/db', () => ({
    db: { featureFlag: { findMany: async () => [] } },
}))
vi.mock('@/lib/logger', () => ({ logger: vi.fn() }))

const saved = process.env.ENFORCE_EMAIL_VERIFICATION
afterEach(() => {
    if (saved === undefined) delete process.env.ENFORCE_EMAIL_VERIFICATION
    else process.env.ENFORCE_EMAIL_VERIFICATION = saved
})

describe('emailVerificationRequired', () => {
    it('is off by default (flag unset) even for an unverified user', async () => {
        delete process.env.ENFORCE_EMAIL_VERIFICATION
        expect(await emailVerificationRequired({ emailVerified: null })).toBe(false)
    })

    it('blocks an unverified user when the flag is enabled', async () => {
        process.env.ENFORCE_EMAIL_VERIFICATION = '1'
        expect(await emailVerificationRequired({ emailVerified: null })).toBe(true)
    })

    it('passes a verified user when enabled (incl. phone-only auto-verified)', async () => {
        process.env.ENFORCE_EMAIL_VERIFICATION = '1'
        expect(await emailVerificationRequired({ emailVerified: new Date() })).toBe(false)
    })

    it('never blocks a null user (unauthenticated is handled upstream)', async () => {
        process.env.ENFORCE_EMAIL_VERIFICATION = '1'
        expect(await emailVerificationRequired(null)).toBe(false)
    })
})
