/**
 * Why a document in a bulk upload did not become a policy.
 *
 * ## Why this exists
 *
 * Every failure in the batch pipeline used to arrive at the user as one string:
 * «Η αποθήκευση ασφαλιστηρίων απέτυχε» — "saving policies failed". It said so
 * even when nothing had been saved, nothing had been parsed, and the file had
 * never been opened. Three separate defects conspired:
 *
 * 1. The modal threw away the server's error body on any non-OK response
 *    (`throw new Error(response.statusText)`), and on HTTP/2 — which is what
 *    Vercel serves — `statusText` is ALWAYS the empty string. So a 429, a 503
 *    and a 400 all collapsed into one indistinguishable literal.
 * 2. `mapWalletErrorToMessage`'s fallback for the `batchUpload` context is
 *    `saveFailed`. Anything it could not pattern-match on was therefore
 *    reported as a *save* failure regardless of which stage actually failed.
 * 3. The per-minute limiter answers with `{ error: { code } }` — a nested
 *    OBJECT — while `normalizeError` returns "" for anything that is not a
 *    string or an Error. Even reading the body would not have helped.
 *
 * The cure is a vocabulary both ends share: the server names the failure, the
 * client renders it. Neither invents prose for the other.
 *
 * ## What is deliberately NOT here
 *
 * Codes for failures this pipeline cannot actually produce. A generic taxonomy
 * would list OCR_FAILED; nothing in this stack runs an OCR pass, so an
 * unreadable file comes back as an extraction failure with no evidence, which
 * is `DOCUMENT_NOT_RECOGNIZED`. Inventing finer codes than the pipeline can
 * distinguish would put words in the product's mouth, which is the exact
 * failure being fixed.
 *
 * `FILE_PASSWORD_PROTECTED` was on that list until 2026-08-21, for the same
 * reason: nothing opened the PDF, so an encrypted one was indistinguishable
 * from any other failed extraction. That premise changed. `validateUploadFile`
 * now reads the PDF trailer and rejects an `/Encrypt` declaration BEFORE the
 * upload, so the distinction is evidence rather than a guess — and the
 * customer gets a fixable instruction in seconds instead of a mysterious
 * failure twenty minutes later.
 */

/** The stage that rejected the document. Ordered as the pipeline runs. */
export const BATCH_STAGES = [
    /** Size, extension, declared type and magic bytes — before any spend. */
    'validation',
    /** Plan limits and rate limits. Nothing wrong with the file. */
    'quota',
    /** The AI extraction call itself. */
    'extraction',
    /** Is there a policy in this document at all? */
    'recognition',
    /** There is a policy, but a field the wallet requires is absent or unusable. */
    'data_quality',
    /** The policy is fine; it conflicts with something already in the portfolio. */
    'portfolio',
    /** Writing the row. */
    'persistence',
    /** The request never completed a round trip. */
    'network',
] as const

export type BatchStage = (typeof BATCH_STAGES)[number]

export type BatchFailureSeverity =
    /** Something broke. */
    | 'error'
    /** The document is intact; we could not use it as-is. */
    | 'warning'
    /** Working as intended — the user simply does not need to do this. */
    | 'info'
    /** Blocked by the plan, not by a defect. */
    | 'upgrade'

export interface BatchFailureSpec {
    stage: BatchStage
    /** Whether to OFFER the user a retry button. */
    retryable: boolean
    /**
     * Whether the client should retry transparently, without being asked.
     *
     * Reserved for failures that are certain to be transient AND certain to
     * clear on their own. A throttle clears when its window rolls; a missing
     * policy number never does, and retrying it just burns another AI call.
     */
    autoRetry: boolean
    severity: BatchFailureSeverity
}

export const BATCH_FAILURE_SPECS = {
    // ---- validation: decided locally or by validateUploadFile, no AI spend ----
    FILE_EMPTY: { stage: 'validation', retryable: false, autoRetry: false, severity: 'warning' },
    FILE_TOO_LARGE: { stage: 'validation', retryable: false, autoRetry: false, severity: 'warning' },
    UNSUPPORTED_FORMAT: { stage: 'validation', retryable: false, autoRetry: false, severity: 'warning' },
    // Not retryable and not a defect: the customer must supply a different
    // file. `warning` rather than `error` because nothing went wrong.
    FILE_PASSWORD_PROTECTED: { stage: 'validation', retryable: false, autoRetry: false, severity: 'warning' },
    /** Magic bytes disagree with the extension: renamed, truncated or corrupt. */
    FILE_UNREADABLE: { stage: 'validation', retryable: false, autoRetry: false, severity: 'warning' },
    FILE_REJECTED_SECURITY: { stage: 'validation', retryable: false, autoRetry: false, severity: 'error' },

    // ---- quota ----
    /**
     * The per-minute extract allowance. THE historical root cause: the modal
     * accepted ten files and fired them at once against a six-per-minute limit,
     * so four of every ten were rejected before a single PDF was opened. The
     * capacity invariant in batch-upload-capacity.test.ts now prevents it, and
     * this stays auto-retryable as the belt to that braces.
     */
    BATCH_THROTTLED: { stage: 'quota', retryable: true, autoRetry: true, severity: 'warning' },
    /** The 30/day billable-call backstop. Will not clear inside this session. */
    DAILY_LIMIT_REACHED: { stage: 'quota', retryable: false, autoRetry: false, severity: 'warning' },
    POLICY_LIMIT_REACHED: { stage: 'quota', retryable: false, autoRetry: false, severity: 'upgrade' },
    // Not retryable by re-uploading: the user must grant AI-processing consent
    // first. Retrying the same file without consent would fail identically.
    AI_CONSENT_REQUIRED: { stage: 'validation', retryable: false, autoRetry: false, severity: 'warning' },

    // ---- extraction ----
    AI_UNAVAILABLE: { stage: 'extraction', retryable: true, autoRetry: false, severity: 'error' },
    AI_TIMEOUT: { stage: 'extraction', retryable: true, autoRetry: false, severity: 'error' },
    AI_EXTRACTION_FAILED: { stage: 'extraction', retryable: true, autoRetry: false, severity: 'error' },

    // ---- validation, continued: what the document gate reads locally ----
    // (lib/ingestion/document-gate.ts — BEFORE storage, BEFORE any model call.)
    /** More pages than MAX_DOCUMENT_PAGES. Refused before a page is read. */
    TOO_MANY_PAGES: { stage: 'validation', retryable: false, autoRetry: false, severity: 'warning' },
    /** A well-formed PDF with no pages. */
    NO_READABLE_CONTENT: { stage: 'validation', retryable: false, autoRetry: false, severity: 'warning' },
    /** The same bytes are already in this wallet (PolicyDocument.documentHash). */
    DUPLICATE_DOCUMENT: { stage: 'portfolio', retryable: false, autoRetry: false, severity: 'info' },
    /** Too many rejected uploads in the last hour. Clears on its own. */
    UPLOAD_REJECTIONS_THROTTLED: { stage: 'quota', retryable: true, autoRetry: false, severity: 'warning' },

    // ---- recognition: the document is readable and is not a policy ----
    /**
     * Not about insurance at all — a menu, a statement, a CV. Decided by the
     * document gate from the text itself, with no model involved.
     */
    NOT_AN_INSURANCE_DOCUMENT: { stage: 'recognition', retryable: false, autoRetry: false, severity: 'warning' },
    /** Classified as a booklet, a form, an invoice — see document-kind.ts. */
    NOT_AN_INSURANCE_POLICY: { stage: 'recognition', retryable: false, autoRetry: false, severity: 'warning' },
    /** Nothing identifying at all: no number, no party, no period. */
    DOCUMENT_NOT_RECOGNIZED: { stage: 'recognition', retryable: false, autoRetry: false, severity: 'warning' },
    /**
     * The document is an insurance policy of a DIFFERENT branch than the one
     * selected (a health schedule declared as motor). Not a defect in the
     * file: the person changes the type and resubmits.
     */
    BRANCH_MISMATCH: { stage: 'recognition', retryable: false, autoRetry: false, severity: 'warning' },
    /**
     * An insurance policy whose branch the gate could not confirm against the
     * selected one. Resolvable: the person confirms the type or changes it.
     */
    BRANCH_UNCONFIRMED: { stage: 'recognition', retryable: false, autoRetry: false, severity: 'info' },
    /**
     * Plausibly insurance, not certainly a policy (a thin page, a scan the
     * gate could not classify). Resolvable: the person confirms it is one.
     */
    DOCUMENT_REVIEW_REQUIRED: { stage: 'recognition', retryable: false, autoRetry: false, severity: 'info' },

    // ---- data quality ----
    REQUIRED_DATA_MISSING: { stage: 'data_quality', retryable: false, autoRetry: false, severity: 'warning' },
    INVALID_POLICY_PERIOD: { stage: 'data_quality', retryable: false, autoRetry: false, severity: 'warning' },

    // ---- portfolio ----
    DUPLICATE_POLICY: { stage: 'portfolio', retryable: false, autoRetry: false, severity: 'info' },

    // ---- persistence ----
    PERSISTENCE_FAILED: { stage: 'persistence', retryable: true, autoRetry: false, severity: 'error' },
    /**
     * The policy was created; attaching its source document was not.
     *
     * Deliberately its own code rather than folding into PERSISTENCE_FAILED,
     * because the remedy is different and so is the damage: nothing needs
     * re-extracting and nothing must be re-created — retrying re-sends only the
     * file. Telling the user "saving failed" here would be the same lie this
     * whole vocabulary exists to stop, since the policy is already in the wallet.
     */
    DOCUMENT_UPLOAD_FAILED: { stage: 'persistence', retryable: true, autoRetry: false, severity: 'warning' },

    // ---- transport ----
    NETWORK_ERROR: { stage: 'network', retryable: true, autoRetry: false, severity: 'error' },

    /**
     * Genuinely unclassified. Retryable by hand but never automatically — an
     * unknown cause is not evidence of a transient one.
     */
    UNKNOWN_ERROR: { stage: 'extraction', retryable: true, autoRetry: false, severity: 'error' },
} as const satisfies Record<string, BatchFailureSpec>

export type BatchFailureCode = keyof typeof BATCH_FAILURE_SPECS

export const BATCH_FAILURE_CODES = Object.keys(BATCH_FAILURE_SPECS) as BatchFailureCode[]

export function isBatchFailureCode(value: unknown): value is BatchFailureCode {
    return typeof value === 'string' && value in BATCH_FAILURE_SPECS
}

export function specFor(code: BatchFailureCode): BatchFailureSpec {
    return BATCH_FAILURE_SPECS[code]
}

/**
 * Extra facts safe to show the user.
 *
 * Everything here is either the user's own data or a closed vocabulary. No
 * exception messages, no provider names, no SQL, no stack frames — the server
 * logs those against the correlation id instead.
 */
export interface BatchFailureContext {
    /** Which kind of document it turned out to be (NOT_AN_INSURANCE_POLICY). */
    documentKind?: string
    /** The gate's own type vocabulary (lib/ingestion/types.ts DocumentType). */
    documentType?: string
    /** Branch FAMILY the gate detected (BRANCH_MISMATCH / BRANCH_UNCONFIRMED), as a write-branch id. */
    detectedBranch?: string
    /** The branch the person selected. */
    declaredBranch?: string
    /** Field names the wallet needed and the document did not state. */
    missingFields?: string[]
    /** Seconds until a throttle clears. */
    retryAfterSeconds?: number
    /** The policy this document duplicates — the user's own row. */
    existingPolicyId?: string
    /** Ties this failure to the server logs without exposing anything about them. */
    correlationId?: string
}

export interface BatchFailure {
    code: BatchFailureCode
    stage: BatchStage
    retryable: boolean
    autoRetry: boolean
    severity: BatchFailureSeverity
    context?: BatchFailureContext
}

/** Builds the full failure record from a code, so stage/retryability cannot drift. */
export function buildFailure(
    code: BatchFailureCode,
    context?: BatchFailureContext
): BatchFailure {
    const spec = BATCH_FAILURE_SPECS[code]
    return {
        code,
        stage: spec.stage,
        retryable: spec.retryable,
        autoRetry: spec.autoRetry,
        severity: spec.severity,
        ...(context && Object.keys(context).length > 0 ? { context } : {}),
    }
}

/** `validateUploadFile`'s rejection reasons, mapped onto this vocabulary. */
export const UPLOAD_REJECTION_TO_CODE: Record<string, BatchFailureCode> = {
    empty: 'FILE_EMPTY',
    too_large: 'FILE_TOO_LARGE',
    illegal_filename: 'UNSUPPORTED_FORMAT',
    double_extension: 'UNSUPPORTED_FORMAT',
    bad_extension: 'UNSUPPORTED_FORMAT',
    mime_mismatch: 'UNSUPPORTED_FORMAT',
    content_mismatch: 'FILE_UNREADABLE',
    infected: 'FILE_REJECTED_SECURITY',
    encrypted: 'FILE_PASSWORD_PROTECTED',
}

function readCode(payload: unknown): string | null {
    if (!payload || typeof payload !== 'object') return null
    const body = payload as Record<string, unknown>

    // Preferred shape, what this route now emits.
    if (typeof body.code === 'string') return body.code

    // `rateLimit()` and `createApiError()` nest under `error`. Shared helpers
    // used by dozens of routes — read them, do not rewrite them.
    const error = body.error
    if (error && typeof error === 'object' && typeof (error as any).code === 'string') {
        return (error as any).code
    }
    if (typeof error === 'string') return error

    return null
}

function readRetryAfterSeconds(headers?: Headers | null): number | undefined {
    if (!headers) return undefined
    const explicit = Number(headers.get('retry-after'))
    if (Number.isFinite(explicit) && explicit > 0) return Math.ceil(explicit)
    // Upstash sends an absolute epoch-ms reset instead of a delta.
    const reset = Number(headers.get('x-ratelimit-reset'))
    if (Number.isFinite(reset) && reset > 0) {
        const seconds = Math.ceil((reset - Date.now()) / 1000)
        if (seconds > 0 && seconds < 3600) return seconds
    }
    return undefined
}

/**
 * Turns an HTTP response into a failure code.
 *
 * Reads the body first and falls back to the status, because the status alone
 * cannot separate a per-minute throttle (clears in under a minute, retry it)
 * from the daily billable cap (will not clear today, do not) — both are 429.
 */
export function classifyExtractFailure(input: {
    status: number
    payload?: unknown
    headers?: Headers | null
}): BatchFailure {
    const { status, payload, headers } = input
    const raw = readCode(payload)

    if (raw && isBatchFailureCode(raw)) {
        return buildFailure(raw, {
            ...extractContext(payload),
            ...(raw === 'BATCH_THROTTLED'
                ? { retryAfterSeconds: readRetryAfterSeconds(headers) }
                : {}),
        })
    }

    // Legacy / shared-helper codes that predate this vocabulary.
    if (raw === 'TOO_MANY_REQUESTS') {
        return buildFailure('BATCH_THROTTLED', {
            retryAfterSeconds: readRetryAfterSeconds(headers),
        })
    }
    if (raw === 'RATE_LIMITED') return buildFailure('DAILY_LIMIT_REACHED')

    switch (status) {
        case 400:
            return buildFailure('UNSUPPORTED_FORMAT')
        case 401:
        case 403:
            return buildFailure('POLICY_LIMIT_REACHED')
        case 408:
            return buildFailure('AI_TIMEOUT')
        case 429:
            // Unlabelled 429: assume the recoverable one, since offering a retry
            // that fails again costs less than withholding one that would work.
            return buildFailure('BATCH_THROTTLED', {
                retryAfterSeconds: readRetryAfterSeconds(headers),
            })
        case 503:
        case 502:
        case 504:
            return buildFailure('AI_UNAVAILABLE')
        case 500:
            return buildFailure('AI_EXTRACTION_FAILED')
        default:
            return buildFailure('UNKNOWN_ERROR')
    }
}

function extractContext(payload: unknown): BatchFailureContext {
    if (!payload || typeof payload !== 'object') return {}
    const body = payload as Record<string, unknown>
    const source = (body.context && typeof body.context === 'object' ? body.context : body) as Record<string, unknown>
    const context: BatchFailureContext = {}

    if (typeof source.documentKind === 'string') context.documentKind = source.documentKind
    // The document gate's verdict (lib/ingestion/document-gate.ts).
    if (typeof source.documentType === 'string') context.documentType = source.documentType
    if (typeof source.detectedBranch === 'string') context.detectedBranch = source.detectedBranch
    if (typeof source.declaredBranch === 'string') context.declaredBranch = source.declaredBranch
    if (Array.isArray(source.missingFields)) {
        context.missingFields = source.missingFields.filter((f): f is string => typeof f === 'string')
    }
    if (typeof source.existingPolicyId === 'string') context.existingPolicyId = source.existingPolicyId
    if (typeof source.correlationId === 'string') context.correlationId = source.correlationId
    if (typeof source.retryAfterSeconds === 'number') context.retryAfterSeconds = source.retryAfterSeconds

    return context
}

/**
 * Classifies a thrown client-side error — a dropped connection, an aborted
 * request, a browser going offline mid-batch.
 */
export function classifyThrownError(error: unknown): BatchFailure {
    if (error instanceof DOMException && error.name === 'AbortError') {
        return buildFailure('NETWORK_ERROR')
    }
    if (error instanceof TypeError) {
        // `fetch` rejects with a TypeError for every transport-level failure.
        return buildFailure('NETWORK_ERROR')
    }
    const message = error instanceof Error ? error.message.toLowerCase() : String(error ?? '').toLowerCase()
    if (message.includes('timeout') || message.includes('timed out')) return buildFailure('AI_TIMEOUT')
    if (message.includes('network') || message.includes('fetch')) return buildFailure('NETWORK_ERROR')
    return buildFailure('UNKNOWN_ERROR')
}

/** Transparent retries before a failure is shown to the user at all. */
export const MAX_AUTO_RETRIES = 2
const DEFAULT_AUTO_RETRY_DELAY_MS = 4_000
const MAX_AUTO_RETRY_DELAY_MS = 20_000

/**
 * How long to wait before an automatic retry.
 *
 * Honours the server's own reset hint when it sent one — retrying into a window
 * that has not rolled yet just spends the attempt. Capped, because a limiter
 * asking for ten minutes is not something to sit through inside a modal.
 */
export function autoRetryDelayMs(failure: BatchFailure): number {
    const requested = (failure.context?.retryAfterSeconds ?? 0) * 1000
    return Math.min(MAX_AUTO_RETRY_DELAY_MS, requested > 0 ? requested : DEFAULT_AUTO_RETRY_DELAY_MS)
}

/** Failures worth offering a "retry all" for. */
export function retryableFailures<T extends { failure?: BatchFailure }>(items: T[]): T[] {
    return items.filter((item) => item.failure?.retryable)
}
