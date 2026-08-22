/**
 * E2E test accounts — provisioned idempotently by tests/global-setup.ts
 * against the local-dev Supabase project (both auth.users and the Prisma
 * User row). The UI is used for login only; never for registration.
 */

export const E2E_POLICYHOLDER = {
    email: 'e2e-ph@policywallet.test',
    password: 'E2ePolicyholder!2026',
    name: 'E2E Policyholder',
    role: 'policyholder' as const,
}

export const E2E_AGENT = {
    email: 'e2e-agent@policywallet.test',
    password: 'E2eAgent!2026',
    name: 'E2E Agent',
    role: 'agent' as const,
}

/**
 * FREE-TIER policyholder fixture.
 *
 * `E2E_POLICYHOLDER` holds an active `ph-pro` (Family) subscription, which was
 * discovered the hard way: the Goal 0 policy-detail baseline was captured
 * believing that account was free, so the free-only surfaces — the locked gap
 * report and its €3 unlock CTA, the PDF-preview lock, the premium-insight
 * upsell cards, the sidebar upgrade banner, the free-questions trigger — were
 * never rendered in 18 captures. A restructure cannot relocate a capability it
 * has never seen.
 *
 * This account is defined by what it does NOT have: `resolveUserEntitlements`
 * returns `free` for any user with no live non-agent subscription, so
 * global-setup provisions the user and deletes any policyholder subscription
 * row rather than creating one.
 */
export const E2E_POLICYHOLDER_FREE = {
    email: 'e2e-ph-free@policywallet.test',
    password: 'E2ePolicyholderFree!2026',
    name: 'E2E Free Policyholder',
    role: 'policyholder' as const,
}

/**
 * DASHBOARD fixture.
 *
 * Portfolio state — empty / single / typical / heavy / all-expired — is a
 * property of the USER's whole wallet, not of a policy, so the dashboard matrix
 * cannot be built the way the policy-detail one was. This account exists to
 * have its wallet REBUILT between captures, which is why it is separate: doing
 * that to `E2E_POLICYHOLDER` would destroy the policy-detail fixtures every
 * time the dashboard suite ran.
 */
export const E2E_POLICYHOLDER_DASH = {
    email: 'e2e-ph-dash@policywallet.test',
    password: 'E2ePolicyholderDash!2026',
    name: 'E2E Dashboard Policyholder',
    role: 'policyholder' as const,
}

/**
 * Admin fixture. Without it, the 14 /admin/* routes were audited no further
 * than their redirect — 29 of 108 routes covered only as a bounce. Admin is
 * gated by BOTH the JWT metadata role and the DB roles column, and
 * provisionUser writes both, so this is enough to reach them.
 */
export const E2E_ADMIN = {
    email: 'e2e-admin@policywallet.test',
    password: 'E2eAdmin!2026',
    name: 'E2E Admin',
    role: 'admin' as const,
}
