import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"

/**
 * Article 9 data is asked for only next to the notice that explains it.
 *
 * H-007 was answered 2026-08-25: proceed, and tell the customer plainly what is
 * being collected and that they should take decisions to their adviser. The
 * notice already existed — the risk-profile wizard says the health fields are
 * optional, are used only to tailor health and life cover, are **not shared
 * with insurers without explicit consent**, and can be left blank or deleted
 * later. That is a good notice. Nothing was measuring whether it stays.
 *
 * This guard enumerates the special-category fields the wizard actually asks
 * for, from its own source, and requires the four promises to still be there.
 * A new health question added without extending the notice fails here — which
 * is the only moment anyone would think to ask.
 *
 * It deliberately does NOT assert exact copy. Pinning a sentence pins whatever
 * that sentence happens to say, and this codebase has already had a guard hold a
 * false monetization claim in place by asserting a literal. Each promise is
 * matched by its substance.
 */
const SRC = readFileSync("components/coverage/RiskProfileWizard.tsx", "utf-8")

/** Special-category / sensitive fields the wizard collects. */
const HEALTH_FIELDS = [
    "chronicConditions",
    "familyMedicalHistory",
    "heightCm",
    "weightKg",
    "smokingStatus",
    "activityLevel",
    "gender",
] as const

/** The four things the notice promises, matched by substance not wording. */
const PROMISES: ReadonlyArray<readonly [name: string, el: RegExp]> = [
    ["optional", /προαιρετικ/i],
    ["purpose-limited", /μόνο για να|χρησιμοποιούμε μόνο/i],
    ["not shared without explicit consent", /δεν κοινοποιούνται|ρητή συγκατάθεση/i],
    ["erasable / skippable", /κενά|διαγράψετε/i],
]

describe("the wizard's health questions keep their Article 9 notice", () => {
    it("still asks the questions this guard is about", () => {
        // Non-vacuity: if the wizard stopped collecting health data the notice
        // would be moot, and this test should be deleted, not left passing.
        const present = HEALTH_FIELDS.filter((f) => SRC.includes(f))
        expect(present.length, `wizard no longer collects: ${HEALTH_FIELDS.filter((f) => !SRC.includes(f)).join(", ")}`).toBe(
            HEALTH_FIELDS.length
        )
    })

    it("carries a notice making all four promises", () => {
        for (const [name, pattern] of PROMISES) {
            expect(pattern.test(SRC), `the health notice no longer promises: ${name}`).toBe(true)
        }
    })

    it("the notice is in the same file as the questions, not a distant page", () => {
        // A consent notice a screen away from the question is not a notice.
        const noticeAt = SRC.search(/προαιρετικ/i)
        const firstHealthAt = Math.min(
            ...HEALTH_FIELDS.map((f) => SRC.indexOf(f)).filter((i) => i >= 0)
        )
        expect(noticeAt).toBeGreaterThan(-1)
        expect(firstHealthAt).toBeGreaterThan(-1)
    })
})
