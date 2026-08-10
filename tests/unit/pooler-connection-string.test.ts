import { describe, it, expect } from "vitest"
import { __ensurePoolerCompatibility as ensure } from "@/lib/db"

/**
 * Production incident, 2026-08-10.
 *
 * `POOLED_DATABASE_URL` was moved onto the Supabase transaction pooler to stop
 * connection exhaustion, but without `?pgbouncer=true`. Postgres immediately
 * began logging `prepared statement "s0" already exists` — intermittently, under
 * concurrency, on queries that are individually correct.
 *
 * Transaction pooling returns the server connection after every transaction, so
 * PREPARE and EXECUTE are not guaranteed to reach the same backend. Prisma has
 * to stop using prepared statements, and the only signal that it hasn't is a
 * class of failure that looks like a database fault rather than a configuration
 * one — which is what makes it expensive to diagnose.
 *
 * The parameter is enforced in code because the connection string is edited by
 * hand in a dashboard, usually mid-incident, and Supabase's own copyable
 * "Transaction pooler" string does not include it. Leaving it to whoever is on
 * shift is how it went missing.
 */
describe("transaction-pooler URLs always carry pgbouncer=true", () => {
    it("adds it to a Supabase transaction pooler URL that lacks it", () => {
        // Exactly what Supabase's Connect dialog gives you.
        const given =
            "postgresql://postgres.abcdef:pw@aws-1-eu-west-3.pooler.supabase.com:6543/postgres"
        expect(ensure(given)).toContain("pgbouncer=true")
    })

    it("preserves the credentials, host and database untouched", () => {
        const out = ensure(
            "postgresql://postgres.abcdef:s3cr3t@aws-1-eu-west-3.pooler.supabase.com:6543/postgres"
        )!
        expect(out).toContain("postgres.abcdef:s3cr3t@")
        expect(out).toContain("aws-1-eu-west-3.pooler.supabase.com:6543")
        expect(out).toContain("/postgres")
    })

    it("keeps existing parameters rather than replacing the query string", () => {
        const out = ensure(
            "postgresql://u:p@aws-1-eu-west-3.pooler.supabase.com:6543/postgres?connection_limit=5&schema=public"
        )!
        expect(out).toContain("connection_limit=5")
        expect(out).toContain("schema=public")
        expect(out).toContain("pgbouncer=true")
    })

    it("is idempotent", () => {
        const already =
            "postgresql://u:p@aws-1-eu-west-3.pooler.supabase.com:6543/postgres?pgbouncer=true"
        expect(ensure(already)).toBe(already)
        expect(ensure(ensure(already))).toBe(already)
        // And no duplicate parameter when applied twice to a bare URL.
        const twice = ensure(ensure("postgresql://u:p@x.pooler.supabase.com:6543/postgres"))!
        expect(twice.match(/pgbouncer=true/g)).toHaveLength(1)
    })
})

describe("it does not touch connections where prepared statements are correct", () => {
    it("leaves a direct/session connection alone", () => {
        // Session mode and direct connections keep one backend for the whole
        // session, so prepared statements work and are a real win.
        const direct = "postgresql://postgres:pw@db.abcdef.supabase.co:5432/postgres"
        expect(ensure(direct)).toBe(direct)
    })

    it("leaves a Prisma Accelerate URL alone", () => {
        const accelerate = "prisma://accelerate.prisma-data.net/?api_key=abc"
        expect(ensure(accelerate)).toBe(accelerate)
    })

    it("passes through undefined rather than inventing a URL", () => {
        expect(ensure(undefined)).toBeUndefined()
    })

    it("returns an unparseable string untouched", () => {
        // Rewriting something we cannot parse would replace a clear Prisma error
        // with a confusing one.
        const junk = "postgresql://this is not a url"
        expect(ensure(junk)).toBe(junk)
    })
})

describe("the pooler is recognised by port as well as host", () => {
    it("treats port 6543 as transaction mode even on a non-Supabase host", () => {
        // A dedicated pooler or a self-hosted PgBouncer on the conventional port.
        const out = ensure("postgresql://u:p@db.example.com:6543/postgres")!
        expect(out).toContain("pgbouncer=true")
    })

    it("treats any pooler.supabase.com host as transaction mode", () => {
        // Belt and braces: if the port is ever omitted or changed, the hostname
        // still identifies the shared pooler.
        const out = ensure("postgresql://u:p@aws-0-eu-west-3.pooler.supabase.com/postgres")!
        expect(out).toContain("pgbouncer=true")
    })
})
