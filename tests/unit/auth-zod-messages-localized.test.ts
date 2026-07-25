import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * The reset-password and forgot-password pages render Zod validation errors
 * verbatim (errors.*.message), so hardcoded English Zod messages ("Use at least
 * 8 characters", "Passwords do not match", "Please provide a valid email
 * address") shipped to Greek users on the password-recovery flow.
 * lint:i18n-changed doesn't inspect Zod `.min(n, "…")` / `.email("…")` message
 * args. Both now build a lang-aware schema from localised copy. (SignupForm
 * already used the correct key-plus-map pattern via getZodError.)
 */
const RESET = readFileSync('app/auth/reset-password/page.tsx', 'utf-8')
const FORGOT = readFileSync('app/auth/forgot-password/page.tsx', 'utf-8')

describe('auth Zod validation messages are localised', () => {
    it('reset-password uses a lang-aware schema, no hardcoded English messages', () => {
        expect(RESET).toContain('buildResetSchema(')
        expect(RESET).not.toMatch(/\.min\(8,\s*["']Use at least/)
        expect(RESET).not.toMatch(/message:\s*["']Passwords do not match["']/)
    })

    it('forgot-password uses a lang-aware schema, no hardcoded English email message', () => {
        expect(FORGOT).toContain('buildForgotSchema(')
        expect(FORGOT).not.toMatch(/\.email\(["']Please provide a valid email address/)
    })
})
