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
