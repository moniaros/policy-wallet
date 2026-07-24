import { describe, it, expect } from 'vitest'
import { apiErrorMessage } from '@/lib/api-error-copy'
import { el } from '@/lib/i18n/translations/el'
import { en } from '@/lib/i18n/translations/en'

const copy = {
    unauthorized: 'U', forbidden: 'F', notFound: 'N',
    validation: 'V', unavailable: 'S', generic: 'G',
}

/**
 * `createApiError(code, message)` builds `message` for developers and logs —
 * "Invalid thread payload", "Failed to list collaboration threads", "Forbidden".
 * Clients rendered it with `toast.error(json?.error?.message || t.translated)`,
 * where the raw English always wins, so on a Greek-default product the
 * translated copy beside it was dead code. The `code` is the stable,
 * language-independent half of the contract; map from that instead.
 */
describe('API errors are shown in the reader’s language', () => {
    it('maps each stable code to translated copy', () => {
        expect(apiErrorMessage({ error: { code: 'UNAUTHORIZED' } }, copy)).toBe('U')
        expect(apiErrorMessage({ error: { code: 'FORBIDDEN' } }, copy)).toBe('F')
        expect(apiErrorMessage({ error: { code: 'NOT_FOUND' } }, copy)).toBe('N')
        expect(apiErrorMessage({ error: { code: 'VALIDATION_ERROR' } }, copy)).toBe('V')
        expect(apiErrorMessage({ error: { code: 'BAD_REQUEST' } }, copy)).toBe('V')
        expect(apiErrorMessage({ error: { code: 'SERVICE_UNAVAILABLE' } }, copy)).toBe('S')
    })

    it('never returns the server’s developer-facing message', () => {
        const envelope = { error: { code: 'VALIDATION_ERROR', message: 'Invalid thread payload' } }
        expect(apiErrorMessage(envelope, copy)).not.toContain('Invalid thread payload')
    })

    it('prefers the operation-specific line over a bare generic for unknown codes', () => {
        expect(apiErrorMessage({ error: { code: 'INTERNAL_ERROR' } }, copy, 'could not load')).toBe('could not load')
        expect(apiErrorMessage({ error: { code: 'INTERNAL_ERROR' } }, copy)).toBe('G')
    })

    it('survives a body with no error envelope at all (a dropped connection)', () => {
        expect(apiErrorMessage(null, copy, 'fallback')).toBe('fallback')
        expect(apiErrorMessage(undefined, copy)).toBe('G')
    })

    it('ships the copy in both languages, in Greek for el', () => {
        for (const key of ['unauthorized', 'forbidden', 'notFound', 'validation', 'unavailable', 'generic'] as const) {
            expect(el.apiErrors[key], `el.apiErrors.${key}`).toBeTruthy()
            expect(en.apiErrors[key], `en.apiErrors.${key}`).toBeTruthy()
            // The Greek copy must actually be Greek — an untranslated English
            // string here would reintroduce the exact bug this replaces.
            expect(el.apiErrors[key]).toMatch(/[Ͱ-Ͽ]/)
        }
    })
})
