import { createHash } from 'node:crypto'

// Exact SQL already applied and verified on dev. A content allowlist avoids
// mistaking ON DELETE CASCADE declarations for destructive DELETE statements.
// Any edit, including appended SQL, requires review of the entire migration.
export const reviewedPreventionMigrations: Readonly<Record<string, string>> = Object.freeze({
    '20261002120000_prevention_hub': '4a70fd82f931e30497a5ec03e435024f45bbe3d5411b5504512c2d41d7c92a85',
    '20261002160000_prevention_personalization': '4b4421e30668b4437b3a710aa7e5938f475235c8785568a5da312dc55d287d82',
})

export function assertReviewedPreventionMigration(name: string, sql: string): void {
    const expected = Object.hasOwn(reviewedPreventionMigrations, name) ? reviewedPreventionMigrations[name] : undefined
    if (!expected || createHash('sha256').update(sql).digest('hex') !== expected) {
        throw new Error(`Unreviewed prevention migration content: ${name}`)
    }
}
