/**
 * T-015 baseline — Σύμβουλος `/agent` (priority 6 of the §4.5 order) — the
 * customer's adviser view (not the B2B agent console, which is out of scope
 * per SURFACES.md).
 *
 * PAID tier. Two states:
 *   - `no-advisor`   — whatever relationship state the account naturally has.
 *   - `connected`    — `applyLongAdvisorFixture` (dashboard-fixtures.ts,
 *     already parametrised by owner email) applied to THIS account: an
 *     ACTIVE `CustomerRelationship` to an advisor with a deliberately long
 *     display name, so the same D7-class truncation candidate the dashboard
 *     matrix built for its own advisor row is measurable here too.
 *
 * Run:  npx playwright test --project=measure agent-view-baseline
 */
import { test } from "@playwright/test"
import { FIXTURE_SPECS, DEFECT_SPECS, provisionMatrixFixtures } from "./fixtures"
import { applyLongAdvisorFixture } from "./dashboard-fixtures"
import { evidenceDirs, ensureDirs, openSurface, captureSurface, withDb } from "./surface-harness"

const WIDTHS = [320, 390, 430] as const
const EMAIL = "e2e-ph@policywallet.test"
const dirs = evidenceDirs("agent-view")

test.describe.configure({ mode: "serial" })

test.beforeAll(async () => {
    test.setTimeout(300_000)
    ensureDirs(dirs)
    await withDb((db) => provisionMatrixFixtures(db, EMAIL, [...FIXTURE_SPECS, ...DEFECT_SPECS]))
})

test("baseline: adviser view before a relationship fixture (paid)", async ({ page }) => {
    test.setTimeout(6 * 60_000)
    for (const width of WIDTHS) {
        await openSurface(page, "/agent", width)
        // minSections: 0 — AgentClient.tsx uses NEITHER `.pw-page-shell` NOR
        // `section[id]`, so `sectionCount()` structurally cannot return >0 on
        // this surface regardless of real content. The default `assertRendered`
        // floor of 1 section refused every capture of this page as a "non-render"
        // during this run even though a direct server-rendered fetch confirmed
        // real content in ~5s — the harness convention, not the page, was empty.
        await captureSurface(page, dirs, "no-advisor-fixture-paid", width, [], { tier: "paid", state: "unmodified-relationship" }, 300, 0)
    }
})

test("baseline: adviser view with a long-name active relationship (paid)", async ({ page }) => {
    test.setTimeout(6 * 60_000)
    await withDb((db) => applyLongAdvisorFixture(db, EMAIL))
    for (const width of WIDTHS) {
        await openSurface(page, "/agent", width)
        await captureSurface(page, dirs, "connected-paid", width, [], { tier: "paid", state: "active-relationship-long-name" }, 300, 0)
    }
})
