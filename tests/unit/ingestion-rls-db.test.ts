// @vitest-environment node
/**
 * Gate 4 — RLS cross-tenant isolation (one test). DB-level guarantee that user A
 * cannot read user B's policy documents through the Supabase anon/authenticated
 * roles (the surface RLS protects; Prisma's owner role bypasses RLS by design).
 *
 * Requires a configured LOCAL Supabase with RLS policies applied:
 *   TEST_DATABASE_URL, TEST_SUPABASE_URL, TEST_SUPABASE_ANON_KEY,
 *   TEST_SUPABASE_SERVICE_KEY, and two seeded users (A_EMAIL/A_PASSWORD, B_USER_ID).
 * Skips otherwise — including here (RLS is not yet applied; see STATUS Top risk #1).
 */
import { describe, it, expect } from "vitest"
import { createClient } from "@supabase/supabase-js"
import { hasTestDb } from "../helpers/test-db"

const env = process.env
const rlsConfigured =
  hasTestDb &&
  Boolean(
    env.TEST_SUPABASE_URL &&
      env.TEST_SUPABASE_ANON_KEY &&
      env.TEST_SUPABASE_SERVICE_KEY &&
      env.RLS_TEST_A_EMAIL &&
      env.RLS_TEST_A_PASSWORD &&
      env.RLS_TEST_B_USER_ID,
  )

describe.skipIf(!rlsConfigured)("RLS — cross-tenant document isolation", () => {
  it("user A cannot read user B's policy documents", async () => {
    const url = env.TEST_SUPABASE_URL as string

    // Seed a document owned by user B using the service role (bypasses RLS).
    const admin = createClient(url, env.TEST_SUPABASE_SERVICE_KEY as string)
    const bDocId = `rls-test-${Date.now()}`
    await admin.from("policy_documents").insert({
      document_id: bDocId,
      policy_id: env.RLS_TEST_B_POLICY_ID ?? null,
      file_url: "https://example.test/b.pdf",
      file_name: "b.pdf",
      file_size: 1,
      source: "upload",
      uploaded_by_user_id: env.RLS_TEST_B_USER_ID as string,
    })

    // User A signs in via the anon client and tries to read B's document.
    const aClient = createClient(url, env.TEST_SUPABASE_ANON_KEY as string)
    await aClient.auth.signInWithPassword({
      email: env.RLS_TEST_A_EMAIL as string,
      password: env.RLS_TEST_A_PASSWORD as string,
    })

    const { data } = await aClient
      .from("policy_documents")
      .select("document_id")
      .eq("document_id", bDocId)

    // RLS must hide B's row from A (empty result, not an error leak).
    expect(data ?? []).toHaveLength(0)

    await admin.from("policy_documents").delete().eq("document_id", bDocId)
  }, 30000)
})
