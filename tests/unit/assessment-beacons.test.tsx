import { beforeEach, describe, expect, it, vi } from "vitest"
import { render } from "@testing-library/react"
import { readFileSync } from "node:fs"
import React from "react"

const track = vi.hoisted(() => vi.fn())
vi.mock("@/lib/journey/funnel", () => ({ trackJourneyEvent: track }))

import { AreasCreatedBeacon, AssessmentStartedBeacon, LimitsLockedBeacon } from "@/components/protection/AssessmentBeacons"

/**
 * The attention surfaces' analytics (docs/planning/PERSONAL_RISK_PROFILE.md
 * §J), on rendered mounts:
 *
 *   attention_area_created — once per session per area, deduped through the
 *   SAME sessionStorage key the onboarding map uses, so a session that
 *   announced an area at map time does not announce it again on the lens;
 *   risk_assessment_started — carries days_since_last_visit from localStorage,
 *   null on a first visit, and survives a storage that throws;
 *   feature_locked_viewed {feature_requested: "limits", area} — once per
 *   detail mount, in the funnel's own payload shape.
 */

const AREA = (area: string) => ({ area, importance: "high", confidence: "inferred", alignment: "unknown" })

beforeEach(() => {
    track.mockClear()
    window.sessionStorage.clear()
    window.localStorage.clear()
})

describe("attention_area_created", () => {
    it("emits once per area with importance, confidence and alignment, and remembers them for the session", () => {
        render(<AreasCreatedBeacon areas={[AREA("household"), AREA("income")]} />)
        expect(track).toHaveBeenCalledTimes(2)
        expect(track).toHaveBeenCalledWith("attention_area_created", { area: "household", importance: "high", confidence: "inferred", alignment: "unknown" })
        expect(JSON.parse(window.sessionStorage.getItem("pw:onboarding:attention_area_created")!)).toEqual(["household", "income"])

        // A second mount in the same session: nothing new for the same areas, one for a new one.
        track.mockClear()
        render(<AreasCreatedBeacon areas={[AREA("household"), AREA("mobility")]} />)
        expect(track).toHaveBeenCalledTimes(1)
        expect(track.mock.calls[0]![1]).toMatchObject({ area: "mobility" })
    })

    it("shares the onboarding map's dedupe key, so an area announced at map time is not announced again on the lens", () => {
        const flow = readFileSync("app/onboarding/ProtectionProfileFlow.tsx", "utf-8")
        const beacons = readFileSync("components/protection/AssessmentBeacons.tsx", "utf-8")
        const key = flow.match(/const AREA_CREATED_KEY = "([^"]+)"/)?.[1]
        expect(key).toBeTruthy()
        expect(beacons).toContain(`const AREA_CREATED_KEY = "${key}"`)

        window.sessionStorage.setItem(key!, JSON.stringify(["household"]))
        render(<AreasCreatedBeacon areas={[AREA("household"), AREA("debt")]} />)
        expect(track).toHaveBeenCalledTimes(1)
        expect(track.mock.calls[0]![1]).toMatchObject({ area: "debt" })
    })
})

describe("risk_assessment_started", () => {
    it("reports null days since last visit on a first visit, then the whole days elapsed", () => {
        vi.spyOn(Date, "now").mockReturnValue(Date.UTC(2026, 8, 4, 10))
        render(<AssessmentStartedBeacon activatedCount={3} />)
        expect(track).toHaveBeenCalledWith("risk_assessment_started", { source: "protection", activated_count: 3, days_since_last_visit: null })
        expect(window.localStorage.getItem("pw:risk_assessment_last_visit")).toBe(String(Date.UTC(2026, 8, 4, 10)))

        // A later session, five and a half days on: 5 whole days.
        window.sessionStorage.clear()
        track.mockClear()
        vi.spyOn(Date, "now").mockReturnValue(Date.UTC(2026, 8, 9, 22))
        render(<AssessmentStartedBeacon activatedCount={3} />)
        expect(track.mock.calls[0]![1]).toMatchObject({ days_since_last_visit: 5 })
        vi.restoreAllMocks()
    })

    it("still emits, with null, when storage throws", () => {
        const getItem = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
            throw new Error("blocked")
        })
        render(<AssessmentStartedBeacon activatedCount={1} />)
        expect(track).toHaveBeenCalledWith("risk_assessment_started", expect.objectContaining({ days_since_last_visit: null }))
        getItem.mockRestore()
    })
})

describe("feature_locked_viewed on the area detail", () => {
    it("emits the funnel's payload shape once per mount, naming the feature and the area", () => {
        const { rerender } = render(<LimitsLockedBeacon area="household" />)
        rerender(<LimitsLockedBeacon area="household" />)
        expect(track).toHaveBeenCalledTimes(1)
        expect(track).toHaveBeenCalledWith("feature_locked_viewed", { feature_requested: "limits", screen: "protection_area", area: "household" })
    })
})
