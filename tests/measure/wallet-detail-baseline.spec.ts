/**
 * T-015 baseline — Ασφαλιστήριο `/wallet/[id]` (priority 4 of the §4.5 order), PAID tier.
 *
 * This surface already has a Goal-0/Goal-1 evidence trail under
 * `docs/evidence/policy-detail-mobile/` (BASELINE.md, GOAL1.md) from a PRIOR,
 * already-shipped goal series — but that series stopped after Goal 1 (no
 * Goal 2-5 restructure landed the way the dashboard's did), and BASELINE.md
 * explicitly records two gaps in itself: free-tier paths were never captured,
 * and **1.4.11 was never automated**. This is a FRESH capture against HEAD
 * for the current PW-MOBILE-TRANSFORM-01 run, closing both gaps in the SAME
 * pass rather than a follow-up spec, using the identical 6-fixture ×
 * 3-width matrix the original Goal 0 baseline used (so the two are
 * comparable in shape even though they serve different runs) plus the
 * `defect-*` states are captured too since T-012 added them specifically to
 * be measurable.
 *
 * Run:  npx playwright test --project=measure wallet-detail-baseline
 */
import { test, expect } from "@playwright/test"
import { FIXTURE_SPECS, DEFECT_SPECS, provisionMatrixFixtures, fixtureDates, type FixtureSpec } from "./fixtures"
import { evidenceDirs, ensureDirs, openSurface, captureSurface, withDb } from "./surface-harness"
import type { FactSpec } from "./metrics"

const WIDTHS = [320, 390, 430] as const
const EMAIL = "e2e-ph@policywallet.test"
const dirs = evidenceDirs("wallet-detail")

test.describe.configure({ mode: "serial" })

let ids: Record<string, string> = {}

test.beforeAll(async () => {
    test.setTimeout(300_000)
    ensureDirs(dirs)
    ids = await withDb((db) => provisionMatrixFixtures(db, EMAIL, [...FIXTURE_SPECS, ...DEFECT_SPECS]))
})

/** Greek no-leading-zero d/m/yyyy — matches the rendered format observed in the prior Goal 0 baseline. */
function fmt(d: Date): string {
    return `${d.getUTCDate()}/${d.getUTCMonth() + 1}/${d.getUTCFullYear()}`
}

function factsFor(spec: FixtureSpec): FactSpec[] {
    const { start, end } = fixtureDates(spec.state)
    return [
        { key: "policy.policyNumber", value: spec.policyNumber },
        { key: "policy.endDate", value: fmt(end) },
        { key: "policy.startDate", value: fmt(start) },
    ]
}

for (const spec of FIXTURE_SPECS) {
    test(`baseline matrix: ${spec.key}`, async ({ page }) => {
        test.setTimeout(10 * 60_000)
        const policyId = ids[spec.key]
        expect(policyId, `fixture ${spec.key} provisioned`).toBeTruthy()
        for (const width of WIDTHS) {
            await openSurface(page, `/wallet/${policyId}`, width)
            expect(page.url(), `${spec.key}@${width}: landed on the wrong page`).toContain(`/wallet/${policyId}`)
            await captureSurface(page, dirs, spec.key, width, factsFor(spec), {
                tier: "paid",
                fixtureState: spec.state,
                lineOfBusiness: spec.lineOfBusiness,
            })
        }
    })
}

for (const spec of DEFECT_SPECS) {
    test(`baseline defect-state: ${spec.key}`, async ({ page }) => {
        test.setTimeout(10 * 60_000)
        const policyId = ids[spec.key]
        expect(policyId, `fixture ${spec.key} provisioned`).toBeTruthy()
        for (const width of WIDTHS) {
            await openSurface(page, `/wallet/${policyId}`, width)
            expect(page.url(), `${spec.key}@${width}: landed on the wrong page`).toContain(`/wallet/${policyId}`)
            await captureSurface(page, dirs, spec.key, width, factsFor(spec), {
                tier: "paid",
                fixtureState: spec.state,
                lineOfBusiness: spec.lineOfBusiness,
                defectFixture: true,
            })
        }
    })
}
