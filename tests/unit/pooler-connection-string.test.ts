import { describe, it, expect } from "vitest"
import {
    __ensurePoolerCompatibility as ensure,
    assessConnectionStrategy as assess,
    capFallbackPool as cap,
} from "@/lib/db"

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

/**
 * The other half of POLICYWALLET-5 — the half that was missing for six weeks.
 *
 * The warning above was already in place and already correct. It fired into
 * `console.warn` on every cold start of every Preview deployment, and the issue
 * went from 37 events to 51 anyway, because a deployment that announces it is
 * about to exhaust the session pool still exhausts the session pool.
 *
 * So the fallback is capped as well as announced. This does not make session
 * mode the right answer — `POOLED_DATABASE_URL` is still the fix — it makes the
 * WRONG answer survivable, which is what you want from a path that is reached
 * only by misconfiguration and only in the environments nobody is watching.
 */
/** The connection Preview actually fell back to: Supavisor in SESSION mode. */
const SESSION = "postgresql://u:p@aws-1-eu-west-3.pooler.supabase.com:5432/postgres"

describe("a deployed fallback to session mode is capped, not just announced", () => {
    it("caps the pool when a deployment falls back to DIRECT_URL", () => {
        const out = cap(SESSION, "direct", true)!
        expect(out).toContain("connection_limit=2")
    })

    it("also sets a pool_timeout, so a capped pool queues instead of failing fast", () => {
        expect(cap(SESSION, "direct", true)!).toContain("pool_timeout=20")
    })

    it("caps a DATABASE_URL fallback too — the same ceiling applies", () => {
        expect(cap(SESSION, "database", true)!).toContain("connection_limit=2")
    })

    it("keeps the credentials, host, port and database intact", () => {
        const out = cap("postgresql://postgres.abc:s3cr3t@aws-1-eu-west-3.pooler.supabase.com:5432/postgres", "direct", true)!
        expect(out).toContain("postgres.abc:s3cr3t@")
        expect(out).toContain("aws-1-eu-west-3.pooler.supabase.com:5432")
        expect(out).toContain("/postgres")
    })

    it("preserves parameters that are already there", () => {
        const out = cap(SESSION + "?schema=public&sslmode=require", "direct", true)!
        expect(out).toContain("schema=public")
        expect(out).toContain("sslmode=require")
        expect(out).toContain("connection_limit=2")
    })

    it("is idempotent", () => {
        const once = cap(SESSION, "direct", true)!
        expect(cap(once, "direct", true)).toBe(once)
        expect(once.match(/connection_limit=/g)).toHaveLength(1)
    })
})

describe("the cap never overrides a deliberate choice", () => {
    it("leaves the pooled connection alone — transaction mode has no such ceiling", () => {
        const pooled = "postgresql://u:p@aws-1-eu-west-3.pooler.supabase.com:6543/postgres?pgbouncer=true"
        expect(cap(pooled, "pooled", true)).toBe(pooled)
    })

    it("tells the two poolers apart by PORT, not hostname", () => {
        // Both live on *.pooler.supabase.com. Only the port distinguishes session
        // mode (5432, capped at 15 clients) from transaction mode (6543), so a
        // hostname test would wrongly exempt the connection that needs capping.
        const txn = "postgresql://u:p@aws-1-eu-west-3.pooler.supabase.com:6543/postgres"
        expect(cap(txn, "direct", true)).toBe(txn)
        expect(cap("postgresql://u:p@aws-1-eu-west-3.pooler.supabase.com:5432/postgres", "direct", true))
            .toContain("connection_limit=2")
    })

    it("respects an explicit connection_limit that someone set on purpose", () => {
        const explicit = "postgresql://u:p@host:5432/postgres?connection_limit=9"
        expect(cap(explicit, "direct", true)).toBe(explicit)
    })

    it("does nothing locally, where one process holds a handful of connections", () => {
        expect(cap(SESSION, "direct", false)).toBe(SESSION)
    })

    it("does nothing when there is no connection string to cap", () => {
        expect(cap(undefined, "none", true)).toBeUndefined()
        expect(cap(SESSION, "none", true)).toBe(SESSION)
    })

    it("leaves a non-postgres URL untouched", () => {
        const accelerate = "prisma://accelerate.prisma-data.net/?api_key=abc"
        expect(cap(accelerate, "database", true)).toBe(accelerate)
    })

    it("returns an unparseable string untouched", () => {
        const junk = "postgresql://this is not a url"
        expect(cap(junk, "direct", true)).toBe(junk)
    })
})
