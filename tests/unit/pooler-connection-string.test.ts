import { describe, it, expect } from "vitest"
import { __ensurePoolerCompatibility as ensure, assessConnectionStrategy as assess } from "@/lib/db"

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

/**
 * Sentry POLICYWALLET-5, first seen 2026-07-11 and still firing a month later:
 *
 *   PrismaClientInitializationError: Error querying the database:
 *   FATAL: (EMAXCONNSESSION) max clients reached in session mode
 *          - max clients are limited to pool_size: 15
 *
 * `POOLED_DATABASE_URL` was set on Production and never on Preview, so Preview
 * silently fell back to `DIRECT_URL` — the SESSION-mode pooler, capped at 15
 * clients — and exhausted it as soon as anything ran concurrently. Nothing said
 * so. The fallback is deliberate and correct at low volume; being silent about
 * it in a deployed environment is what made a configuration fault look like a
 * database fault for a month.
 */
describe("a deployed instance says so when it is not on the pooled connection", () => {
    it("warns when a deployment falls back to DIRECT_URL", () => {
        const { source, warning } = assess({
            direct: "postgresql://u:p@aws-1-eu-west-3.pooler.supabase.com:5432/postgres",
            isDeployed: true,
        })
        expect(source).toBe("direct")
        expect(warning).toContain("POOLED_DATABASE_URL is not set")
        // Names the consequence, so the reader does not have to already know it.
        expect(warning).toMatch(/session-mode|exhaust/i)
    })

    it("stays quiet when the pooled URL is present", () => {
        expect(
            assess({
                pooled: "postgresql://u:p@aws-1-eu-west-3.pooler.supabase.com:6543/postgres?pgbouncer=true",
                direct: "postgresql://u:p@db.example.supabase.co:5432/postgres",
                isDeployed: true,
            })
        ).toEqual({ source: "pooled", warning: null })
    })

    it("stays quiet locally, where the fallback is the right answer", () => {
        // One process, a handful of connections. Warning here would be noise,
        // and noise is how the real warning gets ignored.
        expect(assess({ direct: "postgresql://u:p@localhost:5432/postgres", isDeployed: false }).warning)
            .toBeNull()
    })

    it("reports a total absence of configuration as its own fault", () => {
        expect(assess({ isDeployed: true })).toEqual({
            source: "none",
            warning: "database: no connection string configured",
        })
    })

    it("prefers pooled over direct over database, in that order", () => {
        expect(assess({ pooled: "a", direct: "b", database: "c" }).source).toBe("pooled")
        expect(assess({ direct: "b", database: "c" }).source).toBe("direct")
        expect(assess({ database: "c" }).source).toBe("database")
    })

    it("never puts the connection string itself in the warning", () => {
        // Warnings land in logs and in Sentry breadcrumbs; a DSN carries the
        // database password.
        const secret = "postgresql://postgres.abc:sup3rs3cr3t@host:5432/postgres"
        const { warning } = assess({ direct: secret, isDeployed: true })
        expect(warning).not.toContain("sup3rs3cr3t")
        expect(warning).not.toContain("postgres.abc")
    })
})
