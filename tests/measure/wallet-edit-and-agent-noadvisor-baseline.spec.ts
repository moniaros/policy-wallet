/**
 * T-016b — two of the five missing PAID-tier targets:
 *
 *  1. `/wallet/[id]/edit` — never captured by any prior pass.
 *
 *  2. `/agent` genuine "no advisor" empty state AT PAID TIER.
 *     `docs/transformation/evidence/agent-view/BASELINE.md` already found that
 *     `e2e-ph@policywallet.test` (the paid account) carries a real, pre-existing
 *     ACTIVE `CustomerRelationship` from other E2E specs (agent-journey and
 *     siblings), so its own "no-advisor" capture was actually the CONNECTED
 *     state in disguise — confirmed there by a byte-identical `fullText` diff
 *     against the "connected" capture. Only the FREE account
 *     (`e2e-ph-free@policywallet.test`, which never accumulates a relationship)
 *     reached the real empty state, leaving PAID+no-advisor unmeasured.
 *     `NoAgentEmptyState` (AgentClient.tsx) takes no tier prop, so its OWN
 *     markup is not expected to differ by tier — but the surrounding app shell
 *     (upgrade banners, nav) can, so this is measured rather than assumed.
 *
 * Idempotent flip, same pattern as the free-tier specs' `reportUnlockedAt`
 * reset: read the relationship's current status, set it to "terminated" for
 * the duration of ONE capture (the real value `terminateRelationship` writes —
 * see app/(protected)/agent/relationship-actions.ts), then restore the
 * ORIGINAL value in a `finally` block regardless of outcome. Local-dev only —
 * `withDb`/`provisionMatrixFixtures` already refuse the production database.
 *
 * Run:  npx playwright test --project=measure wallet-edit-and-agent-noadvisor-baseline
 */
import { test, expect } from "@playwright/test"
import { FIXTURE_SPECS, provisionMatrixFixtures } from "./fixtures"
import { evidenceDirs, ensureDirs, openSurface, captureSurface, withDb } from "./surface-harness"

const WIDTHS = [320, 390, 430] as const
const EMAIL = "e2e-ph@policywallet.test"

let ids: Record<string, string> = {}

test.describe.configure({ mode: "serial" })

test.beforeAll(async () => {
    test.setTimeout(300_000)
    ids = await withDb((db) => provisionMatrixFixtures(db, EMAIL, FIXTURE_SPECS))
})

test("baseline: /wallet/[id]/edit (paid)", async ({ page }) => {
    test.setTimeout(6 * 60_000)
    const dirs = evidenceDirs("wallet-edit")
    ensureDirs(dirs)
    const policyId = ids["motor-active"]
    expect(policyId, "motor-active fixture provisioned").toBeTruthy()
    for (const width of WIDTHS) {
        await openSurface(page, `/wallet/${policyId}/edit`, width)
        expect(page.url(), `edit@${width}: landed on the wrong page (write access denied?)`).toContain(`/wallet/${policyId}/edit`)
        // minSections: 0 — a plain form page, no `.pw-page-shell`/`section[id]`.
        await captureSurface(page, dirs, "edit-motor-active-paid", width, [
            { key: "policy.policyNumber", value: "ΣΥΜΒ-2025-MOT-ACT" },
        ], { tier: "paid" }, 300, 0)
    }
})

test("baseline: /agent genuine no-advisor empty state (paid)", async ({ page }) => {
    test.setTimeout(6 * 60_000)
    const dirs = evidenceDirs("agent-view")
    ensureDirs(dirs)

    // CORRECTION (found running this spec): the account carries TWO active
    // relationships, not one. `findFirst({ orderBy: { createdAt: 'desc' } })`
    // only ever sees the newest — terminating just that row left the OLDER one
    // (created 2026-07-24, a different agent) active, and the page's own query
    // (`where: { status: 'active' }`, no orderBy — the exact gap agent-view/
    // BASELINE.md already flagged) found it anyway. First run of this test
    // captured a byte-identical "connected" page under a "no-advisor" label —
    // confirmed by comparing scrollHeight/contrast/truncation counts against
    // the already-published "connected-paid" row: 1191/1067/1076px, 18
    // containers, 7 nonText findings, 9/9/7 truncation, 1 leak — an EXACT
    // match at all three widths. Fixed: terminate EVERY active relationship,
    // not just the newest, and restore each one's own original status.
    const relationships = await withDb(async (db) => {
        const owner = await db.user.findUnique({ where: { email: EMAIL }, select: { id: true } })
        if (!owner) throw new Error(`owner ${EMAIL} not provisioned`)
        return db.customerRelationship.findMany({
            where: { policyholderUserId: owner.id, status: { not: "terminated" } },
            select: { id: true, status: true },
        })
    })

    for (const rel of relationships) {
        await withDb((db) => db.customerRelationship.update({ where: { id: rel.id }, data: { status: "terminated" } }))
    }
    // else: the account genuinely has no non-terminated relationship row at
    // all — nothing to flip, the capture below is already the state we need.

    try {
        for (const width of WIDTHS) {
            await openSurface(page, "/agent", width)
            // minSections: 0 — AgentClient.tsx uses neither `.pw-page-shell`
            // nor `section[id]` (agent-view/BASELINE.md's own finding).
            await captureSurface(
                page,
                dirs,
                "no-advisor-genuine-paid",
                width,
                [],
                {
                    tier: "paid",
                    state: relationships.length
                        ? `${relationships.length}-relationship(s)-terminated-for-capture`
                        : "no-relationship-row",
                },
                300,
                0
            )
        }
    } finally {
        for (const rel of relationships) {
            await withDb((db) => db.customerRelationship.update({ where: { id: rel.id }, data: { status: rel.status } }))
        }
    }
})
