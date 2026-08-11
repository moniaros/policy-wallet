// ─── Centralized time constants ───
// All durations in one place. Never inline magic numbers.

// ─── File upload limits ───
// Used by all upload paths (single, onboarding, batch) to enforce consistent rules.
export const MAX_UPLOAD_SIZE_BYTES = 15 * 1024 * 1024 // 15 MB
export const ALLOWED_UPLOAD_MIME_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
] as const

// ─── Bulk policy upload ───
//
// These three are one decision, not three, and separating them cost the product
// four documents out of every ten. The modal advertised ten files and fired all
// ten at once; the extract route allowed six a minute. Four were rejected with a
// 429 before any PDF was opened — reproducibly, every batch, and reported to the
// user as "saving policies failed". Production activity logs show exactly six
// extractions per attempt across four separate batches.
//
// The invariant — per-minute allowance >= advertised batch size — is pinned by
// tests/unit/batch-upload-capacity.test.ts. Raise the batch size and that test
// fails until the allowance follows.

/** Documents accepted in one bulk upload. The number shown in the UI copy. */
export const BATCH_UPLOAD_MAX_FILES = 10

/**
 * Extract requests the client keeps in flight at once.
 *
 * Ten concurrent multimodal calls is a thundering herd at the AI provider and
 * makes per-file progress meaningless — everything sits at 0% and then finishes
 * together. A small window keeps the queue visibly draining.
 */
export const BATCH_UPLOAD_CONCURRENCY = 3

/**
 * Per-minute policy-extract allowance, per user.
 *
 * Sized as one full batch plus headroom for retrying part of it inside the same
 * minute. Burst protection lives here; SPEND protection is the separate 30/day
 * DB-backed backstop in the route, which this does not weaken.
 */
export const POLICY_EXTRACT_PER_MINUTE_LIMIT = BATCH_UPLOAD_MAX_FILES + 5

export const POLICY_EXTRACT_RATE_WINDOW_MS = 60_000

export const INVITE_EXPIRY_DAYS = 7
export const TRIAL_PERIOD_DAYS = 30
export const SUBSCRIPTION_PERIOD_DAYS = 30
export const POLICY_SHARE_EXPIRY_DAYS = 7
export const DEFAULT_POLICY_DURATION_DAYS = 365
export const SIGNED_URL_EXPIRY_MS = 3_600_000      // 1 hour
// View/download links handed to the browser — short-lived on purpose; the
// authorized GET endpoint mints a fresh one per request.
export const DOWNLOAD_SIGNED_URL_EXPIRY_SECONDS = 300 // 5 minutes
export const COMPLETION_ESTIMATE_MS = 120_000       // 2 minutes

// ─── Helpers ───

const DAY_MS = 24 * 60 * 60 * 1000

export function daysFromNow(days: number): Date {
    return new Date(Date.now() + days * DAY_MS)
}

export function msFromNow(ms: number): Date {
    return new Date(Date.now() + ms)
}
