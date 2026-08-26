/**
 * LIVE SWEEP for the two new §11 metrics — duplicateActions / countConsistency
 * (Phase 5 precondition, PHASE4-ASSESSMENT.md). Runs both against real
 * surfaces and PRINTS the structured results; the jsdom red-proof lives in
 * phase5-metrics-probe.test.ts.
 *
 * REPORT-ONLY BY DESIGN: this spec asserts harness sanity (the page really
 * carries instrumentation — a scan of an uninstrumented page returns a
 * vacuous zero, the exact failure D-025 documents), NOT zero findings. The
 * findings are Phase 5 input, and a gate on them belongs to the surface
 * rebuild items, which must choose their own navPolicy and fixture states —
 * a failing gate left here would turn every local full run red on defects
 * this spec has no authority to fix.
 *
 * Run: npx playwright test tests/measure/phase5-live-sweep.spec.ts \
 *        --project=measure --no-deps
 */

import { test, expect } from "@playwright/test"

import { countConsistency, duplicateActions, settle } from "./metrics"

const SURFACES = ["/dashboard", "/wallet"] as const

for (const path of SURFACES) {
    test(`phase5 metrics sweep: ${path} @390`, async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 })
        await page.goto(path)
        await settle(page)

        const acts = await duplicateActions(page)
        const cnts = await countConsistency(page)

        // Non-vacuous: the surface really is instrumented (D-025's trap).
        const instrumented = await page.locator("[data-count], [data-fact]").count()
        expect(
            instrumented,
            `${path} carries no data-count/data-fact at all — wrong page or lost instrumentation`
        ).toBeGreaterThan(0)

        console.log(
            `\n=== ${path} @390 — duplicateActions ===\n` +
                JSON.stringify(
                    {
                        offeredInstances: acts.offeredInstances,
                        duplicateActionCount: acts.duplicateActionCount,
                        navOverlapCount: acts.navOverlapCount,
                        unidentifiable: acts.unidentifiable,
                        excluded: acts.excluded,
                        groups: acts.groups,
                    },
                    null,
                    1
                )
        )
        console.log(
            `\n=== ${path} @390 — countConsistency ===\n` +
                JSON.stringify(
                    {
                        verdict: cnts.verdict,
                        failures: cnts.failures,
                        totalKeys: cnts.totalKeys,
                        comparableKeys: cnts.comparableKeys,
                        corroboratedKeys: cnts.corroboratedKeys,
                        inconsistent: cnts.inconsistent,
                        nonComparable: cnts.nonComparable,
                        unmeasurableCount: cnts.unmeasurable.length,
                        unmeasurable: cnts.unmeasurable.slice(0, 25),
                        excludedByDesign: cnts.excludedByDesign,
                    },
                    null,
                    1
                )
        )
    })
}
