import { describe, expect, it } from "vitest"
import { render } from "@testing-library/react"

import { ProtectionPrioritiesCard } from "@/components/dashboard/home/ProtectionPrioritiesCard"
import { ProtectionMapCard } from "@/components/onboarding/protection-profile/ProtectionMapCard"
// The lens is another agent's surface — imported read-only, so the three
// surfaces are asserted against ONE fixture rather than three beliefs.
import { AttentionAreasCard } from "@/components/protection/AttentionAreasCard"
import { areaListItems } from "@/components/protection/area-detail-model"
import { getTranslations } from "@/lib/i18n"
import { COUNT_KEYS } from "@/lib/instrumentation/count-keys"
import { mapRowsFrom } from "@/lib/onboarding/protection-profile/map-rows"
import { attentionSummary, buildAttentionAreas, type AttentionAreaView } from "@/lib/protection/attention-areas"
import { buildCoverageModel, type PolicyEvidenceInput } from "@/lib/protection/coverage-model"
import { AREAS } from "@/lib/protection/domains"
import { priorityCount } from "@/lib/protection/priority-count"
import { toLifeContext } from "@/lib/services/gap-engine/life-context"
import { assessRisks, type HeldPolicy } from "@/lib/services/gap-engine/risk-assessment"
import {
    deriveProtectionPriorities,
    type ProtectionPriority,
    type ProtectionStatementsLike,
} from "@/lib/services/protection-profile/derive-priorities"

/**
 * One fixture, three surfaces, one meaning per count key.
 *
 * The walk read `needs.priorityCount` as «5 σημεία» on the map's head,
 * «3 πράγματα» in its lead and «6» on the home; `attention.unknownCount` as
 * 1 on the map and 6 on the home; and the work area as «Δουλειά» on the map
 * beside «Εργασία» on the home and the lens. The definitions now live in
 * lib/instrumentation/count-keys.ts and lib/protection/priority-count.ts:
 *
 *   needs.priorityCount   — derived priorities that are not `watch`, over the
 *                           WHOLE set, the same number wherever it renders;
 *   attention.*           — over the rows THE SURFACE RENDERS, so the number
 *                           beside a list is always the list's own.
 *
 * Every surface here is rendered from the same composed bundle (facts →
 * exposure → protection → priorities → areas), and the assertions read the
 * DOM — the rows and the cells — never a summary computed on the side.
 */

const t = getTranslations("el")
const summaryLabels = t.onboarding.protectionProfile.summary
const mapLabels = t.onboarding.protectionProfile.map
const home = t.dashboard.home
const COPY = t.protection.attention

const cardLabels = {
    kicker: home.prioritiesKicker,
    lead: home.prioritiesLead,
    countLabel: home.prioritiesCountLabel,
    unsureLabel: home.prioritiesUnsureLabel,
    areaCountLabel: home.prioritiesAreaCountLabel,
    unknownCountLabel: home.prioritiesUnknownCountLabel,
    coveredCountLabel: home.prioritiesCoveredCountLabel,
    limitsUnread: home.prioritiesLimitsUnread,
    expiringSoon: home.prioritiesExpiringSoon,
    lapsedOnly: home.prioritiesLapsedOnly,
    noPolicies: home.prioritiesNoPolicies,
    uploadCta: home.prioritiesUploadCta,
    withPolicies: home.prioritiesWithPolicies,
    absenceCaveat: home.prioritiesAbsenceCaveat,
    alignmentCta: home.prioritiesAlignmentCta,
    disclaimer: home.prioritiesDisclaimer,
}

/** A self-employed parent with a car: household, income, work, mobility and health all have something to say. */
const PROFILE = {
    childrenCount: 1,
    dependentsCount: 2,
    employmentStatus: "self_employed",
    ownsBusiness: true,
    incomeDependency: "primary",
    vehiclesCount: 1,
    residenceType: "owned",
    ownsHome: true,
    answeredFields: ["childrenCount", "dependentsCount", "employmentStatus", "ownsBusiness", "incomeDependency", "vehiclesCount", "residenceType", "ownsHome"],
}
const SAID: ProtectionStatementsLike = { riskConcerns: ["income", "family"], unsureSteps: ["obligations"] }

/** A read life policy (held), a cancelled motor document (`other`) and a home policy that EXPIRED. */
const POLICIES: PolicyEvidenceInput[] = [
    { id: "life-1", lineOfBusiness: "life", lifecycle: "active", detail: "summary_only", gaps: [] },
    { id: "motor-cancelled", lineOfBusiness: "motor", lifecycle: "other", detail: "summary_only", gaps: [] },
    { id: "home-old", lineOfBusiness: "home", lifecycle: "expired", detail: "summary_only", gaps: [] },
]

function compose(): { priorities: ProtectionPriority[]; areas: AttentionAreaView[] } {
    const ctx = toLifeContext(PROFILE as any)
    const held: HeldPolicy[] = POLICIES.filter((p) => p.lifecycle === "active" || p.lifecycle === "expiring_soon").map((p) => ({ lineOfBusiness: p.lineOfBusiness, status: "active" }))
    const priorities = deriveProtectionPriorities(ctx, SAID)
    const areas = buildAttentionAreas({
        priorities,
        assessments: assessRisks(ctx, held),
        coverage: buildCoverageModel(POLICIES),
        provenance: {},
        ctx,
        needs: { riskConcerns: SAID.riskConcerns as string[] },
        language: "el",
    })
    return { priorities, areas }
}

/** The number a `data-count` cell renders — every cell for the key on the surface must agree; null when the surface has none. */
function countAt(container: HTMLElement, key: string): number | null {
    const cells = Array.from(container.querySelectorAll(`[data-count="${key}"]`))
    if (cells.length === 0) return null
    const values = cells.map((c) => Number((c.textContent ?? "").match(/\d+/)?.[0]))
    for (const v of values) expect(Number.isFinite(v), `${key} renders a number`).toBe(true)
    expect(new Set(values).size, `${key} renders ONE value on the surface`).toBe(1)
    return values[0]
}

/** The rows a surface renders, with the alignment each carries. */
function rowsOf(container: HTMLElement, selector: string): { area: string | null; alignment: string | null; text: string }[] {
    return Array.from(container.querySelectorAll<HTMLElement>(selector))
        .filter((el) => el.closest("details") === null)
        .map((el) => ({ area: el.getAttribute("data-area"), alignment: el.getAttribute("data-alignment"), text: el.textContent ?? "" }))
}

const { priorities, areas } = compose()
const surfaces = () => ({
    map: render(<ProtectionMapCard labels={summaryLabels} mapLabels={mapLabels} language="el" areas={areas} priorities={priorities} insight={null} confidence="gaps" unsureCount={1} countedTotal={10} />).container,
    card: render(<ProtectionPrioritiesCard areas={areas} priorities={priorities} unsureCount={1} policyCount={1} language="el" mapLabels={summaryLabels} labels={cardLabels} />).container,
    lens: render(<AttentionAreasCard items={areaListItems(areas, "el", COPY)} summary={attentionSummary(areas)} copy={COPY} />).container,
})

describe("one fixture, three surfaces: the count keys mean one thing each", () => {
    it("the fixture is worth asserting on: watch rows, a needs_review row, an `other` line and an expired line", () => {
        expect(priorities.some((p) => p.importance === "watch")).toBe(true)
        expect(priorities.some((p) => p.importance === "needs_review")).toBe(true)
        expect(priorities.filter((p) => p.importance === "high" || p.importance === "medium").length).toBeGreaterThan(3)
        expect(areas.find((a) => a.area === "mobility")?.protection.lines.map((l) => l.lifecycle)).toEqual(["other"])
        expect(areas.find((a) => a.area === "residence")?.protection.lines.map((l) => l.lifecycle)).toEqual(["expired"])
        expect(areas.find((a) => a.area === "household")?.alignment).toBe("appears_covered")
    })

    it("needs.priorityCount — the not-watch derived rows, over the whole set — is one number wherever it renders, and the map's lead carries none", () => {
        const expected = priorityCount(priorities)
        expect(expected).toBeGreaterThan(0)
        expect(expected).toBeLessThan(priorities.length)
        const s = surfaces()
        expect(countAt(s.card, "needs.priorityCount")).toBe(expected)
        for (const [name, container] of Object.entries(s)) {
            const value = countAt(container, "needs.priorityCount")
            if (value !== null) expect(value, name).toBe(expected)
        }
        // The map's lead sentence: no figure at all.
        const lead = s.map.querySelector("section > p")
        expect(lead?.textContent).toBe(summaryLabels.lead)
        expect(lead?.textContent).not.toMatch(/\d/)
        // And the home card does not render the ten-row universe or the rendered-row count under this key.
        expect(countAt(s.card, "needs.priorityCount")).not.toBe(priorities.length)
        expect(countAt(s.card, "needs.priorityCount")).not.toBe(s.card.querySelectorAll("li[data-area]").length)
    })

    it("attention.areaCount on each surface equals the rows THAT surface renders", () => {
        const s = surfaces()
        const rendered = {
            map: rowsOf(s.map, "li[data-alignment]"),
            card: rowsOf(s.card, "li[data-area]"),
            lens: rowsOf(s.lens, "a[data-area]"),
        }
        // Three different lists, three different — and each correct — numbers.
        expect(rendered.map.length).toBe(mapRowsFrom(areas, priorities).length)
        expect(rendered.card.length).toBe(3)
        expect(rendered.lens.length).toBe(areas.filter((a) => a.activated).length)
        expect(new Set([rendered.map.length, rendered.card.length, rendered.lens.length]).size).toBeGreaterThan(1)
        for (const [name, rows] of Object.entries(rendered)) {
            expect(countAt(s[name as keyof typeof s], "attention.areaCount"), name).toBe(rows.length)
        }
    })

    it("attention.unknownCount and attention.coveredCount on each surface are counted over that surface's own rows", () => {
        const s = surfaces()
        const rendered = {
            map: rowsOf(s.map, "li[data-alignment]"),
            card: rowsOf(s.card, "li[data-area]"),
            lens: rowsOf(s.lens, "a[data-area]"),
        }
        for (const [name, rows] of Object.entries(rendered)) {
            const container = s[name as keyof typeof s]
            const unknown = rows.filter((r) => r.alignment === "unknown").length
            const covered = rows.filter((r) => r.alignment === "appears_covered").length
            // A zero is rendered as an absent cell on the map and the lens, as «0» on the home.
            expect(countAt(container, "attention.unknownCount") ?? 0, `${name} unknown`).toBe(unknown)
            expect(countAt(container, "attention.coveredCount") ?? 0, `${name} covered`).toBe(covered)
        }
        // The map and the home disagree on unknownCount HERE by design — different rows — and neither is the ten-area figure.
        const universe = attentionSummary(areas)
        expect(countAt(s.card, "attention.unknownCount")).not.toBe(universe.unknownCount)
    })

    it("the work area is one word on all three surfaces — the table's «Εργασία»", () => {
        const s = surfaces()
        expect(AREAS.work.label.el).toBe("Εργασία")
        for (const [name, container] of Object.entries(s)) {
            expect(container.textContent, name).not.toMatch(/Δουλειά/)
        }
        expect(s.map.textContent).toContain(AREAS.work.label.el)
        expect(s.lens.textContent).toContain(AREAS.work.label.el)
    })

    it("a line we cannot place in time is not «lapsed» on any surface; an expired one is", () => {
        const s = surfaces()
        // The map: the lapsed caveat sits under residence (expired) and nowhere else — not under mobility (`other`).
        const mapRows = rowsOf(s.map, "li[data-alignment]")
        const mapLapsed = Array.from(s.map.querySelectorAll('[data-caveat="lapsed"]')).map((c) => c.closest("li")?.textContent ?? "")
        expect(mapLapsed.length).toBe(1)
        expect(mapLapsed[0]).toContain(AREAS.residence.label.el)
        expect(mapRows.find((r) => r.text.includes(AREAS.mobility.label.el))?.text).not.toContain(mapLabels.lapsedOnly)
        // The lens: same rule, its own copy.
        const lensRows = rowsOf(s.lens, "a[data-area]")
        expect(lensRows.find((r) => r.area === "mobility")?.text).not.toContain(COPY.caveats.lapsed_only)
        expect(Array.from(s.lens.querySelectorAll('a[data-area="residence"]')).some((a) => (a.textContent ?? "").includes(COPY.caveats.lapsed_only))).toBe(true)
        // The home: whichever rows it shows, none says lapsed over the `other` line.
        for (const li of Array.from(s.card.querySelectorAll('li[data-area="mobility"]'))) {
            expect(li.querySelector('[data-caveat="lapsed"]')).toBeNull()
        }
    })

    it("the registry says exactly this", () => {
        expect(COUNT_KEYS["needs.priorityCount"]).toMatch(/NOT `watch`/)
        expect(COUNT_KEYS["needs.priorityCount"]).toMatch(/WHOLE derived set/)
        for (const key of ["attention.areaCount", "attention.unknownCount", "attention.coveredCount"]) {
            expect(COUNT_KEYS[key], key).toMatch(/this surface renders/i)
        }
    })
})
