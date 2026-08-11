import { Prisma, PrismaClient } from "@prisma/client"

// Single idiom for detecting a unique-constraint violation (P2002): accepts
// the typed Prisma error and structurally similar ones (mocked clients in
// tests throw plain Errors carrying the code).
export function isUniqueConstraintViolation(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === "P2002"
  }
  return error instanceof Error && (error as Error & { code?: string }).code === "P2002"
}

// Runtime connection selection (verify the pooled URL at deploy — see
// docs/operations/DEMO_DEPLOY_RUNBOOK.md):
//   POOLED_DATABASE_URL  Supabase Supavisor pooler (port 6543, ?pgbouncer=true&
//                        connection_limit=N) — PREFER at runtime/scale. It's a raw
//                        postgresql:// URL, so it does NOT hit the P6001 that a
//                        prisma:// Accelerate DATABASE_URL would.
//   DIRECT_URL           non-pooled raw connection — safe fallback (today's default;
//                        fine at low volume, exhausts Postgres connections at scale).
//   DATABASE_URL         last resort (may be a prisma:// Accelerate URL in some setups).
// Migrations always use DIRECT_URL via prisma/schema.prisma's `directUrl`.
const rawDbUrl =
  process.env.POOLED_DATABASE_URL ||
  process.env.DIRECT_URL ||
  process.env.DATABASE_URL

/**
 * Force `pgbouncer=true` when we are talking to a TRANSACTION-mode pooler.
 *
 * Transaction pooling hands a server connection back after every transaction,
 * so there is no guarantee that PREPARE and EXECUTE land on the same backend.
 * Prisma must therefore stop using prepared statements — and if it doesn't,
 * Postgres answers `prepared statement "s0" already exists` intermittently,
 * under concurrency, on queries that are individually fine. It is a horrible
 * thing to debug from the application side because nothing in the code is wrong.
 *
 * This is enforced here rather than left to the connection string because the
 * string is edited by hand in a dashboard, by whoever is on shift, usually while
 * something is already broken. Supabase's own copyable "Transaction pooler" URL
 * does NOT include the parameter, so the default path silently omits it — which
 * is exactly what happened in production on 2026-08-10.
 *
 * Scoped to Postgres URLs on the transaction pooler: a direct/session connection
 * keeps prepared statements (they are a real performance win there), and a
 * `prisma://` Accelerate URL is left untouched.
 */
function ensurePoolerCompatibility(url: string | undefined): string | undefined {
  if (!url || !/^postgres(ql)?:\/\//i.test(url)) return url

  try {
    const parsed = new URL(url)
    const isTransactionPooler =
      parsed.port === "6543" || /(^|\.)pooler\.supabase\.com$/i.test(parsed.hostname)

    if (!isTransactionPooler) return url
    if (parsed.searchParams.get("pgbouncer") === "true") return url

    parsed.searchParams.set("pgbouncer", "true")
    return parsed.toString()
  } catch {
    // A URL we cannot parse is one we must not rewrite — hand it back untouched
    // and let Prisma report the real problem.
    return url
  }
}

const dbUrl = ensurePoolerCompatibility(rawDbUrl)

/** Exported for the guard test; not part of the runtime contract. */
export const __ensurePoolerCompatibility = ensurePoolerCompatibility

/**
 * Which connection a deployment actually ended up on, and whether that is safe.
 *
 * Falling back from `POOLED_DATABASE_URL` to `DIRECT_URL` is silent, and the
 * consequence only shows up later as `(EMAXCONNSESSION) max clients reached in
 * session mode` — a database-shaped error with a configuration-shaped cause,
 * which is the expensive kind to diagnose. Sentry POLICYWALLET-5 carried exactly
 * that for a MONTH (first seen 2026-07-11, 37 events) because Preview never got
 * the pooled URL that Production was given.
 *
 * Same reasoning as the `rate-limit: Upstash not configured` warning: a degraded
 * mode that nobody is told about is indistinguishable from a healthy one until
 * it fails under load.
 */
export function assessConnectionStrategy(env: {
    pooled?: string
    direct?: string
    database?: string
    /** True on Vercel/CI — anywhere connections are shared across instances. */
    isDeployed?: boolean
}): { source: "pooled" | "direct" | "database" | "none"; warning: string | null } {
    const source = env.pooled ? "pooled" : env.direct ? "direct" : env.database ? "database" : "none"

    if (source === "none") {
        return { source, warning: "database: no connection string configured" }
    }
    // Locally there is one process and a handful of connections; the fallback is
    // fine and warning about it would be noise.
    if (!env.isDeployed || source === "pooled") return { source, warning: null }

    return {
        source,
        warning:
            `database: POOLED_DATABASE_URL is not set — falling back to ${source === "direct" ? "DIRECT_URL" : "DATABASE_URL"}. ` +
            "Serverless instances will exhaust the session-mode client limit under concurrency.",
    }
}

const connection = assessConnectionStrategy({
    pooled: process.env.POOLED_DATABASE_URL,
    direct: process.env.DIRECT_URL,
    database: process.env.DATABASE_URL,
    isDeployed: Boolean(process.env.VERCEL),
})
if (connection.warning) {
    // console rather than Sentry: this module is imported by seeds and node
    // scripts, and pulling the Next-flavoured SDK into those breaks them.
    console.warn(connection.warning)
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: dbUrl,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    // Prisma's default interactive-transaction timeout is 5000ms — too tight for
    // the analysis-finalize tx (policy update + gap deleteMany + a per-gap
    // resolve/create loop, ~3 + N×2-3 serial round trips) on the Supavisor
    // pooler, which raised P2028 "Transaction already closed … timeout 5000ms"
    // on upload commit for many-gap policies. Raise the ceiling globally
    // (maxWait = time allowed to acquire a pooled connection before the tx body).
    transactionOptions: { maxWait: 5000, timeout: 15000 },
  })

// Cache the client on the global in ALL environments. On serverless this reuses
// one client across warm invocations of the same instance (the recommended
// Prisma pattern) instead of opening a fresh connection pool per module load.
globalForPrisma.prisma = db
