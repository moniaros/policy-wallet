/**
 * Renewal reminder milestones, in a client-safe module.
 *
 * The cron (`lib/services/renewal.service.ts`) and every surface that PROMISES a
 * reminder cadence must read the same constants — a promise sourced anywhere
 * else can drift from what the job actually sends. Client components cannot
 * import the service (it imports `db`), which is why the constants live here.
 */

// Milestone days before policy expiry when reminders are sent
export const RENEWAL_MILESTONES = [90, 60, 30, 15, 7] as const
// Free plan floor (owner-approved, conversion audit 2026-07): one basic
// reminder at 30 days; the full milestone ladder is a paid feature
// (advanced_renewal_reminders / notifications entitlement).
export const BASIC_MILESTONES = [30] as const
export type Milestone = (typeof RENEWAL_MILESTONES)[number]
