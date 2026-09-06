import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { render } from "@testing-library/react"
import {
    assessmentState,
    authoredBranches,
    authoredCheckCount,
    isEvaluableDetectionLogic,
    isUnauthoredBranch,
    partitionByAssessment,
} from "@/lib/gaps/assessment-coverage"
import { AUTHORED_GAP_DEFINITIONS } from "@/lib/gaps/authored-catalogue"
import { resolveCoverageAbsenceCopy, type CoverageAbsenceCopy } from "@/lib/wallet/policy-detail"
import { describeFindingsProvenance, findingsProvenanceLine } from "@/lib/gaps/findings-provenance"
import { derivePortfolioCounts, portfolioFacts } from "@/lib/dashboard/portfolio-summary"
import { CoverageGapsWidget } from "@/components/dashboard/home/CoverageGapsWidget"
import { el } from "@/lib/i18n/translations/el"
import { en } from "@/lib/i18n/translations/en"

/**
 * B1.5 — the unauthored-branch state (PW-TRANSPARENCY-02 amendment 01).
 *
 * Only eight branches carry authored rules; a policy in any other branch
 * produces zero findings because nothing was asked of it, and zero findings
 * used to render as reassurance. Asserted here on a fixture set of SIX
 * unauthored branches including `renters`:
 *   1. no surface state for such a policy implies adequacy or a zero-problem
 *      count — the absence state, the findings-card state and the provenance
 *      line all say "not assessed";
 *   2. the unassessed state is textually distinct from the missing-data and
 *      failed states in both locales;
 *   3. portfolio roll-ups never count an unassessed policy as assessed, and
 *      state how many they excluded.
 */
// PW-CONTENT-01 Goal 5 made `renters` an authored write branch (8 rules) and added
// 3 home contents rules; the fixtures move to branches that stay unauthored and
// the counts are read from the catalogue rather than pinned by hand.
const UNAUTHORED = ["truck", "roadside", "pension", "cyber", "liability", "legal_expenses", "boat", "fine_art", "gadget", "bicycle"]
const AUTHORED: Record<string, number> = Object.fromEntries([...new Set(AUTHORED_GAP_DEFINITIONS.map((d) => d.lineOfBusiness))].map((lob) => [lob, AUTHORED_GAP_DEFINITIONS.filter((d) => d.lineOfBusiness === lob).length]))

const REASSURANCE = /Καλή κάλυψη|Εντάξει|Επαρκής|Προστατευμέν|Σε καλή κατάσταση|Κανένα εύρημα|Δεν εντοπίστηκαν|you are covered|good coverage|all clear|no gaps found|no findings/i

describe("which branches have authored checks", () => {
    it("the nine authored branches carry exactly the counted rules; every fixture branch carries none", () => {
        expect(authoredBranches()).toEqual(Object.keys(AUTHORED).sort())
        for (const [branch, n] of Object.entries(AUTHORED)) expect(authoredCheckCount(branch), branch).toBe(n)
        expect(UNAUTHORED.length).toBeGreaterThanOrEqual(6)
        for (const branch of UNAUTHORED) {
            expect(authoredCheckCount(branch), branch).toBe(0)
            expect(isUnauthoredBranch(branch), branch).toBe(true)
        }
        // renters is its own line since Goal 5: it inherits nothing from home and carries its own eight.
        expect(authoredCheckCount("home")).toBe(8)
        expect(authoredCheckCount("renters")).toBe(8)
        expect(authoredCheckCount("fine_art")).toBe(0)
    })

    it("the client-safe evaluable-rule check agrees with the engine's on every authored definition and on the prompt shapes", () => {
        // Every authored definition is a rule (the catalogue's own contract).
        for (const d of AUTHORED_GAP_DEFINITIONS) expect(isEvaluableDetectionLogic(d.detectionLogic), d.slug).toBe(true)
        // The two non-rule shapes hasEvaluableRule rejects.
        expect(isEvaluableDetectionLogic({ check: "Does the policy cover earthquake?" })).toBe(false)
        expect(isEvaluableDetectionLogic({ source: "ai_clarity_pipeline" })).toBe(false)
        expect(isEvaluableDetectionLogic(null)).toBe(false)
        expect(isEvaluableDetectionLogic({ rules: [{ notAType: 1 }] })).toBe(false)
        expect(isEvaluableDetectionLogic({ type: "always" })).toBe(true)
        // And the per-branch totals sum to the catalogue.
        const total = Object.values(AUTHORED).reduce((a, b) => a + b, 0)
        expect(total).toBe(AUTHORED_GAP_DEFINITIONS.length)
    })

    it("assessment state: unauthored beats analysed, not_analysed beats nothing", () => {
        const analysed = new Date("2026-08-01")
        for (const branch of UNAUTHORED) {
            expect(assessmentState({ lineOfBusiness: branch, lastAnalyzedAt: analysed })).toBe("unauthored")
            expect(assessmentState({ lineOfBusiness: branch, lastAnalyzedAt: null })).toBe("unauthored")
        }
        expect(assessmentState({ lineOfBusiness: "motor", lastAnalyzedAt: null })).toBe("not_analysed")
        expect(assessmentState({ lineOfBusiness: "motor", lastAnalyzedAt: analysed })).toBe("assessed")
    })
})

describe("no adequacy-implying state for an unauthored branch", () => {
    const copyFor = (lang: "el" | "en"): CoverageAbsenceCopy => (lang === "el" ? el : en).wallet.policyDetailsPage as unknown as CoverageAbsenceCopy

    it("the coverage-absence state is `unassessed` on a completed run, distinct from missing data and failure", () => {
        for (const lang of ["el", "en"] as const) {
            const copy = copyFor(lang)
            const unassessed = resolveCoverageAbsenceCopy("completed", null, copy, 0)
            expect(unassessed.absence).toBe("unassessed")
            expect(unassessed.title).not.toMatch(REASSURANCE)
            expect(unassessed.hint).not.toMatch(REASSURANCE)
            // Degraded runs on an unauthored branch are still unassessed — the
            // missing sections change nothing about a check that does not exist.
            expect(resolveCoverageAbsenceCopy("completed_with_warnings", null, copy, 0).absence).toBe("unassessed")
            // Failed / blocked keep their own states: the run did not complete.
            expect(resolveCoverageAbsenceCopy("failed", null, copy, 0).absence).toBe("failed")
            expect(resolveCoverageAbsenceCopy("blocked", "ai_consent_missing", copy, 0).absence).toBe("blocked")
            // Authored branch, same run status: the existing states are untouched.
            expect(resolveCoverageAbsenceCopy("completed", null, copy, 6).absence).toBe("empty")

            const others = ["never", "failed", "degraded", "empty"].map((s) =>
                resolveCoverageAbsenceCopy(s === "never" ? undefined : s === "degraded" ? "completed_with_warnings" : s, null, copy, 6)
            )
            for (const other of others) {
                expect(other.title, `${lang} ${other.absence}`).not.toBe(unassessed.title)
                expect(other.hint, `${lang} ${other.absence}`).not.toBe(unassessed.hint)
            }
        }
    })

    it("the findings provenance line says «not assessed» for a completed run that attempted zero rules", () => {
        const run = { id: "r1", status: "completed", finishedAt: new Date("2026-09-01T09:00:00Z"), attemptedRuleCount: 0 }
        const p = describeFindingsProvenance([], run, run)
        expect(p.state).toBe("unassessed")
        for (const lang of ["el", "en"] as const) {
            const line = findingsProvenanceLine(p, (lang === "el" ? el : en).gapProvenance, lang)
            expect(line.tone).toBe("warning")
            expect(line.text).not.toMatch(REASSURANCE)
        }
    })

    it("the findings card renders the unassessed state, not «no gaps», when the provenance says so", () => {
        const card = readFileSync("app/(protected)/wallet/[id]/AnalysisCard.tsx", "utf8")
        expect(card).toMatch(/findingsProvenance\?\.state === "unassessed"/)
        expect(card).toMatch(/t\.analysis\.unassessedTitle/)
        expect(el.analysis.unassessedTitle).not.toBe(el.analysis.noGaps)
        expect(el.analysis.unassessedTitle).not.toMatch(REASSURANCE)
        expect(en.analysis.unassessedTitle).not.toMatch(REASSURANCE)
    })
})

describe("portfolio roll-ups exclude unassessed policies and say how many", () => {
    const analysed = new Date("2026-08-01")
    const future = new Date("2027-06-01")
    const policies = [
        ...UNAUTHORED.slice(0, 6).map((lineOfBusiness, i) => ({ id: `u${i}`, status: "active", lineOfBusiness, endDate: future, lastAnalyzedAt: analysed })),
        { id: "m1", status: "active", lineOfBusiness: "motor", endDate: future, lastAnalyzedAt: analysed },
        { id: "h1", status: "active", lineOfBusiness: "home", endDate: future, lastAnalyzedAt: analysed },
        { id: "h2", status: "active", lineOfBusiness: "health", endDate: future, lastAnalyzedAt: null },
    ]

    it("partitions six unauthored, two assessed, one not analysed", () => {
        const p = partitionByAssessment(policies)
        expect(p.unauthored.map((x) => x.id).sort()).toEqual(["u0", "u1", "u2", "u3", "u4", "u5"])
        expect(p.assessed.map((x) => x.id).sort()).toEqual(["h1", "m1"])
        expect(p.notAnalysed.map((x) => x.id)).toEqual(["h2"])
        expect(p.excludedCount).toBe(7)
    })

    it("derivePortfolioCounts carries the split and portfolioFacts states the excluded count", () => {
        const counts = derivePortfolioCounts(policies, new Date("2026-09-05"))
        expect(counts.total).toBe(9)
        expect(counts.unassessed).toBe(6)
        expect(counts.assessed).toBe(2)
        // neverAnalysed is the analysis dimension and overlaps: the unauthored
        // ones WERE analysed, so only h2 counts here.
        expect(counts.neverAnalysed).toBe(1)
        const kinds = portfolioFacts(counts).map((f) => f.kind)
        expect(kinds).toContain("unassessed")
        expect(portfolioFacts(counts).find((f) => f.kind === "unassessed")?.count).toBe(6)
    })

    it("a zero tally names its denominator and its exclusions, in both locales", () => {
        for (const lang of ["el", "en"] as const) {
            const home = (lang === "el" ? el : en).dashboard.home
            const labels = {
                kicker: home.gapsKicker,
                noGaps: home.noGaps,
                noGapsAmongAssessedOne: home.noGapsAmongAssessedOne,
                noGapsAmongAssessedMany: home.noGapsAmongAssessedMany,
                assessmentExcludedOne: home.assessmentExcludedOne,
                assessmentExcludedMany: home.assessmentExcludedMany,
                noGapsNothingAssessed: home.noGapsNothingAssessed,
                provenance: { legislative: "l", contractual: "c", market: "m" },
                underReviewOmitted: "omitted",
                underReviewLink: "link",
                note: null,
                groupLabel: "g",
            }
            const zero = { legislative: 0, contractual: 0, market: 0, underReview: 0 }

            const some = render(
                <CoverageGapsWidget counts={zero} assessment={{ assessedPolicies: 2, excludedPolicies: 7 }} labels={labels} variant="embedded" />
            )
            expect(some.container.textContent).toContain("2")
            expect(some.container.textContent).toContain("7")
            expect(some.container.querySelector('[data-count="portfolio.unassessedCount"]')).not.toBeNull()
            expect(some.container.textContent).not.toBe(home.noGaps)
            some.unmount()

            const none = render(
                <CoverageGapsWidget counts={zero} assessment={{ assessedPolicies: 0, excludedPolicies: 9 }} labels={labels} variant="embedded" />
            )
            expect(none.container.querySelector('[data-assessment-state="nothing_assessed"]')).not.toBeNull()
            expect(none.container.textContent).toBe(home.noGapsNothingAssessed)
            expect(none.container.textContent).not.toMatch(REASSURANCE)
            none.unmount()
        }
    })

    it("the home page passes the denominator and labels the unassessed fact", () => {
        const home = readFileSync("app/(protected)/dashboard/PolicyholderHome.tsx", "utf8")
        expect(home).toMatch(/assessedPolicies: portfolioInput\.assessed/)
        expect(home).toMatch(/unassessed: \[home\.factUnassessedOne, home\.factUnassessedMany\]/)
        // The reason travels as the cell's note, never folded back into the count's words.
        expect(home).toMatch(/note = kind === 'unassessed' \? home\.factUnassessedWhy : undefined/)
        const hero = readFileSync("components/dashboard/home/ProtectionStatusHero.tsx", "utf8")
        expect(hero).toMatch(/unassessed: "portfolio\.unassessedCount"/)
    })
})
