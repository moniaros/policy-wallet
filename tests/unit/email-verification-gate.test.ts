import { describe, it, expect, afterEach } from 'vitest'
import { emailVerificationRequired } from '@/lib/auth-helpers'

const saved = process.env.ENFORCE_EMAIL_VERIFICATION
afterEach(() => {
    if (saved === undefined) delete process.env.ENFORCE_EMAIL_VERIFICATION
    else process.env.ENFORCE_EMAIL_VERIFICATION = saved
})

describe('emailVerificationRequired', () => {
    it('is off by default (flag unset) even for an unverified user', () => {
        delete process.env.ENFORCE_EMAIL_VERIFICATION
        expect(emailVerificationRequired({ emailVerified: null })).toBe(false)
    })

    it('blocks an unverified user when the flag is enabled', () => {
        process.env.ENFORCE_EMAIL_VERIFICATION = '1'
        expect(emailVerificationRequired({ emailVerified: null })).toBe(true)
    })

    it('passes a verified user when enabled (incl. phone-only auto-verified)', () => {
        process.env.ENFORCE_EMAIL_VERIFICATION = '1'
        expect(emailVerificationRequired({ emailVerified: new Date() })).toBe(false)
    })

    it('never blocks a null user (unauthenticated is handled upstream)', () => {
        process.env.ENFORCE_EMAIL_VERIFICATION = '1'
        expect(emailVerificationRequired(null)).toBe(false)
    })
})
