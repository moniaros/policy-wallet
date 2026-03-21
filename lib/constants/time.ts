// ─── Centralized time constants ───
// All durations in one place. Never inline magic numbers.

export const INVITE_EXPIRY_DAYS = 7
export const TRIAL_PERIOD_DAYS = 30
export const SUBSCRIPTION_PERIOD_DAYS = 30
export const POLICY_SHARE_EXPIRY_DAYS = 7
export const DEFAULT_POLICY_DURATION_DAYS = 365
export const SIGNED_URL_EXPIRY_MS = 3_600_000      // 1 hour
export const COMPLETION_ESTIMATE_MS = 120_000       // 2 minutes

// ─── Helpers ───

const DAY_MS = 24 * 60 * 60 * 1000

export function daysFromNow(days: number): Date {
    return new Date(Date.now() + days * DAY_MS)
}

export function msFromNow(ms: number): Date {
    return new Date(Date.now() + ms)
}
