/**
 * PHASE 5 CROSS-SURFACE COUNT SWEEP — the live run of cross-surface-count.ts.
 *
 * Visits the five B2C surfaces, collects every instrumented count per surface
 * (via the shared §11 collector — one value-extraction definition), and runs
 * the cross-surface comparison: any key rendering more than one distinct
 * value across surfaces is the run's headline defect (D-025, §2.8).
 *
 * SAME-STATE DISCIPLINE (decision 1, cross-surface-count.ts header): one
 * account, one browser context, one serial test, navigation only — no click
 * ever happens here (the cookie banner is left alone; it is not product
 * data and dismissing it would be this sweep's only write). The sweep runs
 * TWO full passes and voids itself if any surface's captured values differ
 * between its own two visits, or if the Athens calendar date changes
 * mid-sweep (policy.daysRemaining rolls at Athens midnight —
 * lib/policy-status.ts). A void run FAILS; it never reports findings,
 * because a finding from a moving portfolio can be a phantom.
 *
 * REPORT-ONLY FOR FINDINGS (the phase5-live-sweep.spec.ts precedent): real
 * contradictions are printed as Phase 5 input, not asserted to zero — a gate
 * belongs to the surface rebuild items. What DOES fail the spec: a void
 * sweep, a lost session, and the D-025 vacuous trap (/dashboard or /wallet
 * carrying no instrumentation at all — the two surfaces known to be
 * instrumented; the other three are reported as-found because "this surface
 * has zero instrumented counts" is itself a finding, not a harness error).
 *
 * RED-PROOF MODE — CROSS_SURFACE_PLANT=1:
 *   A detector that has never fired is not a detector. With the flag set,
 *   the sweep plants a contradiction into the REAL /wallet DOM before
 *   capture: it picks the first key+subject (sorted) that /dashboard renders
 *   as an exact numeric value and /wallet also renders, and overwrites the
 *   wallet element's text with value+7. The plant is applied identically in
 *   both passes (so the same-state check stays honest — the planted state IS
 *   stable), and the spec then ASSERTS the comparator fires on exactly that
 *   key, naming both surfaces. The jsdom red-proof for every individual rule
 *   lives in phase5-cross-surface-probe.test.ts; this mode proves the
 *   whole chain — real pages, real serialised collector, real comparator.
 *   Output is banner-labelled so a planted run can never be read as data.
 *
 * Run:  npx playwright test tests/measure/phase5-cross-surface.spec.ts \
 *         --project=measure --no-deps
 * Red:  CROSS_SURFACE_PLANT=1 npx playwright test \
 *         tests/measure/phase5-cross-surface.spec.ts --project=measure --no-deps
 */

import { test, expect, type Page } from "@playwright/test"

import { countConsistency, settle } from "./metrics"
import {
    compareAcrossSurfaces,
    compareSweepPasses,
    type SurfaceCapture,
} from "./cross-surface-count"

const SURFACES = ["/dashboard", "/wallet", "/protection", "/notifications", "/account"] as const

const PLANT = process.env.CROSS_SURFACE_PLANT === "1"
const PLANT_SURFACE = "/wallet"
const PLANT_DELTA = 7

/** The date the Athens calendar shows right now — the day-count rollover clock. */
function athensDate(): string {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Athens" }).format(new Date())
}

interface PlantTarget {
    key: string
    subject: string
    plantValue: string
}

interface PlantedRecord {
    key: string
    subject: string
    from: string
    to: string
}

/**
 * Overwrite the first visible /wallet element matching one of the candidate
 * key+subjects (tried in the given order) with its plant value. Returns what
 * was planted, or null if no candidate element exists on this page.
 */
async function plantContradiction(page: Page, candidates: PlantTarget[]): Promise<PlantedRecord | null> {
    return page.evaluate((cands: PlantTarget[]) => {
        const visible = (el: Element): boolean => {
            const cs = getComputedStyle(el as HTMLElement)
            if (cs.display === "none" || cs.visibility === "hidden") return false
            const r = (el as HTMLElement).getBoundingClientRect()
            return r.width > 0 && r.height > 0
        }
        for (const cand of cands) {
            const els = Array.from(document.querySelectorAll<HTMLElement>("[data-count], [data-fact]"))
            for (const el of els) {
                if (!visible(el)) continue
                const key = el.getAttribute("data-count") || el.getAttribute("data-fact") || ""
                const subject =
                    el.getAttribute("data-count-subject") || el.getAttribute("data-fact-subject") || ""
                if (key === cand.key && subject === cand.subject) {
                    const from = (el.textContent || "").trim()
                    el.textContent = cand.plantValue
                    return { key: cand.key, subject: cand.subject, from, to: cand.plantValue }
                }
            }
        }
        return null
    }, candidates)
}

/**
 * Plant candidates from a /dashboard capture: key+subjects with at least one
 * exact numeric render (raw text NOT the saturated `N+` form — planting
 * exact-below-floor would test the floor rule, but exact-vs-exact is the
 * headline shape). Sorted for determinism across the two passes.
 */
function plantCandidatesFrom(dashboard: SurfaceCapture): PlantTarget[] {
    const out: PlantTarget[] = []
    for (const g of dashboard.result.groups) {
        const exact = g.renders.find(
            (r) => r.value !== null && /^[+-]?\d+(\.\d+)?$/.test(r.value) && !/^\s*\d{1,4}\s*\+\s*$/.test(r.text)
        )
        if (!exact || exact.value === null) continue
        out.push({
            key: g.key,
            subject: g.subject,
            plantValue: String(parseFloat(exact.value) + PLANT_DELTA),
        })
    }
    return out.sort((a, b) => (a.key + "\u0000" + a.subject).localeCompare(b.key + "\u0000" + b.subject))
}

test.describe.configure({ mode: "serial" })

test("phase5 cross-surface count sweep @390 — five surfaces, one state, one verdict", async ({ page }) => {
    // Ten navigations with settle (≤9s each) plus collection; generous cap.
    test.setTimeout(420_000)
    await page.setViewportSize({ width: 390, height: 844 })

    const startDate = athensDate()
    const planted: (PlantedRecord | null)[] = []

    const capturePass = async (): Promise<SurfaceCapture[]> => {
        const captures: SurfaceCapture[] = []
        for (const surface of SURFACES) {
            await page.goto(surface)
            // A lapsed session redirects to /auth/signin and every capture
            // after that would be an empty page measured with a straight face.
            expect(
                page.url(),
                `${surface} redirected to ${page.url()} — session lost; rerun without --no-deps so auth setup refreshes it`
            ).toContain(surface)
            await settle(page)
            if (PLANT && surface === PLANT_SURFACE) {
                const dash = captures.find((c) => c.surface === "/dashboard")
                expect(dash, "plant mode requires /dashboard captured before /wallet").toBeTruthy()
                const candidates = plantCandidatesFrom(dash!)
                expect(
                    candidates.length,
                    "cannot plant: /dashboard rendered no exact numeric instrumented value — the real sweep would be floor-only/vacuous too"
                ).toBeGreaterThan(0)
                const rec = await plantContradiction(page, candidates)
                expect(
                    rec,
                    "cannot plant: no /wallet element shares an exact-numeric key+subject with /dashboard"
                ).toBeTruthy()
                planted.push(rec)
            }
            const result = await countConsistency(page)
            captures.push({ surface, result })
        }
        return captures
    }

    const pass1 = await capturePass()
    const pass2 = await capturePass()
    const endDate = athensDate()

    // ── VOID CHECKS — fail loudly, never report a phantom ───────────────────
    expect(
        endDate,
        `SWEEP VOID: Athens calendar date rolled ${startDate} → ${endDate} mid-sweep; every day-count may have moved. Re-run.`
    ).toBe(startDate)

    const stateCheck = compareSweepPasses(pass1, pass2)
    expect(
        stateCheck.void,
        `SWEEP VOID: portfolio state changed between the two passes — cross-surface diffs are uninterpretable. Diffs:\n` +
            JSON.stringify(stateCheck.diffs, null, 1)
    ).toBe(false)

    if (PLANT) {
        // Both passes must have planted the SAME target — otherwise the state
        // moved under us (the void check above should already have caught it).
        expect(planted.length).toBe(2)
        expect(planted[0]!.key + "\u0000" + planted[0]!.subject).toBe(
            planted[1]!.key + "\u0000" + planted[1]!.subject
        )
    }

    // ── D-025 VACUOUS TRAP — the two known-instrumented surfaces ────────────
    for (const s of ["/dashboard", "/wallet"]) {
        const cap = pass1.find((c) => c.surface === s)!
        expect(
            cap.result.groups.length,
            `${s} carries no data-count/data-fact groups at all — wrong page or lost instrumentation (D-025)`
        ).toBeGreaterThan(0)
    }

    // ── THE COMPARISON ───────────────────────────────────────────────────────
    const cross = compareAcrossSurfaces(pass1)

    if (PLANT) {
        console.log(
            "\n" +
                "!!! PLANTED RED-PROOF RUN (CROSS_SURFACE_PLANT=1) !!!\n" +
                "!!! The findings below include a deliberate DOM override on /wallet — NOT product data !!!\n" +
                `!!! Planted: ${JSON.stringify(planted[0])} !!!\n`
        )
    }

    console.log(
        `\n=== phase5 cross-surface count sweep @390 — ${SURFACES.join(", ")} ===\n` +
            JSON.stringify(
                {
                    verdict: cross.verdict,
                    sharedKeyCount: cross.sharedKeyCount,
                    corroboratedExact: cross.corroboratedExact,
                    corroboratedFloorOnly: cross.corroboratedFloorOnly,
                    uncorroboratedShared: cross.uncorroboratedShared,
                    contradictions: cross.contradictions,
                    intraSurfaceInconsistencies: cross.intraSurfaceInconsistencies,
                    channelMismatches: cross.channelMismatches,
                    saturationThresholdDrift: cross.saturationThresholdDrift,
                    excludedPageScoped: cross.excludedPageScoped,
                    singleSurface: cross.singleSurface,
                    unmeasurableBySurface: cross.unmeasurableBySurface,
                    instrumentedGroupsBySurface: pass1.map((c) => ({
                        surface: c.surface,
                        groups: c.result.groups.length,
                    })),
                    keys: cross.keys,
                },
                null,
                1
            )
    )

    if (PLANT) {
        // The detector must FIRE on the planted contradiction and name it.
        const hit = cross.contradictions.find(
            (c) => c.key === planted[0]!.key && c.subject === planted[0]!.subject
        )
        expect(
            hit,
            `planted ${planted[0]!.key} did not fire — the detector is broken. Contradictions: ` +
                JSON.stringify(cross.contradictions)
        ).toBeTruthy()
        expect(hit!.surfaces).toContain("/dashboard")
        expect(hit!.surfaces).toContain(PLANT_SURFACE)
        expect(cross.verdict).toBe("contradicted")
    }
    // Real findings are Phase 5 input, printed above — deliberately NOT
    // asserted to zero (see header). The void/vacuous/session assertions are
    // the only gates this spec owns.
})
