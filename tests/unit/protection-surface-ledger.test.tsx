/**
 * LEDGER GUARD for «Η προστασία μου» (/protection) — V2-P2-01, §4.2.
 *
 * Every capability the transformation ledger marks KEEP for the three absorbed
 * surfaces must RENDER on /protection:
 *
 *   /branches                → B-01…B-06 (ανά κλάδο lens)
 *   /insights/risk-profile   → R-01…R-08 (ανά κίνδυνο lens)
 *   /coverage-insights       → A-05…A-09 (surviving engine content)
 *
 * THE UNIVERSE (D-005 — a guard states what it walks and what it claims):
 *
 *   subject — the RENDERED DOM of ProtectionSurface, the exact component the
 *   route's page.tsx returns (the page itself is an async RSC doing DB reads;
 *   the surface takes the same data as props, which is what makes the whole
 *   tree renderable here). Assertions are on rendered output, never on file
 *   contents — a capability that survives in source but stops rendering is
 *   precisely the regression this guard exists to catch.
 *
 *   enumeration — expected content is derived from runtime sources, not
 *   hand-written lists:
 *     · branch tiles from INSURANCE_BRANCHES (the taxonomy the lens itself
 *       renders from) + getBranchContent for taglines;
 *     · per-branch counts through policiesInBranch (the real helper);
 *     · risk rows from assembleRiskGraph over a profile+wallet fixture;
 *     · watch signals from assembleWatch over the same wallet;
 *     · household figures from the graph's own summary (the cross-check the
 *       two render sites are meant to satisfy);
 *     · count/fact keys from the §6.7 registry (household.* enumerated from
 *       COUNT_KEYS, never re-listed).
 *
 *   probe — the "checked and clear vs never looked" split (§2.2 / honesty
 *   invariant) is asserted in both directions: the SAME unowned line must
 *   render «Δεν έχει αξιολογηθεί» when no assessment ever ran and «Χωρίς
 *   ασφαλιστήριο» when one did, and the finding register («Πιθανό κενό»)
 *   must appear nowhere.
 */
import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import React from "react"

import { LanguageProvider } from "@/contexts/LanguageContext"
import { TranslationsProvider } from "@/contexts/TranslationsProvider"
import { getTranslations } from "@/lib/i18n"
import { INSURANCE_BRANCHES, normalizeBranch } from "@/lib/insurance/taxonomy"
import { getBranchContent } from "@/lib/insurance/content"
import { policiesInBranch, type BranchPolicyFacts, type BranchTileState } from "@/lib/insurance/branch-page"
import { assembleRiskGraph } from "@/lib/services/risk-graph/service"
import { assembleWatch } from "@/lib/services/risk-dna/service"
import { COUNT_KEYS, SUBJECT_SCOPED_KEYS, isRegisteredCountKey } from "@/lib/instrumentation/count-keys"
import { QUICK_START_QUESTIONS } from "@/lib/services/onboarding/quick-start"
import { getUpgradeCopy } from "@/lib/monetization"
import { GAP_SEVERITIES, SEVERITY_CAVEAT_KEY, describeSeverity, toGapSeverity } from "@/lib/gaps/severity-display"
import { orderByProvenance } from "@/lib/gaps/provenance"
import { displayInsurerName } from "@/lib/wallet/policy-identity"
import { ProtectionSurface, type ProtectionSurfaceProps } from "@/components/protection/ProtectionSurface"
import { attentionSummary, buildAttentionAreas } from "@/lib/protection/attention-areas"
import { buildCoverageModel } from "@/lib/protection/coverage-model"
import { AREA_IDS } from "@/lib/protection/domains"
import { toLifeContext } from "@/lib/services/gap-engine/life-context"
import { assessRisks, factorsToResolve } from "@/lib/services/gap-engine/risk-assessment"
import { deriveProtectionPriorities } from "@/lib/services/protection-profile/derive-priorities"
import { areaListItems, unknownFactorItems } from "@/components/protection/area-detail-model"

const t = getTranslations("el")

// ── Fixtures ──────────────────────────────────────────────────────────

const NOW = new Date("2026-08-25T10:00:00Z")
const inDays = (d: number) => new Date(NOW.getTime() + d * 86_400_000)

/** Held policies with LIFECYCLE status already applied (the page's contract). */
const BRANCH_POLICIES: BranchPolicyFacts[] = [
    { id: "mot-1", lineOfBusiness: "motor", status: "active", endDate: inDays(200) },
    { id: "mot-2", lineOfBusiness: "motor", status: "active", endDate: inDays(300) },
    { id: "home-1", lineOfBusiness: "home", status: "expired", endDate: inDays(-30) },
]

/** The same portfolio for the watch (raw shape: acordData carries the term). */
const WATCH_POLICIES = [
    { id: "mot-1", lineOfBusiness: "motor", status: "active", insurerName: "Ethniki", endDate: inDays(200), acordData: { policy: { expirationDate: inDays(200).toISOString().slice(0, 10) } } },
    { id: "mot-2", lineOfBusiness: "motor", status: "active", insurerName: "Ethniki", endDate: inDays(10), acordData: { policy: { expirationDate: inDays(10).toISOString().slice(0, 10) } } },
    { id: "home-1", lineOfBusiness: "home", status: "active", insurerName: "Ethniki", endDate: inDays(-30), acordData: { policy: { expirationDate: inDays(-30).toISOString().slice(0, 10) } } },
]

/** A profile with declared, partly-unowned exposures (drives the risk graph). */
const PROFILE = {
    dependentsCount: 2,
    childrenCount: 0,
    employmentStatus: "employed",
    hasPets: true,
    petsCount: 1,
    vehiclesCount: 1,
    annualIncome: 32000,
    residenceType: "rented",
    answeredFields: [
        "dependentsCount",
        "childrenCount",
        "employmentStatus",
        "hasPets",
        "petsCount",
        "vehiclesCount",
        "annualIncome",
        "residenceType",
    ],
}

const GRAPH_WALLET = [
    { id: "mot-1", lineOfBusiness: "motor", status: "active", insurerName: "Ethniki", endDate: inDays(200), acordData: null },
]

const graph = assembleRiskGraph(PROFILE, GRAPH_WALLET)

// The attention areas (PA-01/PA-02) over the SAME profile and wallet, through
// the real assembly: facts → toLifeContext, exposure → assessRisks, protection
// → buildCoverageModel, importance → deriveProtectionPriorities.
const ATTENTION_CTX = toLifeContext(PROFILE as any)
const ATTENTION_ASSESSMENTS = assessRisks(ATTENTION_CTX, [{ lineOfBusiness: "motor", status: "active" }])
const ATTENTION_AREAS = buildAttentionAreas({
    priorities: deriveProtectionPriorities(ATTENTION_CTX, null),
    assessments: ATTENTION_ASSESSMENTS,
    coverage: buildCoverageModel([{ id: "mot-1", lineOfBusiness: "motor", lifecycle: "active", detail: "summary_only", gaps: [] }]),
    provenance: {},
    ctx: ATTENTION_CTX,
    needs: {},
    language: "el",
})
const ATTENTION_UNKNOWN = unknownFactorItems(factorsToResolve(ATTENTION_ASSESSMENTS), ATTENTION_AREAS, "el")
const ATTENTION = {
    items: areaListItems(ATTENTION_AREAS, "el", t.protection.attention),
    summary: attentionSummary(ATTENTION_AREAS),
    unknownFactors: ATTENTION_UNKNOWN,
    copy: t.protection.attention,
}
const watch = assembleWatch({
    profile: null,
    policies: WATCH_POLICIES,
    latestVersion: null,
    lastAssessedAt: null,
    now: NOW,
})

const bl = (el: string, en: string) => ({ el, en })

const INTELLIGENCE = {
    health: {
        index: 62,
        band: "fair" as const,
        components: [{ id: "coverage", label: bl("Κάλυψη", "Coverage"), value: 40, weight: 1 }],
        whatChanged: null,
        whyItMatters: bl("Όσο πληρέστερη η εικόνα, τόσο πιο αληθινά όσα λέμε.", "The fuller the picture, the truer what we say."),
        nextAction: bl("Συμπληρώστε το προφίλ σας", "Complete your profile"),
        confidence: "medium" as const,
    },
    household: {
        // The graph's OWN summary — the cross-check both render sites must satisfy.
        memberCount: 1 + graph.summary.dependants,
        dependantCount: graph.summary.dependants,
        assetCount: graph.summary.assets,
        obligationCount: graph.summary.obligations,
        sharedExposures: [],
        whyItMatters: bl("Ό,τι συμβεί σε εσάς αγγίζει κι εκείνους.", "What happens to you touches them too."),
        nextAction: null,
    },
    dimensions: [
        {
            id: "mobility",
            label: bl("Μετακίνηση", "Mobility"),
            question: bl("Αν τρακάρετε αύριο;", "If you crash tomorrow?"),
            score: 55,
            coarse: false,
            confidence: "medium" as const,
            confidenceLimit: null,
            trend: "steady" as const,
            trendDelta: null,
            urgency: "medium" as const,
            whatChanged: null,
            whyItMatters: bl("Το όχημα είναι καθημερινή έκθεση.", "The vehicle is a daily exposure."),
            nextAction: null,
            ifActioned: null,
            openCount: 1,
            applicableCount: 2,
            risks: [
                {
                    riskId: "motor_liability",
                    name: bl("Αστική ευθύνη οχήματος", "Motor liability"),
                    status: "protected",
                    priority: "high",
                    whyItMatters: bl("Υποχρεωτική εκ του νόμου.", "Required by law."),
                    whyItApplies: bl("Δηλώσατε 1 όχημα.", "You declared 1 vehicle."),
                    actions: [],
                    coveredBy: [],
                },
            ],
        },
    ],
    trends: [
        {
            dimension: "mobility",
            label: bl("Μετακίνηση", "Mobility"),
            direction: "worsening" as const,
            netDelta: -5,
            whatChanged: bl("Η κάλυψη του οχήματος πλησιάζει στη λήξη.", "Vehicle cover is approaching expiry."),
        },
    ],
    watch,
    predictions: [
        {
            id: "pred-1",
            kind: "observation" as const,
            label: bl("Χωρίς συνταξιοδοτικό πρόγραμμα", "No pension arrangement"),
            detail: bl("Δεν έχετε δηλώσει συνταξιοδοτική πρόνοια.", "You have declared no pension provision."),
            probability: null,
        },
    ],
    graph: { views: graph.views, summary: graph.summary },
    // Present on the service's return type; the surface must never render it (H-001).
    protectionScore: { value: 77, indeterminate: false },
} as any

const RECOMMENDATION = {
    id: "rec-1",
    lineOfBusiness: "home",
    ruleId: "contents-cover",
    title: bl("Κάλυψη περιεχομένου κατοικίας", "Home contents cover"),
    description: bl("Το περιεχόμενο του σπιτιού σας δεν καλύπτεται.", "Your home contents are not covered."),
    urgency: "medium" as const,
    estimatedCostEur: null,
    personalReason: bl("Μένετε σε ενοικιαζόμενη κατοικία.", "You live in a rented home."),
    status: "active",
    createdAt: NOW.toISOString(),
}

const LIFE_EVENT_OPTION = {
    id: "moved_home",
    domain: "home",
    label: bl("Μετακόμιση", "Moved home"),
    description: bl("Αλλάξατε κατοικία.", "You changed residence."),
    needsMagnitude: false,
    magnitudeLabel: null,
    alreadyRecorded: false,
}

const BRANCH_LABELS = {
    stateLabels: {
        covered: t.branches.statusCovered,
        attention: t.branches.statusAttention,
        not_held: t.branches.statusNotHeld,
        neutral: t.branches.statusNeutral,
    } as Record<BranchTileState, string>,
    policyTypeLabels: t.policyTypes as Record<string, string>,
    onePolicy: t.branches.onePolicy,
    policyCountN: t.branches.policyCountN,
}

// ── Findings fixtures (A-10…A-21 — the carried /coverage-insights surface) ──

/** Active-coverage policies as the findings section receives them (pre-mapped). */
const FINDING_POLICIES = [
    { id: "mot-1", insurerName: "Εθνική", lineOfBusiness: { code: "motor", name: "Αυτοκίνητο" } },
    { id: "mot-2", insurerName: "Interamerican", lineOfBusiness: { code: "motor", name: "Αυτοκίνητο" } },
    { id: "home-ok", insurerName: "Allianz", lineOfBusiness: { code: "home", name: "Κατοικία" } },
]

/**
 * One open finding per severity the registry knows — enumerated from
 * GAP_SEVERITIES, so a fifth severity grows this fixture by itself. The first
 * two land on mot-1, the rest on mot-2; home-ok carries none (A-13's subject).
 */
const FINDING_GAPS = GAP_SEVERITIES.map((severity, i) => {
    const policyId = i < 2 ? "mot-1" : "mot-2"
    return {
        id: `gap-${severity}`,
        policyId,
        severity,
        title: `Σημείο ελέγχου (${severity})`,
        description: `Περιγραφή ευρήματος (${severity})`,
        policy: { id: policyId, lineOfBusiness: "motor" },
    }
})

const FINDING_STATS = {
    critical: FINDING_GAPS.filter((g) => g.severity === "critical").length,
    high: FINDING_GAPS.filter((g) => g.severity === "high").length,
    medium: FINDING_GAPS.filter((g) => g.severity === "medium").length,
    low: FINDING_GAPS.filter((g) => g.severity === "low").length,
    totalGaps: FINDING_GAPS.length,
    totalPolicies: FINDING_POLICIES.length,
    totalCoverage: 0,
}

const EMPTY_STATS = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    totalGaps: 0,
    totalPolicies: FINDING_POLICIES.length,
    totalCoverage: 0,
}

/** Expired policies the tally deliberately leaves out (A-12 names them). */
const EXCLUDED_EXPIRED = [
    { id: "exp-1", label: "Εθνική Ασφαλιστική" },
    { id: "exp-2", label: "Ευρωπαϊκή Πίστη" },
]

function resolveCopyKey(key: string): string {
    let node: any = t
    for (const part of key.split(".")) node = node?.[part]
    if (typeof node !== "string") throw new Error(`i18n key ${key} does not resolve to a string`)
    return node
}

/** The rendered card carrying this finding, found by its title. */
function findingCard(container: HTMLElement, title: string): Element | null {
    const heading = Array.from(container.querySelectorAll("h3")).find(
        (h) => h.textContent?.trim() === title
    )
    return heading?.closest(".relative") ?? null
}

// ── The story's fixtures (rebuild 2026-09-07): the REAL derivation over a small wallet ──
import { deriveCoverageStatus } from "@/lib/protection/coverage-status"
import { chooseProtectionNextStep, type ProtectionNextStepFacts } from "@/lib/protection/next-step"
import { provenanceOf } from "@/lib/gaps/provenance"
import { provenanceLabelWithCitation } from "@/components/gaps/provenance-label"
import { currentCatalogueVersion } from "@/lib/gaps/composition"
import { AUTHORED_GAP_DEFINITIONS } from "@/lib/gaps/authored-catalogue"
import type { GapItemView } from "@/components/protection/GapList"

const MOTOR_ACORD = {
    coverages: [{ name: "Αστική ευθύνη", limit: 1000000 }],
    vehicle: {
        ownVehicleDamage: true,
        glassBreakage: true,
        hasRoadsideAssistance: true,
        insuredValue: 12000,
        estimatedMarketValue: 12000,
        greenCardExpiryDate: "2027-06-01",
        accidentDeclarationPhone: "+30 210 0000000",
    },
}
const HOME_ACORD = {
    coverages: [{ name: "Πυρκαγιά" }],
    property: {
        fireCoverageIncluded: true,
        earthquakeCoverageIncluded: true,
        floodCoverageIncluded: true,
        insuredValue: 200000,
        estimatedRebuildCost: 200000,
    },
}
const COVERAGE_POLICIES = [
    { id: "mot-1", lineOfBusiness: "motor", status: "active", policyNumber: "MOT-1", insurerName: "Ethniki", endDate: inDays(200), acordData: MOTOR_ACORD, lastAnalyzedAt: inDays(-5) },
    { id: "mot-2", lineOfBusiness: "motor", status: "active", policyNumber: "MOT-2", insurerName: "Interamerican", endDate: inDays(300), acordData: MOTOR_ACORD, lastAnalyzedAt: inDays(-5) },
    { id: "home-1", lineOfBusiness: "home", status: "active", policyNumber: "HOME-1", insurerName: "Allianz", endDate: inDays(250), acordData: HOME_ACORD, lastAnalyzedAt: inDays(-5) },
    { id: "health-1", lineOfBusiness: "health", status: "active", policyNumber: "HEALTH-1", insurerName: "Ethniki", endDate: inDays(-30), acordData: {}, lastAnalyzedAt: inDays(-60) },
    { id: "travel-1", lineOfBusiness: "travel", status: "active", policyNumber: "TRV-1", insurerName: "Ethniki", endDate: inDays(100), acordData: {}, lastAnalyzedAt: null },
]
const slugsOf = (lob: string) => AUTHORED_GAP_DEFINITIONS.filter((d) => d.lineOfBusiness === lob).map((d) => d.slug)
const completedRun = (policyId: string, slugs: string[]) => ({
    id: `run-${policyId}`,
    policyId,
    status: "completed",
    createdAt: inDays(-5),
    finishedAt: inDays(-5),
    attemptedRules: { slugs, catalogueVersion: currentCatalogueVersion() },
})
const COVERAGE_RUNS = [completedRun("mot-1", slugsOf("motor")), completedRun("mot-2", slugsOf("motor")), completedRun("home-1", slugsOf("home"))]
const CLASSIFIED_SLUG = "insured_value_above_declared"
const UNDER_REVIEW_SLUG = "no_glass_breakage_cover"
const COVERAGE_GAP_ROWS = [
    { policyId: "mot-2", slug: CLASSIFIED_SLUG, analysisRunId: "run-mot-2", runFinishedAt: inDays(-5) },
    { policyId: "mot-1", slug: UNDER_REVIEW_SLUG, analysisRunId: "run-mot-1", runFinishedAt: inDays(-5) },
]
const EXPECTED_LINES = ["motor", "home", "health", "pet", "life"]
const COVERAGE = deriveCoverageStatus({
    policies: COVERAGE_POLICIES,
    gapRows: COVERAGE_GAP_ROWS,
    runs: COVERAGE_RUNS,
    expectedLines: EXPECTED_LINES,
    coverHeldElsewhere: ["life"],
    now: NOW,
})
const POLICY_TYPE_LABELS = t.policyTypes as Record<string, string>

function gapItem(id: string, policyId: string, slug: string, title: string): GapItemView {
    return {
        id,
        policyId,
        title,
        meaning: `Τι σημαίνει (${slug})`,
        why: t.protection.why[provenanceOf(slug)],
        provenanceLabel: provenanceLabelWithCitation(slug, "el", t.provenance),
        area: "Μετακίνηση",
        branch: POLICY_TYPE_LABELS.motor || "Αυτοκίνητο",
    }
}
const GAP_ITEMS = [gapItem("gap-1", "mot-2", CLASSIFIED_SLUG, "Ασφαλισμένη αξία πάνω από την αγοραία")]
const GAP_UNDER_REVIEW = [gapItem("gap-ur", "mot-1", UNDER_REVIEW_SLUG, "Χωρίς κάλυψη θραύσης κρυστάλλων")]
const THREE_ITEMS = [CLASSIFIED_SLUG, "missing_enfia_components", "insured_value_below_rebuild_cost"].map((slug, i) =>
    gapItem(`gap-three-${i}`, "mot-2", slug, `Εύρημα ${i + 1}`)
)
const NEXT_STEP_FACTS: ProtectionNextStepFacts = {
    inForcePolicyCount: 4,
    analysedPolicyCount: 3,
    deepAnalysisAllowed: true,
    summary: COVERAGE.summary,
    classifiedFindingCount: GAP_ITEMS.length,
    unknownFactorCount: ATTENTION_UNKNOWN.length,
    recommendationCount: 1,
}
const REFRESH = { refresh: t.insights.refreshAnalysis, refreshing: t.insights.refreshingAnalysis, failed: t.insights.refreshFailed }

function nextStepProps(facts: ProtectionNextStepFacts): ProtectionSurfaceProps["nextStep"] {
    const step = chooseProtectionNextStep(facts)
    return { step, title: t.protection.nextStep.title, body: t.protection.nextStep[step.id].body, cta: t.protection.nextStep[step.id].cta }
}

function surfaceProps(overrides: Partial<ProtectionSurfaceProps> = {}): ProtectionSurfaceProps {
    return {
        language: "el",
        lens: "branch",
        labels: {
            title: t.protection.title,
            subtitle: t.protection.subtitle,
            lens: { aria: t.protection.lensAria, byBranch: t.protection.lensByBranch, byRisk: t.protection.lensByRisk },
            refresh: REFRESH,
            fullProfile: { title: t.protection.attention.detail.fullProfileTitle, lead: t.protection.attention.detail.fullProfileLead },
        },
        nextStep: nextStepProps(NEXT_STEP_FACTS),
        engineUnavailable: false,
        engineUnavailableText: t.protection.gaps.engineUnavailable,
        summary: { summary: COVERAGE.summary, heldElsewhereLabels: [POLICY_TYPE_LABELS.life || "Ζωή"], copy: { ...t.protection.summary, status: t.protection.status } },
        gaps: {
            items: GAP_ITEMS,
            underReview: GAP_UNDER_REVIEW,
            visibleLimit: 2,
            provenanceLine: { text: "Ευρήματα από την ανάλυση της 20 Αυγούστου 2026.", tone: "neutral", state: "current" },
            state: "findings",
            isDeepAnalysisLocked: false,
            assessedCount: 3,
            excludedCount: 1,
            excludedExpired: ["Εθνική Ασφαλιστική"],
            copy: { ...t.protection.gaps, underReviewDisclosure: t.provenance.underReviewDisclosure },
        },
        categories: {
            rows: COVERAGE.rows,
            family: "all",
            status: null,
            copy: { ...t.protection.categories, status: t.protection.status, caveats: t.protection.statusCaveats, filters: t.protection.filters, policyTypeLabels: POLICY_TYPE_LABELS },
        },
        riskLens: null,
        life: { lifeEvents: { options: [LIFE_EVENT_OPTION], recent: [] }, wizard: { show: true, initialData: undefined }, copy: t.protection.life },
        improve: {
            recommendationCount: 1,
            showUpgradeTrigger: true,
            lastCheckedLabel: t.protection.improve.lastChecked.replace("{date}", "20 Αυγούστου 2026"),
            copy: { ...t.protection.improve, refresh: REFRESH },
        },
        ...overrides,
    }
}
function renderSurface(overrides: Partial<ProtectionSurfaceProps> = {}) {
    return render(
        <LanguageProvider>
            <TranslationsProvider>
                <ProtectionSurface {...surfaceProps(overrides)} />
            </TranslationsProvider>
        </LanguageProvider>
    )
}
const riskLensProps: Partial<ProtectionSurfaceProps> = {
    lens: "risk",
    riskLens: {
        intelligence: INTELLIGENCE,
        attention: ATTENTION,
        quickStart: { questions: QUICK_START_QUESTIONS, onSubmit: async () => ({ insight: null }) },
    },
}
const withGaps = (gaps: Partial<ProtectionSurfaceProps["gaps"]>): Partial<ProtectionSurfaceProps> => ({ gaps: { ...surfaceProps().gaps, ...gaps } })
const withCategories = (categories: Partial<ProtectionSurfaceProps["categories"]>): Partial<ProtectionSurfaceProps> => ({
    categories: { ...surfaceProps().categories, ...categories },
})
const withImprove = (improve: Partial<ProtectionSurfaceProps["improve"]>): Partial<ProtectionSurfaceProps> => ({ improve: { ...surfaceProps().improve, ...improve } })
const textOf = (el: Element | null) => (el?.textContent || "").replace(/\s+/g, " ").trim()
const firstNumber = (el: Element | null) => Number((textOf(el).match(/\d+/) || [NaN])[0])

describe("«ανά κίνδυνο» lens renders the attention areas (PA-01, PA-02) on rendered output", () => {
    it("enumerates a real universe (ten areas, some activated, at least one factor to resolve)", () => {
        expect(ATTENTION_AREAS.length).toBe(AREA_IDS.length)
        expect(ATTENTION_AREAS.some((a) => a.activated)).toBe(true)
        expect(ATTENTION_AREAS.some((a) => !a.activated)).toBe(true)
        expect(ATTENTION_UNKNOWN.length).toBeGreaterThan(0)
    })

    it("PA-01: every area renders as a row linking to its detail, carrying its label and its alignment word", () => {
        const { container } = renderSurface(riskLensProps)
        for (const view of ATTENTION_AREAS) {
            const row = container.querySelector(`a[href="/protection/areas/${view.area}"]`)
            expect(row, `PA-01: no row for ${view.area}`).toBeTruthy()
            expect(row!.textContent).toContain(view.label)
            expect(row!.textContent).toContain(t.protection.attention.alignment[view.alignment])
        }
    })

    it("PA-01: activated areas sit outside the dormant disclosure; dormant ones inside it, under «Δεν το εξετάσαμε ακόμη»", () => {
        const { container } = renderSurface(riskLensProps)
        const details = container.querySelector("section[aria-labelledby='attention-areas-heading'] details")
        expect(details, "no dormant disclosure").toBeTruthy()
        expect(details!.textContent).toContain(t.protection.attention.headings.dormant)
        for (const view of ATTENTION_AREAS) {
            const row = container.querySelector(`a[href="/protection/areas/${view.area}"]`)!
            expect(Boolean(row.closest("details")), `${view.area} activated=${view.activated}`).toBe(!view.activated)
        }
    })

    it("PA-01: the counts carry the registered attention.* keys and count the rows the card shows — the activated ones, folded dormant rows excluded", () => {
        const { container } = renderSurface(riskLensProps)
        const areaCount = container.querySelector('[data-count="attention.areaCount"]')
        expect(areaCount).toBeTruthy()
        const rendered = ATTENTION_AREAS.filter((a) => a.activated)
        expect(Number((areaCount!.textContent || "").match(/\d+/)?.[0])).toBe(rendered.length)
        expect(rendered.length).toBeLessThan(ATTENTION.summary.areaCount)
        for (const key of ["attention.areaCount", "attention.unknownCount", "attention.coveredCount"]) {
            expect(isRegisteredCountKey(key), `${key} is not registered`).toBe(true)
        }
        // One sentence, not figures: the three keys sit in one paragraph.
        const sentence = container.querySelector("[data-attention-counts]")!
        for (const el of Array.from(container.querySelectorAll('[data-count^="attention."]'))) expect(sentence.contains(el)).toBe(true)
    })

    it("I8: the watch renders LAST, inside the monitoring section, below the areas card — one verdict vocabulary above it", () => {
        const { container } = renderSurface(riskLensProps)
        const monitoring = container.querySelector('[data-surface="monitoring"]')!
        expect(monitoring, "no monitoring section").toBeTruthy()
        expect(monitoring.textContent).toContain(t.protection.attention.monitoring.title)
        expect(monitoring.textContent).toContain(t.protection.attention.monitoring.lead)
        // Every watch label still renders (R-06) — inside the framed section, never beside the areas.
        for (const signal of watch) expect(monitoring.textContent).toContain(signal.label.el)
        const areas = container.querySelector("section[aria-labelledby='attention-areas-heading']")!
        expect(areas.compareDocumentPosition(monitoring) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
        // The verdict words of the watch appear nowhere in the areas card.
        for (const signal of watch) expect(areas.textContent).not.toContain(signal.label.el)
    })

    it("PA-02: every factor the engine still needs renders as its noun, linking to the area that asks it", () => {
        const { container } = renderSurface(riskLensProps)
        for (const item of ATTENTION_UNKNOWN) {
            const link = container.querySelector(`section[aria-labelledby='unknown-factors-heading'] a[data-factor="${item.factor}"]`)
            expect(link, `PA-02: no row for ${item.factor}`).toBeTruthy()
            expect(link!.textContent).toContain(item.noun)
            expect(link!.getAttribute("href")).toBe(`/protection/areas/${item.area}`)
        }
    })

    it("PA-08: the wizard carries the «Πλήρες προφίλ» heading below the lens", () => {
        const { container } = renderSurface(riskLensProps)
        const anchor = container.querySelector("#risk-profile-wizard")
        expect(anchor!.textContent).toContain(t.protection.attention.detail.fullProfileTitle)
    })
})

// ── The ανά κλάδο lens: B-01…B-06 ────────────────────────────────────


const riskRows = (container: HTMLElement) =>
    Array.from(container.querySelectorAll("details")).filter(
        // The story's own disclosures (under-review findings, «Άλλες κατηγορίες», the folded wizard) are not risk rows either.
        (d) => !d.closest("[aria-labelledby='attention-areas-heading']") && !d.closest("#gaps") && !d.closest("#categories") && !d.closest("#life")
    )


describe("«ανά κίνδυνο» lens preserves R-01…R-08 on rendered output", () => {
    it("enumerates a real universe (the graph and the watch produced content)", () => {
        expect(graph.views.length).toBeGreaterThanOrEqual(3)
        expect(graph.views.some((v) => v.heldInLine === 0 && v.state === "unprotected")).toBe(true)
        expect(watch.length).toBeGreaterThan(0)
    })

    it("R-01: every risk the graph assembles renders as a row in «Τι προστατεύουμε»", () => {
        const { container } = renderSurface(riskLensProps)
        for (const view of graph.views) {
            expect(
                container.textContent,
                `R-01: risk ${view.riskId} assembled but not rendered`
            ).toContain(view.name.el)
        }
    })

    it("R-02: every rendered risk row carries a protection state, in words", () => {
        const { container } = renderSurface(riskLensProps)
        const stateWords = [
            "Προστατευμένο",
            "Μερικώς προστατευμένο",
            "Απροστάτευτο",
            "Άγνωστο",
            "Χωρίς ασφαλιστήριο",
        ]
        const rows = riskRows(container)
        expect(rows.length).toBe(graph.views.length)
        for (const view of graph.views) {
            const row = rows.find((r) => r.textContent?.includes(view.name.el))
            expect(row, `no row for ${view.riskId}`).toBeTruthy()
            expect(
                stateWords.some((w) => row!.textContent!.includes(w)),
                `R-02: ${view.riskId} renders no protection state in words`
            ).toBe(true)
        }
    })

    it("R-03: an unowned line is «Χωρίς ασφαλιστήριο» on its row, never «Απροστάτευτο»", () => {
        const { container } = renderSurface(riskLensProps)
        const rows = riskRows(container)
        const unowned = graph.views.filter((v) => v.heldInLine === 0 && v.state === "unprotected")
        expect(unowned.length).toBeGreaterThan(0)
        for (const view of unowned) {
            const row = rows.find((r) => r.textContent?.includes(view.name.el))
            expect(row, `no row for unowned ${view.riskId}`).toBeTruthy()
            expect(row!.textContent).toContain("Χωρίς ασφαλιστήριο")
            expect(row!.textContent).not.toContain("Απροστάτευτο")
        }
    })

    it("R-04 (H-005 ANSWERED: it should not exist) — no completeness metric, in any form", () => {
        const { container } = renderSurface(riskLensProps)
        // The owner answered H-005 on 2026-08-25: the second score should not
        // exist. This assertion was the opposite two hours ago — it required
        // the index to render — which is why it is written to fail loudly if
        // the metric returns rather than being deleted along with it.
        expect(
            container.querySelector('[data-fact="profile.healthIndex"]'),
            "the completeness index is back — H-005 says it should not exist"
        ).toBeNull()
        expect(
            container.querySelector('[data-fact="profile.healthComponent"]'),
            "component percentages are the index distributed — still the score"
        ).toBeNull()
        // The fixture's index is 62 and its band verdict «Καλή εικόνα»; neither
        // may appear. 77 is the protectionScore the service still returns
        // (H-001) and has never been renderable here.
        for (const forbidden of ["62", "77", "Καλή εικόνα", "Μερική εικόνα"]) {
            expect(container.textContent, `R-04: "${forbidden}" renders`).not.toContain(forbidden)
        }
        // What survives is the control, not a ranking — but `nextAction` is
        // null once the weakest area is answered well enough, and it is null in
        // this fixture. So the assertion is that the card does not render EMPTY
        // in that state, which is the defect removing the score could have left
        // behind: a bordered box saying nothing where a finding would go.
        const emptyCards = [...container.querySelectorAll(".pw-card")].filter(
            (c) => (c.textContent ?? "").trim() === ""
        )
        expect(emptyCards, "an empty card renders where the score used to be").toEqual([])
    })

    it("R-05: the household summary renders every household.* key from the §6.7 registry, agreeing with the graph", () => {
        const { container } = renderSurface(riskLensProps)
        const householdKeys = Object.keys(COUNT_KEYS).filter((k) => k.startsWith("household."))
        expect(householdKeys.length).toBe(4)
        const expected: Record<string, number> = {
            "household.memberCount": 1 + graph.summary.dependants,
            "household.dependantCount": graph.summary.dependants,
            "household.assetCount": graph.summary.assets,
            "household.obligationCount": graph.summary.obligations,
        }
        for (const key of householdKeys) {
            const els = Array.from(container.querySelectorAll(`[data-count="${key}"]`))
            expect(els.length, `R-05: ${key} renders nowhere`).toBeGreaterThan(0)
            for (const el of els) {
                const value = Number((el.textContent || "").match(/\d+/)?.[0])
                expect(value, `R-05: ${key} disagrees with the graph`).toBe(expected[key])
            }
        }
    })

    it("R-06: every watch signal the assembler produces renders, and the expired count wears the portfolio key", () => {
        const { container } = renderSurface(riskLensProps)
        for (const signal of watch) {
            expect(
                container.textContent,
                `R-06: watch signal ${signal.id} assembled but not rendered`
            ).toContain(signal.label.el)
        }
        const expired = container.querySelector('[data-count="portfolio.expiredCount"]')
        expect(expired, "R-06: the expired count must carry its registered key").toBeTruthy()
        expect(expired!.textContent).toContain("1")
    })

    it("R-07: the state filter renders — «Όλα» with the riskCount key, one subject-scoped chip per present state, summing to the whole", () => {
        const { container } = renderSurface(riskLensProps)
        const all = container.querySelector('[data-count="riskGraph.riskCount"]')
        expect(all, "R-07: no «Όλα» chip").toBeTruthy()
        expect(Number(all!.textContent)).toBe(graph.views.length)

        const stateChips = Array.from(
            container.querySelectorAll('[data-count="riskGraph.stateCount"]')
        )
        expect(stateChips.length).toBeGreaterThanOrEqual(2)
        const sum = stateChips.reduce(
            (acc, chip) => acc + Number((chip.textContent || "").match(/\d+/)?.[0] ?? 0),
            0
        )
        expect(sum, "R-07: state chips must partition the risk rows").toBe(graph.views.length)
        for (const chip of stateChips) {
            expect(chip.getAttribute("data-count-subject"), "state chips are subject-scoped").toBeTruthy()
        }
    })

    it("R-08: trends and predictions render — framed as observations, never forecasts (§2.10)", () => {
        const { container } = renderSurface(riskLensProps)
        expect(container.textContent).toContain("Η κάλυψη του οχήματος πλησιάζει στη λήξη.")
        expect(container.textContent).toContain("Χωρίς συνταξιοδοτικό πρόγραμμα")
        expect(container.textContent).toContain("όχι προβλέψεις")
    })

    it("the three-question opener survives the move (renders ahead of the intelligence for a thin profile)", () => {
        const { container } = renderSurface(riskLensProps)
        expect(container.textContent).toContain(QUICK_START_QUESTIONS[0].prompt.el)
    })

    it("health.nextAction points at THIS page's wizard, not the old route", () => {
        const { container } = renderSurface(riskLensProps)
        const link = Array.from(container.querySelectorAll("a")).find((a) =>
            a.textContent?.includes(INTELLIGENCE.health.nextAction.el)
        )
        expect(link).toBeTruthy()
        expect(link!.getAttribute("href")).toBe("#risk-profile-wizard")
    })
})

// ── The surviving /coverage-insights content: A-05…A-09 ──────────────


describe("the lens switch", () => {
    it("renders both lenses as addressable links, marking the active one", () => {
        const { container } = renderSurface()
        const byBranch = container.querySelector('a[href="/protection"]')
        const byRisk = container.querySelector('a[href="/protection?lens=risk"]')
        expect(byBranch).toBeTruthy()
        expect(byRisk).toBeTruthy()
        expect(byBranch!.textContent).toBe(t.protection.lensByBranch)
        expect(byRisk!.textContent).toBe(t.protection.lensByRisk)
        expect(byBranch!.getAttribute("aria-current")).toBe("page")
        expect(byRisk!.getAttribute("aria-current")).toBeNull()
    })

    it("renders exactly ONE lens per request — §6.7: two lenses stating one fact in one DOM is a measured contradiction", () => {
        // Marker moved off profile.healthIndex when H-005 deleted it. The risk
        // lens still owns the household facts, so they identify it now.
        const branchRender = renderSurface()
        expect(branchRender.container.querySelector('[data-count^="household."]')).toBeNull()
        branchRender.unmount()

        const riskRender = renderSurface(riskLensProps)
        expect(riskRender.container.querySelector('[data-count="branch.policyCount"]')).toBeNull()
        expect(riskRender.container.querySelector('[data-count^="household."]')).toBeTruthy()
    })
})


// ── The carried findings surface: A-10…A-21 (V2-P2-01b) ──────────────


// ── The story (rebuild 2026-09-07): PS-01…PS-10 and the re-homed A rows ─────
describe("the page opens as a story (Goals 2–3): title, one next step, then the picture, the gaps, the lens, the life, the foot", () => {
    it("the h1 is the menu's word for the page", () => {
        const { container } = renderSurface()
        expect(textOf(container.querySelector("h1"))).toBe(t.protection.title)
        expect(t.protection.title).toBe(t.nav.protection)
    })

    it("the regions render in the story's order on both lenses", () => {
        for (const props of [{}, riskLensProps]) {
            const { container, unmount } = renderSurface(props)
            const order = ["[data-next-step]", "#summary", "#gaps", `nav[aria-label="${t.protection.lensAria}"]`, "#life", "#improve"].map((sel) => container.querySelector(sel))
            for (const [i, el] of order.entries()) expect(el, `missing region ${i}`).toBeTruthy()
            for (let i = 1; i < order.length; i++) {
                expect(order[i - 1]!.compareDocumentPosition(order[i]!) & Node.DOCUMENT_POSITION_FOLLOWING, `region ${i} renders before region ${i - 1}`).toBeTruthy()
            }
            unmount()
        }
    })
})

/**
 * The story's primary: the banner's button. The life section's forms (the
 * profile wizard's save, the life-event panel's record) keep their own submit
 * buttons — a section's primary, inside a form the reader opened — so the
 * page rule is: exactly one primary OUTSIDE #life.
 */
const storyPrimaries = (container: HTMLElement) => Array.from(container.querySelectorAll(".pw-primary-button")).filter((b) => !b.closest("#life"))

describe("PS-07: exactly one primary action, decided from facts", () => {
    it("renders ONE .pw-primary-button outside the life section's forms on either lens, carrying the step's words and destination", () => {
        for (const props of [{}, riskLensProps]) {
            const { container, unmount } = renderSurface(props)
            const primaries = storyPrimaries(container)
            expect(primaries.length, "one primary per page").toBe(1)
            const banner = container.querySelector("[data-next-step]")!
            expect(banner.getAttribute("data-next-step")).toBe("gaps")
            expect(textOf(primaries[0])).toBe(t.protection.nextStep.gaps.cta)
            expect(primaries[0].getAttribute("href")).toBe("#gaps")
            unmount()
        }
    })

    it("an empty wallet asks for the first policy; nothing else on the page is a primary", () => {
        const { container } = renderSurface({ nextStep: nextStepProps({ ...NEXT_STEP_FACTS, inForcePolicyCount: 0 }), ...withGaps({ state: "no_policies", items: [], underReview: [] }) })
        const primaries = storyPrimaries(container)
        expect(primaries.length).toBe(1)
        expect(primaries[0].getAttribute("href")).toBe("/wallet/add")
        expect(textOf(primaries[0])).toBe(t.protection.nextStep.add_first.cta)
    })

    it("never analysed renders the analyse action as a button (the server action), still the only primary", () => {
        const { container } = renderSurface({ nextStep: nextStepProps({ ...NEXT_STEP_FACTS, analysedPolicyCount: 0 }) })
        const primaries = storyPrimaries(container)
        expect(primaries.length).toBe(1)
        expect(primaries[0].tagName).toBe("BUTTON")
        expect(primaries[0].getAttribute("data-action")).toBe("analyse")
    })
})

describe("PS-01: the summary — four counted doors over a visible denominator, never a verdict", () => {
    it("enumerates a real universe: one branch per status, one under review folded into a finding, one held elsewhere", () => {
        expect(COVERAGE.summary).toMatchObject({ appearsCovered: 1, finding: 1, noPolicy: 2, notChecked: 1, underReviewOnly: 0, relevantCount: 5, heldElsewhere: 1 })
        expect(COVERAGE.rows.find((r) => r.branch.id === "motor")).toMatchObject({ status: "finding", findingCount: 1, underReviewCount: 1 })
    })

    it("each door carries its registered key, its status word, its meaning and the derivation's number, and links to the filtered list", () => {
        const { container } = renderSurface()
        const doors: Array<[string, string, number]> = [
            ["appears_covered", "branch.coveredCount", COVERAGE.summary.appearsCovered],
            ["finding", "branch.findingCount", COVERAGE.summary.finding],
            ["no_policy", "branch.noPolicyCount", COVERAGE.summary.noPolicy],
            ["not_checked", "branch.notCheckedCount", COVERAGE.summary.notChecked],
        ]
        for (const [status, key, n] of doors) {
            const door = container.querySelector(`#summary a[data-count="${key}"]`)
            expect(door, `no door for ${key}`).toBeTruthy()
            expect(firstNumber(door)).toBe(n)
            expect(textOf(door)).toContain(t.protection.status[status as keyof typeof t.protection.status])
            expect(textOf(door)).toContain(t.protection.summary.meaning[status as keyof typeof t.protection.summary.meaning])
            expect(door!.getAttribute("href")).toBe(`/protection?status=${status}#categories`)
        }
        const denominator = container.querySelector('#summary a[data-count="branch.relevantCount"]')
        expect(firstNumber(denominator)).toBe(COVERAGE.summary.relevantCount)
        expect(COVERAGE.summary.appearsCovered + COVERAGE.summary.finding + COVERAGE.summary.noPolicy + COVERAGE.summary.notChecked + COVERAGE.summary.underReviewOnly).toBe(COVERAGE.summary.relevantCount)
        expect(textOf(container.querySelector("#summary"))).toContain(POLICY_TYPE_LABELS.life || "Ζωή")
    })

    it("a branch whose only findings are under review is disclosed in a sentence with its own key — never inside the four", () => {
        const reviewOnly = deriveCoverageStatus({
            policies: [COVERAGE_POLICIES[0]],
            gapRows: [COVERAGE_GAP_ROWS[1]],
            runs: [COVERAGE_RUNS[0]],
            expectedLines: ["motor"],
            coverHeldElsewhere: [],
            now: NOW,
        })
        expect(reviewOnly.summary).toMatchObject({ appearsCovered: 0, finding: 0, underReviewOnly: 1, relevantCount: 1 })
        const { container } = renderSurface({ summary: { summary: reviewOnly.summary, heldElsewhereLabels: [], copy: { ...t.protection.summary, status: t.protection.status } } })
        const sentence = container.querySelector('#summary [data-count="branch.underReviewOnlyCount"]')
        expect(firstNumber(sentence)).toBe(1)
        expect(textOf(sentence)).toBe(t.protection.summary.underReviewOnlyOne)
        expect(firstNumber(container.querySelector('#summary a[data-count="branch.findingCount"]'))).toBe(0)
    })

    it("a recording-class finding changes no status — the summary says so in one sentence that is a door to the findings", () => {
        // Production, 2026-09-07: «Μερική κάλυψη 0» sat above a findings list holding
        // «Δεν καταγράφεται τηλέφωνο αναγγελίας ατυχήματος». Both were right — a recording
        // rule asks whether a value was written down, not whether cover exists — and the
        // page owed the reader the sentence that reconciles them.
        const recordingOnly = deriveCoverageStatus({
            policies: [COVERAGE_POLICIES[0]],
            gapRows: [{ policyId: COVERAGE_POLICIES[0].id, slug: "missing_accident_declaration_phone", analysisRunId: "run-mot-1", runFinishedAt: inDays(-5) }],
            runs: [COVERAGE_RUNS[0]],
            expectedLines: ["motor"],
            coverHeldElsewhere: [],
            now: NOW,
        })
        expect(recordingOnly.summary).toMatchObject({ finding: 0, notRecorded: 1 })
        const { container } = renderSurface({ summary: { summary: recordingOnly.summary, heldElsewhereLabels: [], copy: { ...t.protection.summary, status: t.protection.status } } })
        const sentence = container.querySelector('#summary a[data-count="branch.notRecordedCount"]')
        expect(sentence, "the sentence is a door").not.toBeNull()
        expect(sentence!.getAttribute("href")).toBe("#gaps")
        expect(firstNumber(sentence)).toBe(1)
        expect(textOf(sentence)).toBe(t.protection.summary.notRecordedOne)
        expect(firstNumber(container.querySelector('#summary a[data-count="branch.findingCount"]'))).toBe(0)
    })

    it("no verdict word renders anywhere on the page", () => {
        const { container } = renderSurface()
        for (const forbidden of ["Καλύπτεται καλά", "Δεν καλύπτεστε", "Επαρκής", "Σχεδόν έτοιμη", "Πιθανό κενό", "Απροστάτευτο"]) {
            expect(container.textContent, `"${forbidden}" renders`).not.toContain(forbidden)
        }
    })
})

describe("PS-02: the category rows — status chip, the sentence behind it, the policy count, one door", () => {
    it("every branch that concerns the person renders a row with its chip as a subject-scoped fact and its status word", () => {
        const { container } = renderSurface()
        const relevant = COVERAGE.rows.filter((r) => r.status !== null || r.bucket === "under_review_only")
        expect(relevant.length).toBe(COVERAGE.summary.relevantCount)
        for (const row of relevant) {
            const li = container.querySelector(`#categories li[data-branch="${row.branch.id}"]`)
            expect(li, `no row for ${row.branch.id}`).toBeTruthy()
            const chip = li!.querySelector(`[data-fact="branch.coverageStatus"][data-fact-subject="${row.branch.id}"]`)
            expect(chip, `${row.branch.id}: chip is not a subject-scoped fact`).toBeTruthy()
            const status = (row.status ?? row.bucket) as keyof typeof t.protection.status
            expect(textOf(chip)).toBe(t.protection.status[status])
            expect(li!.querySelector(`a[href="/protection/${row.branch.id}"]`), `${row.branch.id}: no door`).toBeTruthy()
        }
    })

    it("«Φαίνεται να καλύπτεται» always carries «Ελέγξαμε N από M σημεία» as the branch's checked-points fact", () => {
        const { container } = renderSurface()
        const home = container.querySelector('#categories li[data-branch="home"]')!
        const fact = home.querySelector('[data-fact="branch.checkedPoints"][data-fact-subject="home"]')
        expect(fact).toBeTruthy()
        expect(textOf(fact)).toContain(t.protection.statusCaveats.checkedPoints.replace("{covered}", "5").replace("{checked}", "5"))
    })

    it("«Μερική κάλυψη» quotes its classified finding count under the subject-scoped key; the under-review one is not in it", () => {
        const { container } = renderSurface()
        const motor = container.querySelector('#categories li[data-branch="motor"]')!
        const count = motor.querySelector('[data-count="branch.openFindingCount"][data-count-subject="motor"]')
        expect(firstNumber(count)).toBe(1)
        expect(textOf(count)).toBe(t.protection.statusCaveats.findingCountOne)
    })

    it("an expired-only expected line says the policy lapsed; a never-analysed one says it was not read — neither reads as covered", () => {
        const { container } = renderSurface()
        expect(textOf(container.querySelector('#categories li[data-branch="health"]'))).toContain(t.protection.statusCaveats.lapsedOnly)
        expect(textOf(container.querySelector('#categories li[data-branch="travel"]'))).toContain(t.protection.statusCaveats.never_analysed)
        expect(textOf(container.querySelector('#categories li[data-branch="pet"]'))).toContain(t.protection.statusCaveats.noPolicy)
    })

    it("B-02: held branches state their policy count under the subject-scoped key, summing to the wallet", () => {
        const { container } = renderSurface()
        const counts = Array.from(container.querySelectorAll('#categories [data-count="branch.policyCount"]'))
        expect(counts.length).toBeGreaterThan(0)
        const sum = counts.reduce((acc, el) => acc + firstNumber(el), 0)
        expect(sum).toBe(COVERAGE_POLICIES.length)
        for (const el of counts) expect(el.getAttribute("data-count-subject")).toBeTruthy()
    })
})

describe("PS-03/PS-04: the filters narrow the rows and never lose the reader", () => {
    it("six family chips render, «Όλα» current by default, each an addressable link", () => {
        const { container } = renderSurface()
        const nav = container.querySelector(`nav[aria-label="${t.protection.filters.aria}"]`)!
        const chips = Array.from(nav.querySelectorAll("a"))
        expect(chips.map((a) => textOf(a))).toEqual([t.protection.filters.all, t.protection.filters.property, t.protection.filters.health, t.protection.filters.family, t.protection.filters.mobility, t.protection.filters.other])
        expect(chips[0].getAttribute("aria-current")).toBe("page")
        expect(chips[2].getAttribute("href")).toBe("/protection?family=health#categories")
    })

    it("?family=health keeps only the health rows in the main list", () => {
        const { container } = renderSurface(withCategories({ family: "health" }))
        const rows = Array.from(container.querySelectorAll('#categories ul[data-list="main"] li[data-branch]')).map((li) => li.getAttribute("data-branch"))
        expect(rows).toEqual(["health"])
    })

    it("?status=no_policy keeps the two no-policy rows and offers a way back to every status", () => {
        const { container } = renderSurface(withCategories({ status: "no_policy" }))
        const rows = Array.from(container.querySelectorAll('#categories ul[data-list="main"] li[data-branch]')).map((li) => li.getAttribute("data-branch")).sort()
        expect(rows).toEqual(["health", "pet"])
        const clear = container.querySelector("#categories [data-clear-status]")
        expect(clear!.getAttribute("href")).toBe("/protection#categories")
    })
})

describe("PS-09 + B-06: the rest is disclosed, not judged", () => {
    it("branches that neither concern the person nor hold anything sit under «Άλλες κατηγορίες» without a status word", () => {
        const { container } = renderSurface()
        const details = container.querySelector("#categories details")!
        expect(textOf(details)).toContain(t.protection.categories.otherTitle)
        // B-06: an unheld business line is not rendered at all, so it is not disclosed either.
        const neutral = COVERAGE.rows.filter((r) => r.bucket === "neutral" && r.branch.segment !== "b2b")
        expect(neutral.length).toBeGreaterThan(0)
        for (const row of neutral) {
            const li = details.querySelector(`li[data-branch="${row.branch.id}"]`)
            expect(li, `${row.branch.id} should be disclosed`).toBeTruthy()
            expect(li!.querySelector('[data-fact="branch.coverageStatus"]')).toBeNull()
        }
    })

    it("the business line renders only when the customer holds a policy in it", () => {
        // Two renders in one case must not coexist: with duplicate ids in one
        // document the selector engine resolves `#categories` to the FIRST render.
        const unheld = renderSurface()
        expect(unheld.container.querySelector('#categories li[data-branch="business"]')).toBeNull()
        unheld.unmount()
        const withBusiness = deriveCoverageStatus({
            policies: [...COVERAGE_POLICIES, { id: "biz-1", lineOfBusiness: "business", status: "active", policyNumber: "BIZ-1", insurerName: "Ethniki", endDate: inDays(200), acordData: {}, lastAnalyzedAt: null }],
            gapRows: COVERAGE_GAP_ROWS,
            runs: COVERAGE_RUNS,
            expectedLines: EXPECTED_LINES,
            coverHeldElsewhere: ["life"],
            now: NOW,
        })
        const { container } = renderSurface(withCategories({ rows: withBusiness.rows }))
        expect(container.querySelector('#categories li[data-branch="business"]')).toBeTruthy()
    })
})

describe("PS-05: a finding is explained, not listed (A-10, A-15 re-homed)", () => {
    it("every visible item carries its title, what it means, why it matters with the provenance label and citation, the area, a review door and a dismiss action — and no severity word", () => {
        const { container } = renderSurface()
        const items = Array.from(container.querySelectorAll('#gaps ul[data-list="findings"] li[data-gap-id]'))
        expect(items.length).toBe(GAP_ITEMS.length)
        for (const [i, li] of items.entries()) {
            const item = GAP_ITEMS[i]
            expect(textOf(li.querySelector("h3"))).toBe(item.title)
            expect(textOf(li)).toContain(t.protection.gaps.meaning)
            expect(textOf(li)).toContain(item.meaning!)
            expect(textOf(li)).toContain(t.protection.gaps.why)
            expect(textOf(li)).toContain(item.why)
            expect(textOf(li.querySelector('[data-fact="gap.provenance"]'))).toBe(item.provenanceLabel)
            expect(textOf(li)).toContain(t.protection.gaps.concerns.replace("{area}", item.area!))
            expect(li.querySelector(`a[href="/wallet/${item.policyId}"]`)).toBeTruthy()
            expect(Array.from(li.querySelectorAll("button")).some((b) => textOf(b) === t.protection.gaps.dismiss)).toBe(true)
            for (const word of ["Κρίσιμ", "Υψηλή προτεραιότητα", "Μεσαία προτεραιότητα", "Χαμηλή προτεραιότητα"]) expect(textOf(li)).not.toContain(word)
        }
    })

    it("the list is dated to its run", () => {
        const { container } = renderSurface()
        const line = container.querySelector('#gaps [data-fact="gap.findingsProvenance"]')
        expect(textOf(line)).toBe("Ευρήματα από την ανάλυση της 20 Αυγούστου 2026.")
    })

    it("under-review findings sit in a closed disclosure with the R3 sentence, no number in its summary, and are not items", () => {
        const { container } = renderSurface()
        const details = container.querySelector('#gaps details[data-provenance-group="under_review"]')!
        expect(details).toBeTruthy()
        expect(details.hasAttribute("open")).toBe(false)
        expect(textOf(details.querySelector("summary"))).toBe(t.protection.gaps.underReviewTitle)
        expect(textOf(details.querySelector("summary"))).not.toMatch(/\d/)
        expect(textOf(details)).toContain(t.provenance.underReviewDisclosure)
        expect(textOf(details)).toContain(GAP_UNDER_REVIEW[0].title)
        expect(container.querySelectorAll('#gaps ul[data-list="findings"] li[data-gap-id]').length).toBe(GAP_ITEMS.length)
    })

    it("A-12: the expired policies left out of the picture are named — and the notice does not render when none were", () => {
        const named = renderSurface()
        expect(textOf(named.container.querySelector("#gaps"))).toContain("Εθνική Ασφαλιστική")
        named.unmount()
        expect(textOf(renderSurface(withGaps({ excludedExpired: [] })).container.querySelector("#gaps"))).not.toContain(t.protection.gaps.excludedExpiredTitle)
    })
})

describe("PS-06 + A-20: the plan's cap is disclosed, never hidden", () => {
    it("the free plan sees the first two and a counted door to the rest; a paid plan sees them all", () => {
        const free = renderSurface(withGaps({ items: THREE_ITEMS, visibleLimit: 2 }))
        expect(free.container.querySelectorAll('#gaps ul[data-list="findings"] li[data-gap-id]').length).toBe(2)
        const locked = free.container.querySelector('#gaps a[data-count="gap.lockedCount"]')
        expect(locked).toBeTruthy()
        expect(firstNumber(locked)).toBe(1)
        expect(textOf(locked)).toBe(t.protection.gaps.moreOne)
        expect(locked!.getAttribute("href")).toBe("/upgrade?reason=feature_locked")
        free.unmount()
        const paid = renderSurface(withGaps({ items: THREE_ITEMS, visibleLimit: null }))
        expect(paid.container.querySelectorAll('#gaps ul[data-list="findings"] li[data-gap-id]').length).toBe(3)
        expect(paid.container.querySelector('#gaps [data-count="gap.lockedCount"]')).toBeNull()
    })
})

describe("Goal 14 — the gap list's states say what they know (A-17, A-18, A-19 re-homed)", () => {
    it("analysed-and-clean states its denominators as doors and never the pending register", () => {
        const { container } = renderSurface(withGaps({ state: "clear", items: [], underReview: [], assessedCount: 3, excludedCount: 1 }))
        const clear = container.querySelector('#gaps [data-assessment-state="assessed"]')!
        expect(clear).toBeTruthy()
        expect(firstNumber(clear.querySelector('a[data-count="portfolio.assessedCount"]'))).toBe(3)
        expect(firstNumber(clear.querySelector('a[data-count="portfolio.unassessedCount"]'))).toBe(1)
        expect(textOf(clear)).not.toContain(t.protection.gaps.notAnalysed)
    })

    it("never analysed says so — with the locked door when the plan gates it — and no phrase of the all-clear register", () => {
        const open = renderSurface(withGaps({ state: "not_analysed", items: [], underReview: [] }))
        const openState = open.container.querySelector('#gaps [data-assessment-state="not_analysed"]')!
        expect(textOf(openState)).toContain(t.protection.gaps.notAnalysed)
        expect(textOf(openState)).toContain(t.protection.gaps.notAnalysedHint)
        expect(openState.querySelector('a[href="/upgrade?reason=feature_locked"]')).toBeNull()
        expect(open.container.querySelector('[data-assessment-state="assessed"]')).toBeNull()
        open.unmount()
        const locked = renderSurface(withGaps({ state: "not_analysed", items: [], underReview: [], isDeepAnalysisLocked: true }))
        expect(locked.container.querySelector('#gaps a[href="/upgrade?reason=feature_locked"]')).toBeTruthy()
    })

    it("an empty wallet explains what to do instead of counting to zero", () => {
        const { container } = renderSurface({ nextStep: nextStepProps({ ...NEXT_STEP_FACTS, inForcePolicyCount: 0 }), ...withGaps({ state: "no_policies", items: [], underReview: [] }) })
        expect(textOf(container.querySelector("#gaps"))).toContain(t.protection.gaps.noPolicies)
        expect(textOf(container.querySelector("#gaps"))).not.toMatch(/\b0 /)
    })

    it("a failed engine snapshot is said, and the recommendations door hides rather than lie", () => {
        const { container } = renderSurface({ engineUnavailable: true, ...withImprove({ recommendationCount: null }) })
        expect(textOf(container.querySelector('[data-engine="unavailable"]'))).toBe(t.protection.gaps.engineUnavailable)
        expect(container.querySelector('[data-count="recommendation.openCount"]')).toBeNull()
        expect(storyPrimaries(container).length).toBe(1)
    })
})

describe("the foot: A-05 re-homed as a counted door, A-08 the refresh control, A-09 the one upgrade mount, A-06/A-07 the life anchors", () => {
    it("A-05 → RC-01: the recommendations door carries recommendation.openCount and leads to /recommendations", () => {
        const { container } = renderSurface()
        const door = container.querySelector('#improve a[data-count="recommendation.openCount"]')
        expect(door!.getAttribute("href")).toBe("/recommendations")
        expect(firstNumber(door)).toBe(1)
        expect(textOf(door)).toContain(t.protection.improve.recommendations)
    })

    it("A-05: with nothing open, the foot says so instead of a zero", () => {
        const { container } = renderSurface(withImprove({ recommendationCount: 0 }))
        expect(textOf(container.querySelector("#improve"))).toContain(t.protection.improve.noRecommendations)
        expect(container.querySelector('[data-count="recommendation.openCount"]')).toBeNull()
    })

    it("A-08: the refresh control renders in the foot beside the last check, not in the header", () => {
        const { container } = renderSurface()
        const refresh = Array.from(container.querySelectorAll("button")).find((b) => textOf(b) === t.insights.refreshAnalysis)
        expect(refresh).toBeTruthy()
        expect(refresh!.closest("#improve")).toBeTruthy()
        expect(textOf(container.querySelector("#improve [data-last-checked]"))).toContain("20 Αυγούστου 2026")
        expect(container.querySelector("h1")!.parentElement!.querySelector("button")).toBeNull()
    })

    it("A-09: the upgrade trigger renders on ONE mount when asked for, and not otherwise", () => {
        const onRender = renderSurface(withImprove({ showUpgradeTrigger: true }))
        const on = onRender.container.querySelectorAll("#improve .pw-card").length
        onRender.unmount()
        const off = renderSurface(withImprove({ showUpgradeTrigger: false })).container.querySelectorAll("#improve .pw-card").length
        expect(on).toBe(off + 1)
    })

    it("A-06/A-07: the life-events panel is anchored for the dashboard's prompt, the wizard for the risk lens's next action — and the wizard leaves when nothing is unknown", () => {
        const withWizard = renderSurface()
        const { container } = withWizard
        expect(container.querySelector("#life #life-events")).toBeTruthy()
        expect(container.querySelector("#life #risk-profile-wizard")).toBeTruthy()
        expect(textOf(container.querySelector("#life"))).toContain(t.protection.life.title)
        withWizard.unmount()
        const without = renderSurface({ life: { ...surfaceProps().life, wizard: { show: false, initialData: undefined } } })
        expect(without.container.querySelector("#risk-profile-wizard")).toBeNull()
    })

    it("§6.7: every data-count on the surface is a registered key, subject-scoped ones carrying their subject — on both lenses", () => {
        for (const props of [{}, riskLensProps]) {
            const { container, unmount } = renderSurface(props)
            const counted = Array.from(container.querySelectorAll("[data-count]"))
            expect(counted.length).toBeGreaterThan(0)
            for (const el of counted) {
                const key = el.getAttribute("data-count")!
                expect(isRegisteredCountKey(key), `data-count="${key}" is not in the §6.7 registry`).toBe(true)
                if (SUBJECT_SCOPED_KEYS.has(key)) expect(el.getAttribute("data-count-subject"), `${key} is subject-scoped and must name its subject`).toBeTruthy()
            }
            unmount()
        }
    })
})
