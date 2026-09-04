import { describe, expect, it, vi } from "vitest"
import { readFileSync } from "node:fs"
import { fireEvent, render } from "@testing-library/react"
import { alignmentText, ProtectionPrioritiesCard } from "@/components/dashboard/home/ProtectionPrioritiesCard"
import { ProtectionProfileResumeCard } from "@/components/dashboard/home/ProtectionProfileResumeCard"
import { getTranslations } from "@/lib/i18n"
import { ALIGNMENTS, attentionSummary, type Alignment, type AttentionAreaView } from "@/lib/protection/attention-areas"
import { AREAS, type AttentionAreaId } from "@/lib/protection/domains"
import type { CoverageLine } from "@/lib/protection/coverage-model"

const track = vi.hoisted(() => vi.fn())
vi.mock("@/lib/journey/funnel", () => ({ trackJourneyEvent: track }))

const t = getTranslations("el")
const home = t.dashboard.home
const words = t.protection.attention.alignment
const COVERED = words.appears_covered
const labels = {
    kicker: home.prioritiesKicker,
    lead: home.prioritiesLead,
    countLabel: home.prioritiesCountLabel,
    unsureLabel: home.prioritiesUnsureLabel,
    areaCountLabel: home.prioritiesAreaCountLabel,
    unknownCountLabel: home.prioritiesUnknownCountLabel,
    coveredCountLabel: home.prioritiesCoveredCountLabel,
    limitsUnread: home.prioritiesLimitsUnread,
    noPolicies: home.prioritiesNoPolicies,
    uploadCta: home.prioritiesUploadCta,
    withPolicies: home.prioritiesWithPolicies,
    alignmentCta: home.prioritiesAlignmentCta,
    disclaimer: home.prioritiesDisclaimer,
}

function heldLine(area: AttentionAreaId, detail: "summary_only" | "analysed" = "summary_only"): CoverageLine {
    return { lob: AREAS[area].lobFamilies[0] ?? "other", policyId: `pol-${area}`, lifecycle: "active", detail, evidence: "policy_verified", held: true, coverages: [] }
}

/** One composed area, shaped exactly as buildAttentionAreas returns it. */
function areaView(area: AttentionAreaId, over: Partial<AttentionAreaView> = {}): AttentionAreaView {
    const lines = over.protection?.lines ?? []
    return {
        area,
        domain: AREAS[area].domain,
        label: AREAS[area].label.el,
        importance: "high",
        activated: true,
        exposure: { risks: [] },
        unknownFactors: [],
        protection: { lines, gaps: [], hasAnalysed: lines.some((l) => l.held && l.detail === "analysed") },
        alignment: "not_yet_checked",
        confidence: "user_reported",
        requiresValidation: !lines.some((l) => l.held),
        explanation: { why: "", unknown: "", next: "", nextStep: "check_first_policy", density: "collapsed" },
        ...over,
    }
}

const GAP_TITLE = { el: "Χωρίς κάλυψη σεισμού", en: "No earthquake cover" }
const RULE_GAP = { id: "gap-1", ruleId: "no-earthquake-cover", slug: "no-earthquake-cover", severity: "high", title: GAP_TITLE, policyId: "pol-residence", onHeldPolicy: true }

const areasByAlignment: Record<Alignment, AttentionAreaView> = {
    not_yet_checked: areaView("household"),
    unknown: areaView("income", { alignment: "unknown", confidence: "unknown", importance: "needs_review" }),
    appears_covered: areaView("mobility", { alignment: "appears_covered", confidence: "policy_verified", protection: { lines: [heldLine("mobility")], gaps: [], hasAnalysed: false } }),
    review: areaView("residence", { alignment: "review", importance: "medium" }),
    gap: areaView("residence", { alignment: "gap", confidence: "policy_verified", protection: { lines: [heldLine("residence", "analysed")], gaps: [RULE_GAP], hasAnalysed: true } }),
}

function renderCard(areas: AttentionAreaView[], policyCount: number) {
    return render(
        <ProtectionPrioritiesCard
            areas={areas}
            summary={attentionSummary(areas)}
            priorityCount={3}
            unsureCount={1}
            policyCount={policyCount}
            language="el"
            mapLabels={t.onboarding.protectionProfile.summary}
            labels={labels}
        />
    )
}

const THREE = [areasByAlignment.not_yet_checked, areasByAlignment.unknown, areasByAlignment.review]

describe("ProtectionPrioritiesCard — the top attention areas on the home", () => {
    it("speaks in the app's plural voice, carries no score, no dialog and no upload action of its own", () => {
        const { container } = renderCard(THREE, 0)
        const text = container.textContent ?? ""
        expect(text).toContain(home.prioritiesDisclaimer)
        expect(text).toContain("Από όσα μας είπατε. Δεν έχουμε δει ακόμη τι καλύπτουν τα ασφαλιστήριά σας.")
        expect(text).toContain(t.protection.attention.confidence.user_reported)
        expect(text).not.toMatch(/\bσου\b|\bσε\s+εσένα\b|ανέφερες|ξεκαθάρισες/)
        expect(text).not.toMatch(/\d\s?%/)
        expect(text).not.toMatch(/σκορ|score|βαθμ|ανασφάλιστ/i)
        expect(container.querySelector('[data-action="upload"]')).toBeNull()
        expect(container.querySelector('[role="dialog"]')).toBeNull()
        expect(container.querySelectorAll("button")).toHaveLength(0)
        expect(container.querySelectorAll("a")).toHaveLength(1)
        expect(container.querySelector("a")?.getAttribute("href")).toBe("/wallet/add")
        expect(container.querySelector('[aria-live="polite"]')).toBeTruthy()
    })

    it("renders each shown area with its label, importance word, alignment word and confidence phrase", () => {
        const { container } = renderCard(THREE, 0)
        const rows = [...container.querySelectorAll("li")]
        expect(rows.map((li) => li.getAttribute("data-area"))).toEqual(["household", "income", "residence"])
        expect(rows[0].textContent).toContain(AREAS.household.label.el)
        expect(rows[0].textContent).toContain(t.onboarding.protectionProfile.summary.importance.high)
        expect(rows[0].textContent).toContain(words.not_yet_checked)
        expect(rows[1].textContent).toContain(t.onboarding.protectionProfile.summary.importance.needs_review)
        expect(rows[1].textContent).toContain(words.unknown)
        expect(rows[1].textContent).toContain(t.protection.attention.confidence.unknown)
        expect(rows[2].textContent).toContain(words.review)
    })

    it("shows the top three of the composition's order and counts the whole set under the attention keys", () => {
        const all = [...THREE, areasByAlignment.appears_covered, areasByAlignment.gap, areaView("work", { alignment: "unknown" })]
        const { container } = renderCard(all, 2)
        expect(container.querySelectorAll("li")).toHaveLength(3)
        expect(container.querySelector('[data-count="needs.priorityCount"]')?.textContent).toBe("3")
        expect(container.querySelector('[data-count="needs.unsureCount"]')?.textContent).toBe("1")
        expect(container.querySelector('[data-count="attention.areaCount"]')?.textContent).toBe("6")
        expect(container.querySelector('[data-count="attention.unknownCount"]')?.textContent).toBe("2")
        expect(container.querySelector('[data-count="attention.coveredCount"]')?.textContent).toBe("1")
    })

    it("with policies, the footer says absence is not evidence and links to the risk lens", () => {
        const { container } = renderCard(THREE, 2)
        expect(container.textContent).toContain("Το ότι δεν έχουμε δει ασφαλιστήριο για κάτι δεν σημαίνει ότι δεν υπάρχει.")
        expect(container.textContent).not.toContain(home.prioritiesNoPolicies)
        expect(container.querySelector("a")?.getAttribute("href")).toBe("/protection?lens=risk")
    })

    it("its one link records what the person set out to do", () => {
        track.mockReset()
        const first = renderCard(THREE, 0)
        fireEvent.click(first.container.querySelector("a")!)
        expect(track).toHaveBeenLastCalledWith("action_started", { kind: "check_first_policy", area: undefined })
        first.unmount()
        const second = renderCard(THREE, 1)
        fireEvent.click(second.container.querySelector("a")!)
        expect(track).toHaveBeenLastCalledWith("action_started", { kind: "review_finding", area: undefined })
    })
})

describe("one alignment, one word", () => {
    it.each(ALIGNMENTS.filter((a) => a !== "gap"))("%s renders its dictionary word", (alignment) => {
        const area = areasByAlignment[alignment]
        const { container } = renderCard([area], 1)
        expect(container.querySelector("li")?.getAttribute("data-alignment")).toBe(alignment)
        expect(container.querySelector("li")?.textContent).toContain(words[alignment])
    })

    it("gap speaks the finding's own title, not the generic word", () => {
        const { container } = renderCard([areasByAlignment.gap], 1)
        expect(container.querySelector("li")?.textContent).toContain(GAP_TITLE.el)
        expect(container.querySelector("li")?.textContent).not.toContain(words.gap)
        // Without a held finding on the view, the generic word is all it may say.
        expect(alignmentText(areaView("residence", { alignment: "gap" }), "el", labels)).toBe(words.gap)
    })

    it("appears_covered on a summary-only area carries the limits caveat; an analysed one does not", () => {
        const summaryOnly = renderCard([areasByAlignment.appears_covered], 1)
        expect(summaryOnly.container.querySelector("li")?.textContent).toContain(`${COVERED} — ${home.prioritiesLimitsUnread}`)
        summaryOnly.unmount()

        const analysed = areaView("mobility", { alignment: "appears_covered", confidence: "policy_verified", protection: { lines: [heldLine("mobility", "analysed")], gaps: [], hasAnalysed: true } })
        const { container } = renderCard([analysed], 1)
        expect(container.querySelector("li")?.textContent).toContain(COVERED)
        expect(container.querySelector("li")?.textContent).not.toContain(home.prioritiesLimitsUnread)
    })
})

describe("the covered word is honest", () => {
    it("never renders for any alignment other than appears_covered", () => {
        for (const alignment of ALIGNMENTS) {
            if (alignment === "appears_covered") continue
            const { container, unmount } = renderCard([areasByAlignment[alignment]], 1)
            expect(container.textContent, alignment).not.toContain(COVERED)
            unmount()
        }
    })

    it("never renders without a held line — a view claiming cover with nothing held is downgraded, not repeated", () => {
        const malformed = areaView("health", { alignment: "appears_covered", confidence: "user_reported" })
        expect(malformed.protection.lines.some((l) => l.held)).toBe(false)
        expect(malformed.requiresValidation).toBe(true)
        const { container } = renderCard([malformed], 1)
        expect(container.textContent).not.toContain(COVERED)
        expect(container.querySelector("li")?.textContent).toContain(words.not_yet_checked)
    })

    it("every covered area the card renders has a held line behind it", () => {
        const areas = Object.values(areasByAlignment)
        const { container } = renderCard(areas.filter((a) => a.alignment === "appears_covered"), 1)
        for (const li of container.querySelectorAll("li")) {
            const area = areas.find((a) => a.area === li.getAttribute("data-area") && a.alignment === "appears_covered")!
            expect(li.textContent).toContain(COVERED)
            expect(area.protection.lines.some((l) => l.held)).toBe(true)
        }
    })

    it("the card never spells the covered word itself — it comes from the dictionary keyed by the alignment", () => {
        // Code only — the file's comments may name the word to explain the rule.
        const src = readFileSync("components/dashboard/home/ProtectionPrioritiesCard.tsx", "utf-8")
            .replace(/\/\*[\s\S]*?\*\//g, "")
            .replace(/(^|[^:"'`])\/\/.*$/gm, "$1")
        expect(src).not.toContain(COVERED)
        expect(src).not.toMatch(/καλύπτ/i)
        expect(src).toMatch(/alignmentLabel\(/)
    })
})

describe("ProtectionProfileResumeCard", () => {
    it.each(["in_progress", "start"] as const)("%s is one link into /onboarding", (variant) => {
        const { container } = render(
            <ProtectionProfileResumeCard variant={variant} labels={{ kicker: home.resumeStartKicker, body: home.resumeStartBody, cta: home.resumeStartCta }} />
        )
        const link = container.querySelector("a")
        expect(link?.getAttribute("href")).toBe("/onboarding")
        expect(link?.getAttribute("data-variant")).toBe(variant)
        expect(container.querySelectorAll("a")).toHaveLength(1)
        expect(container.textContent).toContain(home.resumeStartCta)
    })
})
