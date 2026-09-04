import { describe, expect, it, vi } from "vitest"
import { readFileSync } from "node:fs"
import { fireEvent, render } from "@testing-library/react"
import { alignmentText, ProtectionPrioritiesCard } from "@/components/dashboard/home/ProtectionPrioritiesCard"
import { ProtectionProfileResumeCard } from "@/components/dashboard/home/ProtectionProfileResumeCard"
import { getTranslations } from "@/lib/i18n"
import { ALIGNMENTS, type Alignment, type AttentionAreaView } from "@/lib/protection/attention-areas"
import { AREAS, type AttentionAreaId } from "@/lib/protection/domains"
import type { CoverageLine } from "@/lib/protection/coverage-model"
import { priorityCount } from "@/lib/protection/priority-count"
import type { ProtectionPriority } from "@/lib/services/protection-profile/derive-priorities"

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
    expiringSoon: home.prioritiesExpiringSoon,
    lapsedOnly: home.prioritiesLapsedOnly,
    noPolicies: home.prioritiesNoPolicies,
    uploadCta: home.prioritiesUploadCta,
    withPolicies: home.prioritiesWithPolicies,
    absenceCaveat: home.prioritiesAbsenceCaveat,
    alignmentCta: home.prioritiesAlignmentCta,
    disclaimer: home.prioritiesDisclaimer,
}

function heldLine(area: AttentionAreaId, detail: "summary_only" | "analysed" = "summary_only"): CoverageLine {
    return { lob: AREAS[area].lobFamilies[0] ?? "other", policyId: `pol-${area}`, lifecycle: "active", detail, evidence: "policy_verified", held: true, coverages: [] }
}

/** One composed area, shaped exactly as buildAttentionAreas returns it. */
function areaView(area: AttentionAreaId, over: Partial<AttentionAreaView> = {}): AttentionAreaView {
    const lines = over.protection?.lines ?? []
    const held = lines.filter((l) => l.held)
    const alignment = over.alignment ?? "not_yet_checked"
    return {
        area,
        domain: AREAS[area].domain,
        label: AREAS[area].label.el,
        importance: "high",
        activated: true,
        exposure: { risks: [] },
        unknownFactors: [],
        refinableFactors: [],
        protection: { lines, gaps: [], hasAnalysed: held.some((l) => l.detail === "analysed") },
        alignment,
        confidence: "user_reported",
        requiresValidation: held.length === 0,
        answeredBy: held,
        // As the composition derives them from the ANSWERING lines.
        limitsUnread: alignment === "appears_covered" && !held.some((l) => l.detail === "analysed"),
        expiringSoon: held.some((l) => l.lifecycle === "expiring_soon"),
        lapsedOnly: held.length === 0 && lines.length > 0,
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

/** One derived priority row, as deriveProtectionPriorities emits it. */
function prio(id: string, importance: ProtectionPriority["importance"]): ProtectionPriority {
    const domain = (id.split(":")[0] as ProtectionPriority["domain"]) ?? "household"
    return { id, domain, importance, reason: { id: "dependants", text: { el: "", en: "" } }, confidence: "known", requiresValidation: true, status: "needs_review", source: "declared_fact" }
}
/** Three that count (high, medium, needs_review) and one that does not (watch). */
const PRIORITIES: ProtectionPriority[] = [prio("household", "high"), prio("money:income", "medium"), prio("money:debt", "needs_review"), prio("health", "watch")]

function renderCard(areas: AttentionAreaView[], policyCount: number, priorities: ProtectionPriority[] = PRIORITIES) {
    return render(
        <ProtectionPrioritiesCard
            areas={areas}
            priorities={priorities}
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

    it("shows the top three of the composition's order, and the attention keys count THOSE rows — never the whole set", () => {
        // «6 περιοχές» under three visible rows was the contradiction: the
        // number beside a list is the list's own (count-keys.ts).
        const all = [...THREE, areasByAlignment.appears_covered, areasByAlignment.gap, areaView("work", { alignment: "unknown" })]
        const { container } = renderCard(all, 2)
        const rows = container.querySelectorAll("li[data-area]")
        expect(rows).toHaveLength(3)
        expect(container.querySelector('[data-count="attention.areaCount"]')?.textContent).toBe(String(rows.length))
        expect(container.querySelector('[data-count="attention.unknownCount"]')?.textContent).toBe(String([...rows].filter((li) => li.getAttribute("data-alignment") === "unknown").length))
        expect(container.querySelector('[data-count="attention.unknownCount"]')?.textContent).toBe("1")
        // The covered area is fourth in the order — off the card, so not counted by it.
        expect(container.querySelector('[data-count="attention.coveredCount"]')?.textContent).toBe("0")
        expect(container.querySelector('[data-count="needs.unsureCount"]')?.textContent).toBe("1")
        // Put the covered area first and the card's own count says so.
        const coveredFirst = renderCard([areasByAlignment.appears_covered, ...THREE], 2)
        expect(coveredFirst.container.querySelector('[data-count="attention.coveredCount"]')?.textContent).toBe("1")
        expect(coveredFirst.container.querySelector('[data-count="attention.areaCount"]')?.textContent).toBe("3")
    })

    it("needs.priorityCount is the one definition — derived rows that are not `watch`, over the WHOLE set, never a rendered-row count", () => {
        const { container } = renderCard(THREE, 0)
        expect(container.querySelector('[data-count="needs.priorityCount"]')?.textContent).toBe(String(priorityCount(PRIORITIES)))
        expect(container.querySelector('[data-count="needs.priorityCount"]')?.textContent).toBe("3")
        // Watch rows are context, not priorities; needs_review rows ARE counted (a fact to settle is a thing to look at).
        expect(priorityCount([prio("health", "watch"), prio("work", "watch")])).toBe(0)
        expect(priorityCount([prio("household", "needs_review")])).toBe(1)
        // Six derived rows over three shown rows still says six.
        const six = [prio("household", "high"), prio("money:income", "high"), prio("residence", "medium"), prio("money:debt", "medium"), prio("mobility", "medium"), prio("health", "needs_review")]
        expect(renderCard(THREE, 0, six).container.querySelector('[data-count="needs.priorityCount"]')?.textContent).toBe("6")
        // The number is derived inside the card through the shared helper — no caller hands it a figure.
        const src = readFileSync("components/dashboard/home/ProtectionPrioritiesCard.tsx", "utf-8")
        expect(src).toMatch(/import \{ priorityCount \} from "@\/lib\/protection\/priority-count"/)
        expect(src).toMatch(/\{priorityCount\(priorities\)\}/)
        expect(src).not.toMatch(/priorityCount:\s*number/)
    })

    it("the footer's «policies seen» reads the bundle's READ count, never the hero's stored-row count", () => {
        // An unread document (placeholder identity, EXTRACTION_EMPTY) is a
        // stored row the hero counts and a policy nobody has seen; the footer
        // that says «από τα ασφαλιστήρια που έχουμε δει» over it lies.
        const HOME = readFileSync("app/(protected)/dashboard/PolicyholderHome.tsx", "utf-8")
        const at = HOME.indexOf("<ProtectionPrioritiesCard")
        expect(at).toBeGreaterThan(0)
        const element = HOME.slice(at, HOME.indexOf("/>", at))
        expect(element).toMatch(/policyCount=\{attentionBundle\.policyCount\}/)
        expect(element).not.toMatch(/policyCount=\{policies\.length\}/)
        expect(element).toMatch(/priorities=\{protectionPriorities\}/)
        expect(element).not.toMatch(/priorityCount=/)
    })

    it("a line we cannot place in time is not «lapsed»: the card renders no lapsed line when the composition says none", () => {
        // The composition sets `lapsedOnly` only for an EXPIRED line
        // (isLapsedBand); an `other` line — cancelled, undated, still being
        // read — arrives with it false, and the card must not invent the caveat.
        const other = areaView("lifestyle", {
            protection: { lines: [{ ...heldLine("lifestyle"), lifecycle: "other", held: false }], gaps: [], hasAnalysed: false },
            lapsedOnly: false,
        })
        expect(other.requiresValidation).toBe(true)
        const { container } = renderCard([other], 1)
        expect(container.querySelector('[data-caveat="lapsed"]')).toBeNull()
        expect(container.textContent).not.toContain(home.prioritiesLapsedOnly)
        expect(container.querySelector("li")?.textContent).toContain(words.not_yet_checked)
    })

    it("absence is never evidence — the caveat renders with and without policies, and the two footer lines are separate", () => {
        const CAVEAT = "Το ότι δεν έχουμε δει ασφαλιστήριο για κάτι δεν σημαίνει ότι δεν υπάρχει."
        const none = renderCard(THREE, 0)
        expect(none.container.querySelector('[data-caveat="absence"]')?.textContent).toBe(CAVEAT)
        expect(none.container.querySelector('[data-footer="no_policies"]')?.textContent).toBe(home.prioritiesNoPolicies)
        expect(none.container.textContent).not.toContain(home.prioritiesWithPolicies)
        // The CTA names what the person will see — what the policies say — not a verdict on their protection.
        expect(none.container.querySelector("a")?.textContent).toContain("Δείτε τι λένε τα ασφαλιστήριά σας")
        expect(none.container.textContent).not.toMatch(/σωστά προστατευμ/)
        none.unmount()

        const some = renderCard(THREE, 2)
        expect(some.container.querySelector('[data-caveat="absence"]')?.textContent).toBe(CAVEAT)
        expect(some.container.querySelector('[data-footer="with_policies"]')?.textContent).toBe(home.prioritiesWithPolicies)
        expect(some.container.textContent).not.toContain(home.prioritiesNoPolicies)
        expect(home.prioritiesWithPolicies).not.toBe(CAVEAT)
        expect(some.container.querySelector("a")?.getAttribute("href")).toBe("/protection?lens=risk")
    })

    it("the home's monitor verdict words stay inside the entitled monitor card — never beside this card's alignment vocabulary", () => {
        // The pro-only watch speaks in verdicts («Εντάξει / Προσοχή / Απαιτείται
        // ενέργεια»); this card speaks in alignments. The two vocabularies
        // must not share a surface: the verdict labels are read only inside
        // the `monitorEntitled` branch, and this card never imports them.
        const HOME = readFileSync("app/(protected)/dashboard/PolicyholderHome.tsx", "utf-8")
        const uses = [...HOME.matchAll(/home\.monitorVerdict(Clear|Attention|Action)/g)].map((m) => m.index ?? 0)
        expect(uses).toHaveLength(3)
        const branch = HOME.indexOf("if (monitorEntitled && (hasPolicies || recentVersions.length > 0)) {")
        expect(branch).toBeGreaterThan(0)
        const branchEnd = HOME.indexOf("const monitorPlaceholderShown", branch)
        for (const at of uses) {
            expect(at).toBeGreaterThan(branch)
            expect(at).toBeLessThan(branchEnd)
        }
        const CARD = readFileSync("components/dashboard/home/ProtectionPrioritiesCard.tsx", "utf-8")
        expect(CARD).not.toMatch(/monitorVerdict|verdictLabel|MonitorSignalView/)
        for (const word of [home.monitorVerdictClear, home.monitorVerdictAttention, home.monitorVerdictAction]) {
            expect(renderCard(THREE, 1).container.textContent).not.toContain(word)
        }
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

    it("the limits caveat follows the composition's `limitsUnread`, not the area's own lines", () => {
        // Answered by an ANALYSED line held under another area: the area's own
        // `hasAnalysed` is false, the composition says the limits were read.
        const readElsewhere = areaView("household", {
            alignment: "appears_covered",
            confidence: "policy_verified",
            protection: { lines: [], gaps: [], hasAnalysed: false },
            requiresValidation: false,
            answeredBy: [heldLine("income", "analysed")],
            limitsUnread: false,
        })
        const read = renderCard([readElsewhere], 1)
        expect(read.container.querySelector("li")?.textContent).toContain(COVERED)
        expect(read.container.querySelector("li")?.textContent).not.toContain(home.prioritiesLimitsUnread)
        read.unmount()
        // And the other way round: the field says unread, the caveat renders.
        const unread = areaView("household", { ...readElsewhere, limitsUnread: true })
        expect(renderCard([unread], 1).container.querySelector("li")?.textContent).toContain(`${COVERED} — ${home.prioritiesLimitsUnread}`)
    })

    it("«λήγει σύντομα» rides on `expiringSoon` — on a held line only", () => {
        const expiring = areaView("mobility", {
            alignment: "appears_covered",
            confidence: "policy_verified",
            protection: { lines: [{ ...heldLine("mobility"), lifecycle: "expiring_soon" }], gaps: [], hasAnalysed: false },
        })
        expect(expiring.expiringSoon).toBe(true)
        const { container, unmount } = renderCard([expiring], 1)
        expect(container.querySelector("li")?.textContent).toContain(`${COVERED} — ${home.prioritiesLimitsUnread}, ${home.prioritiesExpiringSoon}`)
        unmount()
        // A finding on a line that ends within the month says so too.
        const gapExpiring = areaView("residence", { ...areasByAlignment.gap, expiringSoon: true })
        expect(renderCard([gapExpiring], 1).container.querySelector("li")?.textContent).toContain(`${GAP_TITLE.el} — ${home.prioritiesExpiringSoon}`)
        // Nothing held ⇒ nothing can be «about to end».
        const malformed = areaView("health", { expiringSoon: true })
        expect(renderCard([malformed], 1).container.textContent).not.toContain(home.prioritiesExpiringSoon)
    })

    it("a lapsed-only area says the policy ended — in the formal register, under the alignment word, never as cover", () => {
        const lapsed = areaView("residence", {
            protection: { lines: [{ ...heldLine("residence"), lifecycle: "expired", held: false }], gaps: [], hasAnalysed: false },
        })
        expect(lapsed.lapsedOnly).toBe(true)
        expect(lapsed.requiresValidation).toBe(true)
        const { container } = renderCard([lapsed], 1)
        const li = container.querySelector("li")!
        expect(li.textContent).toContain(words.not_yet_checked)
        expect(li.querySelector('[data-caveat="lapsed"]')?.textContent).toBe(home.prioritiesLapsedOnly)
        expect(home.prioritiesLapsedOnly).toMatch(/σας/)
        expect(li.textContent).not.toContain(COVERED)
        // A held line ⇒ no lapsed line, whatever the flag says.
        const held = areaView("residence", { ...areasByAlignment.appears_covered, lapsedOnly: true })
        expect(renderCard([held], 1).container.querySelector('[data-caveat="lapsed"]')).toBeNull()
        expect(renderCard(THREE, 0).container.querySelector('[data-caveat="lapsed"]')).toBeNull()
    })

    it("the caveats are read off the view's fields — the card never re-derives them from lines or matches a sentence", () => {
        const src = readFileSync("components/dashboard/home/ProtectionPrioritiesCard.tsx", "utf-8")
            .replace(/\/\*[\s\S]*?\*\//g, "")
            .replace(/(^|[^:"'`])\/\/.*$/gm, "$1")
        expect(src).toMatch(/area\.limitsUnread/)
        expect(src).toMatch(/area\.expiringSoon/)
        expect(src).toMatch(/area\.lapsedOnly/)
        expect(src).not.toMatch(/hasAnalysed/)
        expect(src).not.toMatch(/lifecycle\s*===/)
        expect(src).not.toMatch(/explanation\.(why|unknown|next)\b.*(includes|match|indexOf)/)
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
