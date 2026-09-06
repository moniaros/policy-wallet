/**
 * Credential presence without the credential (PW-BRIDGE-01 A-01).
 *
 * The identity-twin rule (`lib/agent-consent.ts`) and the per-candidate AI
 * consent verdict (`deriveAiConsentState`) need one bit about an account: does
 * it hold a password credential at all. Until Sept 2026 eleven agent-facing
 * code paths answered that by SELECTing `users.password` — the hash itself —
 * into server components, service DTOs and, through props, a client component.
 * None rendered it; all of them loaded it. The column is null for every real
 * account (Supabase holds the credential), which made the load invisible and
 * pointless at once.
 *
 * This module is the ONE place that may read the column, and it reads it only
 * as `IS NOT NULL`. Everything else receives `hasPassword: boolean`. The guard
 * `tests/unit/password-column-never-loaded-outside-auth.test.ts` enumerates the
 * tree and fails on any other `password: true` select or raw read.
 */

import { Prisma } from "@prisma/client"

type RawQueryClient = {
    $queryRaw<T = unknown>(query: TemplateStringsArray, ...values: unknown[]): Promise<T>
}

/** Ids among `userIds` whose account holds a password credential. Never the value. */
export async function passwordPresence(db: RawQueryClient, userIds: readonly string[]): Promise<Set<string>> {
    const ids = [...new Set(userIds)].filter((id) => typeof id === "string" && id.length > 0)
    if (ids.length === 0) return new Set()
    const rows = await db.$queryRaw<{ id: string }[]>`
        SELECT id FROM users WHERE id IN (${Prisma.join(ids)}) AND password IS NOT NULL
    `
    return new Set(rows.map((r) => r.id))
}

/** Convenience for a single account. */
export async function hasPasswordCredential(db: RawQueryClient, userId: string): Promise<boolean> {
    const present = await passwordPresence(db, [userId])
    return present.has(userId)
}

/**
 * Attach `hasPassword` to rows that carry a user id, from one presence query.
 * `idOf` names where the user id lives on the row (defaults to `row.id`).
 */
export async function withCredentialSignals<T>(
    db: RawQueryClient,
    rows: readonly T[],
    idOf: (row: T) => string = (row) => (row as unknown as { id: string }).id
): Promise<(T & { hasPassword: boolean })[]> {
    const present = await passwordPresence(db, rows.map(idOf))
    return rows.map((row) => ({ ...row, hasPassword: present.has(idOf(row)) }))
}
