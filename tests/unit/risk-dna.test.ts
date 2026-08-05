import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { toLifeContext } from "@/lib/services/gap-engine/life-context"
import { assessRisks } from "@/lib/services/gap-engine/risk-assessment"
import { RISK_CATALOG } from "@/lib/services/gap-engine/risk-catalog"
import {
    DIMENSION_DEFINITIONS,
    RISK_DIMENSIONS,
    primaryDimensionOf,
    isCoarse,
} from "@/lib/services/risk-dna/dimensions"
import { computeRiskDna, resilienceScore } from "@/lib/services/risk-dna/compute"
import {
    customerHealthIndex,
    householdOverview,
    riskTrends,
} from "@/lib/services/risk-dna/health-index"
import { monitorRisk, openPredictionHooks } from "@/lib/services/risk-dna/monitoring"
import { advisoryImpact, bookOverview } from "@/lib/services/risk-dna/advisory-impact"
import { assembleRiskGraph } from "@/lib/services/risk-graph/service"

/**
 * Guards for the risk intelligence layer.
 *
 * The founding constraint is that there is **no second composite** — nine
 * dimensions that do not add up to a number. Most of what follows defends that,
 * and defends the one dimension a commercially-minded revision would drop.
 */

const ALL_ANSWERED = [
    "dateOfBirth", "maritalStatus", "childrenCount", "dependentsCount", "hasPets",
    "vehiclesCount", "residenceType", "propertiesOwned", "rentsOutProperty",
    "ownsBusiness", "employmentStatus", "businessEmployees", "annualIncome",
    "savingsAmount", "mortgageAmount", "hasLoans", "loanAmount", "travelsFrequently",
    "activities", "valuablesValue", "cyberExposure", "retirementPlanning",
]

const NOW = new Date("2026-08-05")

function profile(overrides: Record<string, unknown> = {}) {
    return {
        answeredFields: ALL_ANSWERED,
        dateOfBirth: new Date("1985-01-01"),
        maritalStatus: "single",
        childrenCount: 0, dependentsCount: 0, hasPets: false, vehiclesCount: 0,
        residenceType: "rented", propertiesOwned: 0, rentsOutProperty: false,
        ownsBusiness: false, employmentStatus: "employed", businessEmployees: 0,
        annualIncome: 30000, savingsAmount: 5000, mortgageAmount: null,
        hasLoans: false, loanAmount: null, travelsFrequently: false, activities: [],
        valuablesValue: 0, cyberExposure: "low", retirementPlanning: true,
        ...overrides,
    } as any
}

const dnaFor = (p: Record<string, unknown> = {}, activeLines: string[] = []) => {
    const ctx = toLifeContext(profile(p), NOW)
    return computeRiskDna({ assessments: assessRisks(ctx, []), ctx, activeLines })
}

describe("there is no second composite", () => {
    it("exposes no total, average or overall across the dimensions", () => {
        // A second composite would immediately disagree with the protection
        // score in front of the customer. The dimensions are lenses.
        const src = readFileSync("lib/services/risk-dna/compute.ts", "utf-8")
        expect(src).not.toMatch(/\boverallDna\b|\bdnaScore\b|\bcompositeScore\b/)

        const dna = dnaFor({ vehiclesCount: 1 })
        for (const dimension of dna) {
            expect(Object.keys(dimension)).not.toContain("total")
        }
    })

    it("counts every risk in exactly one dimension", () => {
        // Generous secondary membership is only safe because primary membership
        // is unique — that is what stops a risk being counted twice.
        for (const risk of RISK_CATALOG) {
            const owners = DIMENSION_DEFINITIONS.filter((d) => d.primary.includes(risk.id))
            expect(owners.length, `${risk.id} is primary to ${owners.length} dimensions`).toBeLessThanOrEqual(1)
        }
    })

    it("names only risks that exist", () => {
        const ids = new Set(RISK_CATALOG.map((r) => r.id))
        for (const dimension of DIMENSION_DEFINITIONS) {
            for (const riskId of [...dimension.primary, ...dimension.secondary]) {
                expect(ids.has(riskId), `${dimension.id} names unknown risk ${riskId}`).toBe(true)
            }
        }
    })

    it("leaves no risk out of the mapping", () => {
        // A risk in no dimension is invisible on this surface while still
        // driving the score — the two would disagree with no way to see why.
        const unmapped = RISK_CATALOG.filter((r) => primaryDimensionOf(r.id) === null)
        expect(unmapped.map((r) => r.id)).toEqual([])
    })
})

describe("a dimension that does not apply is not a zero", () => {
    it("scores null rather than 0 when nothing applies", () => {
        // A childless renter has no Family exposure. Scoring that 0 reports the
        // safest possible position as the worst one.
        const dna = dnaFor()
        const family = dna.find((d) => d.id === "family")!
        expect(family.applicableCount).toBe(0)
        expect(family.score).toBeNull()
    })

    it("scores 100 only when EVERY applicable risk is answered", () => {
        // A renter with a car has two applicable Property risks — the car and
        // their contents — so covering only the car is half, not all of it.
        const ctx = toLifeContext(profile({ vehiclesCount: 1 }), NOW)
        const partial = computeRiskDna({
            assessments: assessRisks(ctx, [{ lineOfBusiness: "motor", status: "active" }]),
            ctx,
            activeLines: ["motor"],
        }).find((d) => d.id === "property")!
        expect(partial.applicableCount).toBe(2)
        expect(partial.score).toBe(50)

        const full = computeRiskDna({
            assessments: assessRisks(ctx, [
                { lineOfBusiness: "motor", status: "active" },
                { lineOfBusiness: "renters", status: "active" },
            ]),
            ctx,
            activeLines: ["motor", "renters"],
        }).find((d) => d.id === "property")!
        expect(full.score).toBe(100)
        expect(full.openCount).toBe(0)
    })
})

describe("financial resilience is capacity, not cover", () => {
    it("is the one dimension with no risks behind it", () => {
        const resilience = DIMENSION_DEFINITIONS.find((d) => d.id === "financial_resilience")!
        expect(resilience.isCapacity).toBe(true)
        expect(resilience.primary).toEqual([])
    })

    it("rises with savings and falls with debt and dependants", () => {
        const thin = resilienceScore(toLifeContext(profile({ savingsAmount: 500 }), NOW)).score!
        const thick = resilienceScore(toLifeContext(profile({ savingsAmount: 60000 }), NOW)).score!
        expect(thick).toBeGreaterThan(thin)

        const indebted = resilienceScore(
            toLifeContext(profile({ savingsAmount: 60000, mortgageAmount: 200000 }), NOW)
        ).score!
        expect(indebted).toBeLessThan(thick)

        const stretched = resilienceScore(
            toLifeContext(profile({ savingsAmount: 60000, dependentsCount: 4 }), NOW)
        ).score!
        expect(stretched).toBeLessThan(thick)
    })

    it("says nothing when savings were never asked", () => {
        const unasked = toLifeContext({ answeredFields: [] } as any, NOW)
        expect(resilienceScore(unasked).score).toBeNull()
    })

    it("never suggests buying anything", () => {
        // Its actions are retain and reduce by construction. A "gap" here would
        // be the product inventing a need out of a strength.
        const dna = dnaFor()
        const resilience = dna.find((d) => d.id === "financial_resilience")!
        expect(resilience.urgency).toBe("none")
        expect(resilience.ifActioned).toBeNull()
    })
})

describe("the five questions are answered, or honestly left null", () => {
    it("answers all five for a dimension with an open risk", () => {
        const dna = dnaFor({ vehiclesCount: 1 })
        const property = dna.find((d) => d.id === "property")!
        expect(property.openCount).toBeGreaterThan(0)
        expect(property.whyItMatters.el.length).toBeGreaterThan(0)
        expect(property.nextAction).not.toBeNull()
        expect(property.confidence).toBeTruthy()
        expect(property.ifActioned?.points).toBeGreaterThan(0)
    })

    it("does not fake a trend with no history", () => {
        // A trend line through one point is a decoration.
        for (const dimension of dnaFor({ vehiclesCount: 1 })) {
            expect(dimension.trend).toBe("unknown")
            expect(dimension.trendDelta).toBeNull()
            expect(dimension.whatChanged).toBeNull()
        }
    })

    it("does not treat a non-finite previous score as comparable", () => {
        // `typeof NaN === "number"`, so the obvious guard passes it straight
        // through and the customer reads "Property fell by NaN".
        const ctx = toLifeContext(profile({ vehiclesCount: 1 }), NOW)
        const dna = computeRiskDna({
            assessments: assessRisks(ctx, []),
            ctx,
            activeLines: [],
            previous: { scores: { property: Number.NaN } },
        })
        const property = dna.find((d) => d.id === "property")!
        expect(property.trendDelta).toBeNull()
        expect(property.trend).toBe("unknown")
        expect(property.whatChanged).toBeNull()
    })

    it("reports a trend once there is something to compare", () => {
        const ctx = toLifeContext(profile({ vehiclesCount: 1 }), NOW)
        const dna = computeRiskDna({
            assessments: assessRisks(ctx, []),
            ctx,
            activeLines: [],
            previous: { scores: { property: 100 } },
        })
        const property = dna.find((d) => d.id === "property")!
        expect(property.trend).toBe("worsening")
        expect(property.trendDelta).toBeLessThan(0)
        expect(property.whatChanged?.en).toMatch(/fell/)
    })

    it("quotes a projection the real scorer would produce", () => {
        // Estimating here would be a promise the product then fails to keep.
        const src = readFileSync("lib/services/risk-dna/compute.ts", "utf-8")
        expect(src).toMatch(/calculateScoreFromAssessments\(projected/)
    })

    it("never offers a projection of zero or less as an incentive", () => {
        for (const dimension of dnaFor({ vehiclesCount: 1, hasPets: true, childrenCount: 2, dependentsCount: 2 })) {
            if (dimension.ifActioned) expect(dimension.ifActioned.points).toBeGreaterThan(0)
        }
    })

    it("says why confidence is limited when it is", () => {
        for (const dimension of dnaFor({ vehiclesCount: 1 })) {
            if (dimension.confidence !== "high") expect(dimension.confidenceLimit).not.toBeNull()
        }
    })

    it("admits when a dimension rests on a single risk", () => {
        const cyber = DIMENSION_DEFINITIONS.find((d) => d.id === "cyber")!
        expect(isCoarse(cyber)).toBe(true)
        const dna = dnaFor({ cyberExposure: "high" })
        const cyberResult = dna.find((d) => d.id === "cyber")!
        expect(cyberResult.coarse).toBe(true)
        expect(cyberResult.confidenceLimit?.en).toMatch(/coarse/)
    })
})

describe("the health index measures understanding, not cover", () => {
    const health = (p: Record<string, unknown> = {}, over: Record<string, unknown> = {}) =>
        customerHealthIndex({
            ctx: toLifeContext(profile(p), NOW),
            dimensions: dnaFor(p),
            lastAssessedAt: new Date("2026-08-01"),
            versionCount: 3,
            now: NOW,
            ...over,
        } as any)

    it("refuses a number when too little is known", () => {
        const unknown = customerHealthIndex({
            ctx: toLifeContext({ answeredFields: [] } as any, NOW),
            dimensions: [],
            lastAssessedAt: null,
            versionCount: 0,
            now: NOW,
        })
        expect(unknown.index).toBeNull()
        expect(unknown.band).toBe("unknown")
        expect(unknown.nextAction).not.toBeNull()
    })

    it("shows its components so the number can be argued with", () => {
        const result = health()
        expect(result.components.length).toBeGreaterThanOrEqual(3)
        expect(result.components.reduce((s, c) => s + c.weight, 0)).toBe(100)
    })

    it("falls as the picture goes stale", () => {
        const fresh = health({}, { lastAssessedAt: new Date("2026-08-04") })
        const stale = health({}, { lastAssessedAt: new Date("2025-01-01") })
        expect(stale.index!).toBeLessThan(fresh.index!)
    })

    it("does not count policies", () => {
        // The customer a traditional CRM ranks highest is the one with broad
        // cover it cannot read. This measures the opposite.
        const src = readFileSync("lib/services/risk-dna/health-index.ts", "utf-8")
        const fn = src.slice(src.indexOf("export function customerHealthIndex"), src.indexOf("// ── Household"))
        expect(fn).not.toMatch(/policyCount|policies\.length|premium/)
    })
})

describe("household and trends", () => {
    it("counts the people protection has to reach", () => {
        const graph = assembleRiskGraph(profile({ childrenCount: 2, dependentsCount: 2 }), [])
        const overview = householdOverview(graph.graph, dnaFor({ childrenCount: 2, dependentsCount: 2 }))
        expect(overview.dependantCount).toBe(2)
        expect(overview.memberCount).toBe(3)
        expect(overview.whyItMatters.en).toMatch(/depend/)
    })

    it("reads direction across the window, not the last hop", () => {
        // A dimension that fell nine and recovered eight is not "improving".
        const series = [
            { at: new Date("2026-01-01"), scores: { property: 90 } },
            { at: new Date("2026-02-01"), scores: { property: 40 } },
            { at: new Date("2026-03-01"), scores: { property: 50 } },
        ]
        const [trend] = riskTrends(series, dnaFor({ vehiclesCount: 1 }).filter((d) => d.id === "property"))
        expect(trend.direction).toBe("worsening")
        expect(trend.netDelta).toBe(-40)
    })

    it("ignores a non-finite point in the series", () => {
        const [trend] = riskTrends(
            [
                { at: new Date("2026-01-01"), scores: { property: 50 } },
                { at: new Date("2026-02-01"), scores: { property: Number.NaN } },
            ],
            dnaFor({ vehiclesCount: 1 }).filter((d) => d.id === "property")
        )
        expect(trend.netDelta).toBeNull()
        expect(trend.direction).toBe("unknown")
    })

    it("has no direction with fewer than two scored points", () => {
        const [trend] = riskTrends(
            [{ at: NOW, scores: { property: 50 } }],
            dnaFor({ vehiclesCount: 1 }).filter((d) => d.id === "property")
        )
        expect(trend.direction).toBe("unknown")
        expect(trend.netDelta).toBeNull()
    })
})

describe("continuous monitoring reports even when clear", () => {
    const watch = (over: Record<string, unknown> = {}) =>
        monitorRisk({
            ctx: toLifeContext(profile(), NOW),
            dimensions: dnaFor({ vehiclesCount: 1 }),
            lastAssessedAt: new Date("2026-08-01"),
            policies: [],
            now: NOW,
            ...over,
        } as any)

    it("emits every signal every time", () => {
        // A watch that only appears when something is wrong cannot be
        // distinguished from a watch that is broken.
        const signals = watch()
        expect(signals.length).toBeGreaterThanOrEqual(4)
        expect(signals.some((s) => s.verdict === "clear")).toBe(true)
        for (const signal of signals) {
            expect(signal.label.el.length).toBeGreaterThan(0)
            if (signal.verdict === "clear") expect(signal.detail).toBeNull()
            else expect(signal.detail).not.toBeNull()
        }
    })

    it("raises cover about to lapse", () => {
        const signals = watch({
            policies: [{ id: "p", endDate: new Date("2026-08-20"), lineOfBusiness: "motor" }],
        })
        const lapse = signals.find((s) => s.id === "cover_lapsing")!
        expect(lapse.verdict).toBe("action")
        expect(lapse.action).not.toBeNull()
    })

    it("does not read an unreadable date as a lapse", () => {
        const signals = watch({
            policies: [{ id: "p", endDate: new Date("nonsense"), lineOfBusiness: "motor" }],
        })
        expect(signals.find((s) => s.id === "cover_lapsing")!.verdict).toBe("clear")
    })

    it("is honest that trend signals need history", () => {
        const signals = watch()
        expect(signals.find((s) => s.id === "dimensions_worsening")!.confidence).toBe("low")
    })
})

describe("prediction hooks observe, they do not forecast", () => {
    it("emits no forecast and no invented probability", () => {
        // A predictor trained on nothing is a random number with a confidence
        // score attached. The seam is typed; nothing fills it yet.
        const signals = openPredictionHooks(
            toLifeContext(profile({ dateOfBirth: new Date("1962-01-01"), mortgageAmount: 150000, dependentsCount: 2 }), NOW),
            dnaFor()
        )
        expect(signals.length).toBeGreaterThan(0)
        for (const signal of signals) {
            expect(signal.kind).toBe("observation")
            expect(signal.probability).toBeNull()
        }
    })

    it("points at events that exist in the registry", async () => {
        const { lifeEventIds } = await import("@/lib/services/life-events/registry")
        const ids = new Set(lifeEventIds())
        const signals = openPredictionHooks(
            toLifeContext(profile({ dateOfBirth: new Date("1962-01-01") }), NOW),
            dnaFor()
        )
        for (const signal of signals) {
            if (signal.suggestsEvent) expect(ids.has(signal.suggestsEvent)).toBe(true)
        }
    })
})

describe("the advisor queue ranks by need, not closeability", () => {
    const impactFor = (over: Record<string, unknown> = {}) =>
        advisoryImpact({
            userId: "u1",
            dimensions: dnaFor({ vehiclesCount: 1 }),
            health: customerHealthIndex({
                ctx: toLifeContext(profile(), NOW),
                dimensions: dnaFor(),
                lastAssessedAt: new Date("2026-08-01"),
                versionCount: 2,
                now: NOW,
            }),
            dependantCount: 0,
            worsening: 0,
            ...over,
        } as any)

    it("has no conversion or engagement factor at all", () => {
        // The old scorer ranked a customer higher for being easy to sell to.
        // Comments stripped: the prose explaining why conversion is excluded
        // legitimately names it, and a guard that cannot tell an explanation
        // from an implementation would forbid documenting the decision.
        const src = readFileSync("lib/services/risk-dna/advisory-impact.ts", "utf-8")
        const model = src
            .slice(src.indexOf("export function advisoryImpact"), src.indexOf("// ── Executive view"))
            .replace(/\/\*[\s\S]*?\*\//g, "")
            .replace(/\/\/.*$/gm, "")
        expect(model).not.toMatch(/conversion|engagement|likelihood|revenue|premium/i)

        const impact = impactFor()
        expect(Object.keys(impact.factors).sort()).toEqual(
            ["exposure", "reach", "recoverable", "unresolved"].sort()
        )
    })

    it("ranks a household with dependants above an identical one without", () => {
        // No conversion model has ever cared how many people a gap reaches.
        expect(impactFor({ dependantCount: 3 }).impact).toBeGreaterThan(impactFor({ dependantCount: 0 }).impact)
    })

    it("answers the five questions for the advisor too", () => {
        const impact = impactFor({ dependantCount: 2, worsening: 1 })
        expect(impact.whatChanged?.en).toMatch(/backwards/)
        expect(impact.whyItMatters.el.length).toBeGreaterThan(0)
        expect(impact.nextAction.el.length).toBeGreaterThan(0)
        expect(impact.confidence).toBeTruthy()
        expect(impact.howItImproves.el.length).toBeGreaterThan(0)
    })

    it("measures the book in protection, not production", () => {
        const src = readFileSync("lib/services/risk-dna/advisory-impact.ts", "utf-8")
        const exec = src
            .slice(src.indexOf("export function bookOverview"))
            .replace(/\/\*[\s\S]*?\*\//g, "")
            .replace(/\/\/.*$/gm, "")
        expect(exec).not.toMatch(/premium|commission|revenue|conversion/i)

        const health = customerHealthIndex({
            ctx: toLifeContext(profile(), NOW),
            dimensions: dnaFor(),
            lastAssessedAt: new Date("2026-08-01"),
            versionCount: 2,
            now: NOW,
        })
        const book = bookOverview([impactFor(), impactFor({ dependantCount: 4 })], [health, health], 7, 1)
        expect(book.householdCount).toBe(2)
        expect(book.peopleCovered).toBe(7)
        expect(book.whyItMatters.en).toMatch(/people depend/)
        expect(book.medianHealth).not.toBeNull()
    })

    it("puts an unknown book ahead of an open one in the next action", () => {
        // A household too thinly known cannot be advised at all — that is the
        // first constraint, not the gaps.
        const unknown = customerHealthIndex({
            ctx: toLifeContext({ answeredFields: [] } as any, NOW),
            dimensions: [],
            lastAssessedAt: null,
            versionCount: 0,
            now: NOW,
        })
        const book = bookOverview([impactFor()], [unknown], 1, 0)
        expect(book.unknownHouseholds).toBe(1)
        expect(book.nextAction.en).toMatch(/thinly known/)
    })
})

describe("every dimension is renderable in both languages", () => {
    it("carries copy for all nine, in every state", () => {
        for (const p of [{}, { vehiclesCount: 2, childrenCount: 2, dependentsCount: 2, hasPets: true, ownsBusiness: true, travelsFrequently: true, cyberExposure: "high", residenceType: "owned", propertiesOwned: 1 }]) {
            const dna = dnaFor(p)
            expect(dna).toHaveLength(RISK_DIMENSIONS.length)
            for (const dimension of dna) {
                expect(dimension.label.el.length).toBeGreaterThan(0)
                expect(dimension.question.el.length).toBeGreaterThan(0)
                expect(dimension.whyItMatters.el.length).toBeGreaterThan(0)
                for (const text of [
                    dimension.whyItMatters.en, dimension.whyItMatters.el,
                    dimension.whatChanged?.en, dimension.confidenceLimit?.el,
                    dimension.ifActioned?.statement.el,
                ]) {
                    if (text) expect(text).not.toMatch(/undefined|NaN|\[object/)
                }
            }
        }
    })
})

describe("the new surfaces are mobile-first and accessible", () => {
    const DNA = readFileSync("components/risk-dna/RiskDnaPanel.tsx", "utf-8")
    const VIEW = readFileSync("components/risk-dna/RiskIntelligenceView.tsx", "utf-8")
    const BOOK = readFileSync("components/risk-dna/AdvisorBookView.tsx", "utf-8")

    it("is not a radar chart", () => {
        // Nine spokes are unreadable below ~400px, the area is a visual
        // composite the model refuses to compute, and no spoke can be acted on.
        // Comments stripped: the prose explaining the decision names the thing
        // it rejects, and a guard that cannot tell an explanation from an
        // implementation would forbid documenting the reasoning.
        const code = DNA.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")
        expect(code).not.toMatch(/<svg[^>]*viewBox|polygon|radar/i)
        expect(code).toMatch(/role="meter"/)
    })

    it("never lays out an ungated multi-column grid", () => {
        for (const [name, src] of [["dna", DNA], ["view", VIEW], ["book", BOOK]] as const) {
            const bare = [...src.matchAll(/(?:^|\s)grid-cols-(\d+)/g)].filter((m) => Number(m[1]) > 1)
            expect(bare.map((m) => m[0].trim()), `${name} has an ungated multi-column grid`).toEqual([])
        }
    })

    it("holds the WCAG 2.5.8 touch floor on every control", () => {
        for (const [name, src] of [["dna", DNA], ["view", VIEW], ["book", BOOK]] as const) {
            for (const chunk of src.split(/<button\b/).slice(1)) {
                const tag = chunk.slice(0, chunk.indexOf(">\n") + 1 || 600)
                expect(tag, `${name}: control without a tap floor`).toMatch(/min-h-11/)
            }
        }
    })

    it("lets long Greek copy wrap rather than widening the page", () => {
        expect(VIEW).toMatch(/overflow-wrap:anywhere/)
        expect(BOOK).toMatch(/overflow-wrap:anywhere/)
    })

    it("exposes the bar to assistive tech, not just the colour", () => {
        const meter = DNA.slice(DNA.indexOf('role="meter"'), DNA.indexOf('role="meter"') + 400)
        expect(meter).toMatch(/aria-valuenow/)
        expect(meter).toMatch(/aria-valuemin/)
        expect(meter).toMatch(/aria-valuemax/)
        expect(meter).toMatch(/aria-label/)
    })

    it("says which dimensions do not apply rather than scoring them zero", () => {
        expect(DNA).toMatch(/notApplicable/)
        expect(DNA).toMatch(/Unscored because there is no exposure/)
    })

    it("marks every decorative icon hidden", () => {
        for (const [name, src] of [["dna", DNA], ["view", VIEW], ["book", BOOK]] as const) {
            const icons = [...src.matchAll(/<(?:TrendingUp|TrendingDown|Minus|ChevronDown|AlertTriangle|CheckCircle2|Eye|Users)\b[^>]*\/>/g)]
            expect(icons.length, `${name} renders no icons?`).toBeGreaterThan(0)
            for (const icon of icons) {
                expect(icon[0], `${name}: undescribed icon ${icon[0].slice(0, 60)}`).toMatch(/aria-hidden/)
            }
        }
    })

    it("keeps the advisor queue honest about what it did not score", () => {
        // Silent truncation reads as "we looked at everyone" when we did not.
        expect(BOOK).toMatch(/truncated/)
        const book = readFileSync("lib/services/risk-dna/book.ts", "utf-8")
        expect(book).toMatch(/BOOK_SCORING_LIMIT/)
    })
})

describe("the information architecture holds", () => {
    const VIEW = readFileSync("components/risk-dna/RiskIntelligenceView.tsx", "utf-8")
    const DNA = readFileSync("components/risk-dna/RiskDnaPanel.tsx", "utf-8")
    const COVER = readFileSync("app/(protected)/coverage-insights/page.tsx", "utf-8")

    it("renders the assessment once, not five times across two pages", () => {
        // The product had recommendations, the risk graph, a flat list of all 21
        // risks, a six-category score and nine dimensions all describing one
        // assessment, on two pages. Reconciling those is our job, not the
        // customer's. The risks now live inside the dimension they belong to.
        expect(DNA).toMatch(/dimension\.risks\.map/)
        expect(COVER).not.toMatch(/<RiskAssessmentPanel/)
        expect(COVER).not.toMatch(/<RiskGraphPanel/)
    })

    it("keeps the two pages answering different questions", () => {
        // "What are my risks" and "what do my policies say" are different
        // questions; the nav has to say so, and each page has to point at the
        // other rather than half-answering both.
        const en = readFileSync("lib/i18n/translations/en.ts", "utf-8")
        expect(en).toMatch(/riskProfile: 'Your risks'/)
        expect(en).toMatch(/coverageInsights: 'Your cover'/)
        expect(COVER).toMatch(/\/insights\/risk-profile/)
    })

    it("does not strand a call to action with nowhere to go", () => {
        // The health index is the one place a new customer is told what to do
        // first, so it has to be a control rather than a sentence.
        const cta = VIEW.slice(VIEW.indexOf("health.nextAction &&"))
        expect(cta.slice(0, 500)).toMatch(/<Link/)
        expect(cta.slice(0, 500)).toMatch(/risk-profile-wizard/)
    })

    it("hides every panel that would render empty", () => {
        // A page of empty scaffolding is the worst possible first impression,
        // and it is what a new customer sees unless each panel self-hides.
        expect(DNA).toMatch(/if \(scored\.length === 0\) return null/)
        expect(VIEW).toMatch(/household\.dependantCount > 0/)
        expect(VIEW).toMatch(/movingTrends\.length > 0 &&/)
        expect(VIEW).toMatch(/predictions\.length > 0 &&/)
    })

    it("keeps the evidence view reachable", () => {
        // "What we are protecting", with the evidence behind each verdict, is
        // the only surface that shows WHY we believe something — the product's
        // whole claim to trust. Removing its old home must not have lost it.
        const page = readFileSync("app/(protected)/insights/risk-profile/page.tsx", "utf-8")
        expect(page).toMatch(/<RiskGraphPanel/)
    })
})
