import { Prisma, PrismaClient } from "@prisma/client"
import * as Sentry from "@sentry/nextjs"

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
const dbUrl =
  process.env.POOLED_DATABASE_URL ||
  process.env.DIRECT_URL ||
  process.env.DATABASE_URL

// The fallback above is SILENT: a production deploy that forgets
// POOLED_DATABASE_URL runs perfectly well on DIRECT_URL at low volume and then
// exhausts Postgres connections under load, with nothing in the logs to say
// which connection it chose. Make the degraded choice announce itself once, so
// it is discovered before traffic finds it rather than during an incident.
if (
  process.env.NODE_ENV === "production" &&
  !process.env.POOLED_DATABASE_URL &&
  !globalThis.__pwPooledWarned
) {
  globalThis.__pwPooledWarned = true
  console.warn(
    "db: POOLED_DATABASE_URL is not set — running on a non-pooled connection, " +
    "which exhausts Postgres connections at scale."
  )
  Sentry.captureMessage("db: POOLED_DATABASE_URL not set in production", {
    level: "warning",
  })
}

declare global {
  var __pwPooledWarned: boolean | undefined
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
