import { describe, expect, it } from 'vitest'

import {
    BATCH_FAILURE_CODES,
    BATCH_FAILURE_SPECS,
    MAX_AUTO_RETRIES,
    UPLOAD_REJECTION_TO_CODE,
    autoRetryDelayMs,
    buildFailure,
    classifyExtractFailure,
    classifyThrownError,
    isBatchFailureCode,
} from '@/lib/wallet/batch-upload-errors'
import { el } from '@/lib/i18n/translations/el'
import { en } from '@/lib/i18n/translations/en'

const headers = (init: Record<string, string>) => new Headers(init)

describe('every code answers what / why / what next, in both languages', () => {
    it('has Greek and English copy for every code, with no empty strings', () => {
        for (const code of BATCH_FAILURE_CODES) {
            for (const [name, dict] of [['el', el], ['en', en]] as const) {
                const entry = (dict.wallet.batchUpload.failures as Record<string, any>)[code]
                expect(entry, `${name} is missing copy for ${code}`).toBeTruthy()
                // title = what happened, detail = why, action = what next.
                // A failure card that cannot answer all three is the defect.
                expect(entry.title.length, `${name}.${code}.title`).toBeGreaterThan(0)
                expect(entry.detail.length, `${name}.${code}.detail`).toBeGreaterThan(0)
                expect(entry.action.length, `${name}.${code}.action`).toBeGreaterThan(0)
            }
        }
    })

    it('has a label for every stage a failure can carry', () => {
        for (const code of BATCH_FAILURE_CODES) {
            const stage = BATCH_FAILURE_SPECS[code].stage
            expect((el.wallet.batchUpload.stages as Record<string, string>)[stage]).toBeTruthy()
            expect((en.wallet.batchUpload.stages as Record<string, string>)[stage]).toBeTruthy()
        }
    })

    it('never tells the user a document failed to SAVE when it never reached saving', () => {
        // The shipped bug in one assertion: extraction-stage failures used to
        // render `saveFailed`. Nothing outside the persistence stage may reuse
        // that sentence.
        const saveFailed = el.wallet.batchUpload.saveFailed
        for (const code of BATCH_FAILURE_CODES) {
            if (BATCH_FAILURE_SPECS[code].stage === 'persistence') continue
            const entry = (el.wallet.batchUpload.failures as Record<string, any>)[code]
            expect(entry.title, `${code} reuses the save-failure sentence`).not.toBe(saveFailed)
        }
    })
})

describe('retryability follows the cause, not the mood', () => {
    it('offers a retry for every transient failure', () => {
        for (const code of ['BATCH_THROTTLED', 'AI_TIMEOUT', 'AI_UNAVAILABLE', 'NETWORK_ERROR', 'PERSISTENCE_FAILED'] as const) {
            expect(BATCH_FAILURE_SPECS[code].retryable, code).toBe(true)
        }
    })

    it('refuses to retry what a retry cannot fix', () => {
        // Re-running the model on the same bytes produces the same absent
        // policy number, and spends another billable call to do it.
        for (const code of [
            'DUPLICATE_POLICY',
            'REQUIRED_DATA_MISSING',
            'NOT_AN_INSURANCE_POLICY',
            'DOCUMENT_NOT_RECOGNIZED',
            'UNSUPPORTED_FORMAT',
            'FILE_TOO_LARGE',
            'FILE_EMPTY',
            'POLICY_LIMIT_REACHED',
        ] as const) {
            expect(BATCH_FAILURE_SPECS[code].retryable, code).toBe(false)
        }
    })

    it('auto-retries ONLY the failure that clears on its own', () => {
        const auto = BATCH_FAILURE_CODES.filter((code) => BATCH_FAILURE_SPECS[code].autoRetry)
        expect(auto).toEqual(['BATCH_THROTTLED'])
    })

    it('never marks a failure auto-retryable without also making it retryable', () => {
        for (const code of BATCH_FAILURE_CODES) {
            const spec = BATCH_FAILURE_SPECS[code]
            if (spec.autoRetry) expect(spec.retryable, code).toBe(true)
        }
    })

    it('honours a server reset hint over the default delay, but caps it', () => {
        expect(autoRetryDelayMs(buildFailure('BATCH_THROTTLED'))).toBe(4_000)
        expect(autoRetryDelayMs(buildFailure('BATCH_THROTTLED', { retryAfterSeconds: 9 }))).toBe(9_000)
        // A limiter asking for ten minutes is not something to sit through.
        expect(autoRetryDelayMs(buildFailure('BATCH_THROTTLED', { retryAfterSeconds: 600 }))).toBe(20_000)
    })

    it('retries a bounded number of times', () => {
        expect(MAX_AUTO_RETRIES).toBeGreaterThan(0)
        expect(MAX_AUTO_RETRIES).toBeLessThanOrEqual(3)
    })
})

describe('classifying what the server actually sends', () => {
    it('separates the per-minute throttle from the daily spend cap — both are 429', () => {
        // This distinction is the difference between "try again in a moment"
        // and "try again tomorrow". Status alone cannot make it.
        const throttled = classifyExtractFailure({
            status: 429,
            payload: { error: { code: 'TOO_MANY_REQUESTS' } },
        })
        expect(throttled.code).toBe('BATCH_THROTTLED')
        expect(throttled.autoRetry).toBe(true)

        const daily = classifyExtractFailure({ status: 429, payload: { error: 'RATE_LIMITED' } })
        expect(daily.code).toBe('DAILY_LIMIT_REACHED')
        expect(daily.autoRetry).toBe(false)
    })

    it('reads the nested shape the shared rate limiter emits', () => {
        // `{ error: { code } }` — an OBJECT. `normalizeError` returned "" for
        // this, which is the third of the three defects that produced the
        // generic message.
        const failure = classifyExtractFailure({
            status: 429,
            payload: { error: { code: 'TOO_MANY_REQUESTS', message: 'Rate limit exceeded.', status: 429 } },
        })
        expect(failure.code).toBe('BATCH_THROTTLED')
    })

    it('reads the flat code this route emits', () => {
        const failure = classifyExtractFailure({
            status: 422,
            payload: { success: false, code: 'NOT_AN_INSURANCE_POLICY', context: { documentKind: 'forms' } },
        })
        expect(failure.code).toBe('NOT_AN_INSURANCE_POLICY')
        expect(failure.stage).toBe('recognition')
        expect(failure.context?.documentKind).toBe('forms')
    })

    it('carries the missing field names through, so the card can name them', () => {
        const failure = classifyExtractFailure({
            status: 422,
            payload: { code: 'REQUIRED_DATA_MISSING', context: { missingFields: ['policyNumber'] } },
        })
        expect(failure.context?.missingFields).toEqual(['policyNumber'])
    })

    it('derives a retry delay from Retry-After', () => {
        const failure = classifyExtractFailure({
            status: 429,
            payload: { error: { code: 'TOO_MANY_REQUESTS' } },
            headers: headers({ 'retry-after': '12' }),
        })
        expect(failure.context?.retryAfterSeconds).toBe(12)
    })

    it('derives one from Upstash’s absolute reset stamp too', () => {
        const failure = classifyExtractFailure({
            status: 429,
            payload: { error: { code: 'TOO_MANY_REQUESTS' } },
            headers: headers({ 'x-ratelimit-reset': String(Date.now() + 8_000) }),
        })
        expect(failure.context?.retryAfterSeconds).toBeGreaterThan(0)
        expect(failure.context?.retryAfterSeconds).toBeLessThanOrEqual(9)
    })

    it('falls back on status when the body is unreadable', () => {
        // An HTML error page from an edge proxy parses to null, and the user
        // still deserves a truthful category.
        expect(classifyExtractFailure({ status: 503, payload: null }).code).toBe('AI_UNAVAILABLE')
        expect(classifyExtractFailure({ status: 500, payload: null }).code).toBe('AI_EXTRACTION_FAILED')
        expect(classifyExtractFailure({ status: 413, payload: null }).code).toBe('UNKNOWN_ERROR')
    })

    it('treats an unlabelled 429 as the recoverable one', () => {
        expect(classifyExtractFailure({ status: 429, payload: {} }).code).toBe('BATCH_THROTTLED')
    })

    it('never invents context that was not sent', () => {
        const failure = classifyExtractFailure({ status: 500, payload: { code: 'AI_EXTRACTION_FAILED' } })
        expect(failure.context).toBeUndefined()
    })
})

describe('classifying failures that never reached the server', () => {
    it('calls a dropped fetch a connection problem, not an extraction problem', () => {
        // `fetch` rejects with TypeError for every transport-level failure —
        // offline, DNS, CORS, connection reset mid-batch.
        const failure = classifyThrownError(new TypeError('Failed to fetch'))
        expect(failure.code).toBe('NETWORK_ERROR')
        expect(failure.stage).toBe('network')
        expect(failure.retryable).toBe(true)
    })

    it('recognises an abort', () => {
        expect(classifyThrownError(new DOMException('aborted', 'AbortError')).code).toBe('NETWORK_ERROR')
    })

    it('recognises a timeout by message', () => {
        expect(classifyThrownError(new Error('AI call timed out after 120000ms')).code).toBe('AI_TIMEOUT')
    })

    it('does not guess when it cannot tell', () => {
        const failure = classifyThrownError(new Error('something odd'))
        expect(failure.code).toBe('UNKNOWN_ERROR')
        // Retryable by hand, never automatically: an unknown cause is not
        // evidence of a transient one.
        expect(failure.autoRetry).toBe(false)
        expect(failure.retryable).toBe(true)
    })
})

describe('the file-validation vocabulary maps onto this one', () => {
    it('covers every rejection reason validateUploadFile can return', async () => {
        const { REJECTION_MESSAGES } = await import('@/lib/security/file-upload')
        for (const reason of Object.keys(REJECTION_MESSAGES)) {
            const code = UPLOAD_REJECTION_TO_CODE[reason]
            expect(code, `no code for rejection reason "${reason}"`).toBeTruthy()
            expect(isBatchFailureCode(code)).toBe(true)
        }
    })

    it('keeps a corrupt-or-renamed file distinct from an unsupported one', () => {
        // Different sentences, different remedies: convert the file vs check it
        // opens at all.
        expect(UPLOAD_REJECTION_TO_CODE.content_mismatch).toBe('FILE_UNREADABLE')
        expect(UPLOAD_REJECTION_TO_CODE.bad_extension).toBe('UNSUPPORTED_FORMAT')
    })
})

describe('buildFailure keeps stage and retryability in one place', () => {
    it('derives them from the code rather than the call site', () => {
        const failure = buildFailure('DUPLICATE_POLICY', { existingPolicyId: 'p_1' })
        expect(failure).toMatchObject({
            code: 'DUPLICATE_POLICY',
            stage: 'portfolio',
            retryable: false,
            severity: 'info',
            context: { existingPolicyId: 'p_1' },
        })
    })

    it('omits an empty context rather than carrying a hollow object', () => {
        expect(buildFailure('AI_TIMEOUT', {}).context).toBeUndefined()
    })
})
