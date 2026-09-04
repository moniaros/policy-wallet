import { beforeEach, describe, expect, it, vi } from "vitest"
import { readFileSync } from "node:fs"

const track = vi.hoisted(() => vi.fn())
vi.mock("@/lib/journey/funnel", () => ({ trackJourneyEvent: track }))

import { trackUpload } from "@/lib/onboarding/protection-profile/analytics"

/**
 * §J: the upload events carry the map they were asked from — which areas
 * were activated and how many rows still read «δεν έχουμε δει ακόμη
 * ασφαλιστήριο» — so «which area drives uploads» is answerable. Ids only,
 * joined with `+`; never a label, never a count of people.
 */
describe("the upload events carry the map context", () => {
    beforeEach(() => track.mockReset())

    const map = { activatedAreas: ["household", "income", "mobility"], notYetCheckedCount: 2 }

    it("policy_upload_started names the activated areas and the not-yet-checked count", () => {
        trackUpload("el", "started", map)
        expect(track).toHaveBeenCalledTimes(1)
        expect(track).toHaveBeenCalledWith("policy_upload_started", {
            locale: "el",
            source: "onboarding",
            activated_areas: "household+income+mobility",
            not_yet_checked_count: 2,
        })
    })

    it("first_policy_uploaded carries the same two fields; policy_upload_completed stays as it was", () => {
        trackUpload("el", "completed", map)
        expect(track).toHaveBeenCalledWith("policy_upload_completed", { locale: "el", source: "onboarding" })
        expect(track).toHaveBeenCalledWith("first_policy_uploaded", {
            source: "onboarding",
            activated_areas: "household+income+mobility",
            not_yet_checked_count: 2,
        })
    })

    it("a failure keeps its error code and adds nothing", () => {
        trackUpload("el", "failed", { activatedAreas: [], notYetCheckedCount: 0 }, "upload_failed")
        expect(track).toHaveBeenCalledWith("policy_upload_failed", { locale: "el", source: "onboarding", error_code: "upload_failed" })
    })

    it("both fields are registered on both events in the typed registry (additive)", () => {
        const src = readFileSync("types/journey-events.ts", "utf-8")
        for (const event of ["policy_upload_started", "first_policy_uploaded"]) {
            const block = src.slice(src.indexOf(`    ${event}: {`))
            const body = block.slice(0, block.indexOf("\n    }"))
            expect(body, event).toMatch(/activated_areas\?: string/)
            expect(body, event).toMatch(/not_yet_checked_count\?: number/)
        }
    })
})
