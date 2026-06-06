/**
 * Shared test-database helper, reused by all DB-touching specs.
 *
 * Runs ONLY against an explicit TEST_DATABASE_URL (a separate schema in the local
 * Supabase Postgres) — never the dev/prod database. The guard below refuses the
 * hosted pooler / prod port outright, so a misconfigured env can never truncate prod.
 *
 * tests/setup.ts has already pointed the Prisma singleton at TEST_DATABASE_URL when
 * it is set, so `db` here is the test database.
 */
import { execSync } from "child_process"
import { db } from "@/lib/db"

const url = process.env.TEST_DATABASE_URL ?? ""

/** True only for an explicit, non-prod test database. DB specs skip when false. */
export const hasTestDb: boolean =
  url.length > 0 &&
  !/pooler\.supabase\.com/.test(url) && // never the hosted prod pooler
  !/:6543\b/.test(url) // never the pgbouncer/prod port

let schemaReady = false

/** Apply all migrations to the test DB once per process (idempotent). No-op without one. */
export function ensureTestSchema(): void {
  if (!hasTestDb || schemaReady) return
  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url },
    stdio: "ignore",
  })
  schemaReady = true
}

/** Truncate the ingestion tables between tests (CASCADE; reset identities). */
export async function truncateIngestionTables(): Promise<void> {
  await db.$executeRawUnsafe(
    'TRUNCATE TABLE "document_extractions", "coverage_envelopes", "coverage_taxonomy", "insurer_templates" RESTART IDENTITY CASCADE',
  )
}

export { db as testDb }
