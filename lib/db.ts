import { PrismaClient } from "@prisma/client"

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

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: dbUrl,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  })

// Cache the client on the global in ALL environments. On serverless this reuses
// one client across warm invocations of the same instance (the recommended
// Prisma pattern) instead of opening a fresh connection pool per module load.
globalForPrisma.prisma = db
