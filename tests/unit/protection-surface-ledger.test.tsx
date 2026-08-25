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
import { INSURANCE_BRANCHES } from "@/lib/insurance/taxonomy"
import { getBranchContent } from "@/lib/insurance/content"
import { policiesInBranch, type BranchPolicyFacts, type BranchTileState } from "@/lib/insurance/branch-page"
import { assembleRiskGraph } from "@/lib/services/risk-graph/service"
import { assembleWatch } from "@/lib/services/risk-dna/service"
import { COUNT_KEYS } from "@/lib/instrumentation/count-keys"
import { QUICK_START_QUESTIONS } from "@/lib/services/onboarding/quick-start"
import { getUpgradeCopy } from "@/lib/monetization"
import { ProtectionSurface, type ProtectionSurfaceProps } from "@/components/protection/ProtectionSurface"

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

function surfaceProps(overrides: Partial<ProtectionSurfaceProps> = {}): ProtectionSurfaceProps {
    return {
        language: "el",
        lens: "branch",
        labels: {
            title: t.protection.title,
            subtitle: t.protection.subtitle,
            lens: {
                aria: t.protection.lensAria,
                byBranch: t.protection.lensByBranch,
                byRisk: t.protection.lensByRisk,
            },
            refresh: {
                refresh: t.insights.refreshAnalysis,
                refreshing: t.insights.refreshingAnalysis,
                failed: t.insights.refreshFailed,
            },
        },
        branchLens: {
            policies: BRANCH_POLICIES,
            expectedLines: ["pet"],
            labels: BRANCH_LABELS,
        },
        riskLens: null,
        engine: {
            recommendations: [RECOMMENDATION] as any,
            smartContent: {},
            profileIncomplete: true,
            showWizard: true,
            wizardInitialData: undefined,
            showUpgradeTrigger: true,
        },
        tier: "free",
        hasPolicies: true,
        lifeEvents: { options: [LIFE_EVENT_OPTION], recent: [] },
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
    branchLens: null,
    riskLens: {
        intelligence: INTELLIGENCE,
        quickStart: { questions: QUICK_START_QUESTIONS, onSubmit: async () => ({ insight: null }) },
    },
}

// ── The ανά κλάδο lens: B-01…B-06 ────────────────────────────────────

describe("«ανά κλάδο» lens preserves B-01…B-06 on rendered output", () => {
    // The lens's own universe: every rich-content top-level branch, from the
    // taxonomy — never a hand-written list of nine names.
    const richTopLevel = INSURANCE_BRANCHES.filter((b) => !b.parentId && b.contentTier === "rich")

    it("enumerates a real universe (the taxonomy holds rich top-level branches)", () => {
        expect(richTopLevel.length).toBeGreaterThanOrEqual(9)
        expect(richTopLevel.some((b) => b.segment === "b2b")).toBe(true)
    })

    it("B-01/B-03/B-04: every consumer line renders as a card with tagline and an open-the-line href", () => {
        const { container } = renderSurface()
        for (const branch of richTopLevel) {
            const held = policiesInBranch(BRANCH_POLICIES, branch.id).length
            const card = container.querySelector(`a[href="/protection/${branch.id}"]`)
            if (branch.segment === "b2b" && held === 0) continue // B-06, asserted below
            expect(card, `B-01: no card rendered for branch ${branch.id}`).toBeTruthy()
            // B-03: the one-line tagline, from the same content source the lens uses.
            expect(card!.textContent).toContain(getBranchContent(branch.id).tagline.el)
        }
    })

    it("B-02: held branches state their policy count under the subject-scoped key, summing to the wallet", () => {
        const { container } = renderSurface()
        let sum = 0
        for (const branch of richTopLevel) {
            const held = policiesInBranch(BRANCH_POLICIES, branch.id).length
            const counter = container.querySelector(
                `[data-count="branch.policyCount"][data-count-subject="${branch.id}"]`
            )
            if (held === 0) {
                expect(counter, `${branch.id} holds nothing and must not render a count`).toBeNull()
                continue
            }
            expect(counter, `B-02: no count rendered for held branch ${branch.id}`).toBeTruthy()
            const value = Number((counter!.textContent || "").match(/\d+/)?.[0])
            expect(value, `B-02: ${branch.id} renders the wrong count`).toBe(held)
            sum += value
        }
        expect(sum, "tile counts must sum to the held portfolio").toBe(BRANCH_POLICIES.length)
    })

    it("B-05 + honesty: an unowned expected line is «Χωρίς ασφαλιστήριο»; unassessed is «Δεν έχει αξιολογηθεί»; «Πιθανό κενό» renders nowhere", () => {
        // Assessed (expectedLines names pet): checked, and the wallet holds nothing.
        const assessed = renderSurface()
        const petCard = assessed.container.querySelector('a[href="/protection/pet"]')
        expect(petCard).toBeTruthy()
        expect(petCard!.textContent).toContain(t.branches.statusNotHeld)
        expect(assessed.container.textContent).not.toContain("Πιθανό κενό")
        assessed.unmount()

        // Never assessed (no score row → expectedLines empty): the SAME line
        // must say "not assessed", never borrow the checked register.
        const unassessed = renderSurface({
            branchLens: { policies: BRANCH_POLICIES, expectedLines: [], labels: BRANCH_LABELS },
        })
        const petCard2 = unassessed.container.querySelector('a[href="/protection/pet"]')
        expect(petCard2).toBeTruthy()
        expect(petCard2!.textContent).toContain(t.branches.statusNeutral)
        expect(petCard2!.textContent).not.toContain(t.branches.statusNotHeld)
    })

    it("B-06: the business line renders ONLY when the customer holds a policy in it", () => {
        const without = renderSurface()
        expect(
            without.container.querySelector('a[href="/protection/business"]'),
            "B-06: business rendered to a consumer holding no business policy"
        ).toBeNull()
        without.unmount()

        const withBusiness = renderSurface({
            branchLens: {
                policies: [
                    ...BRANCH_POLICIES,
                    { id: "biz-1", lineOfBusiness: "business", status: "active", endDate: inDays(100) },
                ],
                expectedLines: ["pet"],
                labels: BRANCH_LABELS,
            },
        })
        expect(
            withBusiness.container.querySelector('a[href="/protection/business"]'),
            "B-06: a held business line must keep its capability"
        ).toBeTruthy()
    })
})

// ── The ανά κίνδυνο lens: R-01…R-08 ──────────────────────────────────

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
        const rows = Array.from(container.querySelectorAll("details"))
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
        const rows = Array.from(container.querySelectorAll("details"))
        const unowned = graph.views.filter((v) => v.heldInLine === 0 && v.state === "unprotected")
        expect(unowned.length).toBeGreaterThan(0)
        for (const view of unowned) {
            const row = rows.find((r) => r.textContent?.includes(view.name.el))
            expect(row, `no row for unowned ${view.riskId}`).toBeTruthy()
            expect(row!.textContent).toContain("Χωρίς ασφαλιστήριο")
            expect(row!.textContent).not.toContain("Απροστάτευτο")
        }
    })

    it("R-04 (H-005 — ported unchanged): the completeness metric renders under its fact key, and the score value renders nowhere", () => {
        const { container } = renderSurface(riskLensProps)
        const index = container.querySelector('[data-fact="profile.healthIndex"]')
        expect(index, "R-04: health index missing").toBeTruthy()
        expect(index!.textContent).toBe("62")
        // H-001: the service still returns protectionScore (77 in the fixture);
        // the surface must never render it.
        expect(container.textContent).not.toContain("77")
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

describe("surviving /coverage-insights content preserves A-05…A-09 on rendered output", () => {
    it("A-05: recommendations render under recommendation.openCount, with the authored title", () => {
        const { container } = renderSurface()
        expect(container.textContent).toContain(RECOMMENDATION.title.el)
        const count = container.querySelector('[data-count="recommendation.openCount"]')
        expect(count, "A-05: the open count must carry its registered key").toBeTruthy()
        expect(count!.textContent).toContain("1")
    })

    it("A-06: the life-events panel renders, anchored for the dashboard's prompt card", () => {
        const { container } = renderSurface()
        const anchor = container.querySelector("#life-events")
        expect(anchor, "A-06: #life-events anchor missing").toBeTruthy()
        expect(anchor!.textContent).toContain(LIFE_EVENT_OPTION.label.el)
    })

    it("A-07: the risk-profile wizard renders for an incomplete profile, at the anchor nextAction targets", () => {
        const { container } = renderSurface()
        const anchor = container.querySelector("#risk-profile-wizard")
        expect(anchor, "A-07: #risk-profile-wizard anchor missing").toBeTruthy()
        expect(
            (anchor!.textContent || "").trim().length,
            "A-07: the wizard anchor renders empty"
        ).toBeGreaterThan(0)
    })

    it("A-08: the refresh-analysis control renders with its label", () => {
        const { container } = renderSurface()
        const button = Array.from(container.querySelectorAll("button")).find((b) =>
            b.textContent?.includes(t.insights.refreshAnalysis)
        )
        expect(button, "A-08: refresh control missing").toBeTruthy()
    })

    it("A-09: the upgrade trigger renders for a free tier with recommendations — and not otherwise", () => {
        const copy = getUpgradeCopy("advanced_gap_detection", "el")
        const free = renderSurface()
        expect(free.container.textContent).toContain(copy.headline)
        free.unmount()

        const paid = renderSurface({
            engine: {
                recommendations: [RECOMMENDATION] as any,
                smartContent: {},
                profileIncomplete: true,
                showWizard: true,
                wizardInitialData: undefined,
                showUpgradeTrigger: false,
            },
            tier: "pro",
        })
        expect(paid.container.textContent).not.toContain(copy.headline)
    })
})

// ── The lens switch and one-lens-per-request ─────────────────────────

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
        const branchRender = renderSurface()
        expect(branchRender.container.querySelector('[data-fact="profile.healthIndex"]')).toBeNull()
        branchRender.unmount()

        const riskRender = renderSurface(riskLensProps)
        expect(riskRender.container.querySelector('[data-count="branch.policyCount"]')).toBeNull()
        expect(riskRender.container.querySelector('[data-fact="profile.healthIndex"]')).toBeTruthy()
    })
})
