/**
 * WP-06 — a gap must rest on evidence, not on the absence of it.
 *
 * `evaluateAcordFieldCheck`'s `is_false` operator is `!actual`, which is true
 * for `undefined` and `null` as well as `false`. So a rule written against an
 * ACORD field reported a coverage gap whenever that field had never been
 * EXTRACTED — the policy the product understood least was the one it made the
 * most confident claims about. lib/gap-detection.ts already carries two
 * comments about this exact mistake, for `missing_coverage` (an empty coverage
 * summary made every configured rule fire at once) and for `low_limit`. The
 * ACORD path had it too.
 *
 * `explicitly_false` requires the extractor to have actually said so. Silence
 * yields no finding, which is the honest reading of "we don't know".
 *
 * The earthquake definition moves onto it and off `ai_check` at the same time.
 * That cover being optional rather than automatic is the single most
 * consequential thing a Greek homeowner can be told, and as an AI check it was
 * reported only when a completion happened to mention it.
 */
import { readFileSync } from "node:fs"
import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/db", () => ({ db: { gapDefinition: { findMany: vi.fn() } } }))

import { evaluateGapLogic } from "@/lib/gap-detection"

const SEED = readFileSync("prisma/seed.ts", "utf-8")

/** A home policy whose ACORD extraction says what it says. */
function homePolicy(property: Record<string, unknown> | undefined) {
    return {
        id: "policy-1",
        lineOfBusiness: "home",
        insurerName: "Εθνική Ασφαλιστική",
        startDate: new Date("2026-01-01"),
        endDate: new Date("2027-01-01"),
        acordData: property === undefined ? {} : { property },
    } as never
}

const earthquakeRule = {
    detectionLogic: {
        rules: [
            {
                type: "acord_field_check",
                field: "property.earthquakeCoverageIncluded",
                operator: "explicitly_false",
            },
        ],
        operator: "AND",
    },
} as never

const legacyRule = {
    detectionLogic: {
        rules: [
            {
                type: "acord_field_check",
                field: "property.earthquakeCoverageIncluded",
                operator: "is_false",
            },
        ],
        operator: "AND",
    },
} as never

describe("explicitly_false only fires on extracted evidence", () => {
    it("reports the gap when the extractor said the cover is absent", () => {
        expect(evaluateGapLogic(homePolicy({ earthquakeCoverageIncluded: false }), earthquakeRule)).toBe(true)
    })

    it("stays silent when the cover is present", () => {
        expect(evaluateGapLogic(homePolicy({ earthquakeCoverageIncluded: true }), earthquakeRule)).toBe(false)
    })

    it("stays silent when the field was never extracted", () => {
        // The defect, stated directly: nothing is known about this policy's
        // earthquake cover, so nothing may be claimed about it.
        expect(evaluateGapLogic(homePolicy({}), earthquakeRule)).toBe(false)
        expect(evaluateGapLogic(homePolicy({ earthquakeCoverageIncluded: null }), earthquakeRule)).toBe(false)
        expect(evaluateGapLogic(homePolicy(undefined), earthquakeRule)).toBe(false)
    })

    it("differs from is_false exactly where it matters", () => {
        // Vacuity floor for the change itself: if the two operators behaved the
        // same, every assertion above would pass without the fix existing.
        const unextracted = homePolicy({})

        expect(evaluateGapLogic(unextracted, legacyRule)).toBe(true)
        expect(evaluateGapLogic(unextracted, earthquakeRule)).toBe(false)
    })

    it("still agrees with is_false on a genuine false", () => {
        const absent = homePolicy({ earthquakeCoverageIncluded: false })

        expect(evaluateGapLogic(absent, legacyRule)).toBe(true)
        expect(evaluateGapLogic(absent, earthquakeRule)).toBe(true)
    })
})

describe("the seeded Greek home and pet gaps use it", () => {
    it("reads a real seed file", () => {
        // Vacuity floor: a moved or renamed seed would make the checks below
        // pass by matching nothing.
        expect(SEED).toContain("slug: 'home-earthquake'")
        expect(SEED).toContain("slug: 'missing_leishmaniasis'")
    })

    it("decides earthquake cover deterministically, not by asking a model", () => {
        const block = SEED.split("slug: 'home-earthquake'")[1].split("isActive")[0]

        expect(block).toContain("acord_deterministic")
        expect(block).toContain("property.earthquakeCoverageIncluded")
        expect(block).toContain("explicitly_false")
        expect(block).not.toContain("ai_check")
    })

    it("keeps earthquake at critical severity", () => {
        // A Greek home policy without it is the defining gap of this market;
        // determinism was the point, not a quieter finding.
        const block = SEED.split("slug: 'home-earthquake'")[1].split("isActive")[0]

        expect(block).toContain("severity: 'critical'")
    })

    it("no longer claims an unparsed pet policy excludes leishmaniasis", () => {
        const block = SEED.split("slug: 'missing_leishmaniasis'")[1].split("isActive")[0]

        expect(block).toContain("explicitly_false")
    })
})
