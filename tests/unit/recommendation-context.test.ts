import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { toLifeContext } from "@/lib/services/gap-engine/life-context"
import { assessRisks, openFindings } from "@/lib/services/gap-engine/risk-assessment"
import { RISK_CATALOG } from "@/lib/services/gap-engine/risk-catalog"
import {
    deriveUrgency,
    deriveAdvisorOpportunity,
    deriveCustomerBenefit,
    withRecommendationContext,
    risksExposedBy,
    URGENCY_LEVELS,
} from "@/lib/services/gap-engine/recommendation-context"
import { assembleRiskGraph } from "@/lib/services/risk-graph/service"

/**
 * Guards for the four things a recommendation says that the assessment cannot.
 *
 * The mission this was built for asks a recommendation to carry nine things.
 * Five already existed. These are the four that did not — and the reason each is
 * derived rather than authored: twenty-one hand-written "customer benefits"
 * would be written in marketing voice and would drift from the risks they
 * describe within a release.
 */

const ALL_ANSWERED = [
    "dateOfBirth", "maritalStatus", "childrenCount", "dependentsCount", "hasPets",
    "vehiclesCount", "residenceType", "propertiesOwned", "rentsOutProperty",
    "ownsBusiness", "employmentStatus", "businessEmployees", "annualIncome",
    "savingsAmount", "mortgageAmount", "hasLoans", "loanAmount", "travelsFrequently",
    "activities", "valuablesValue", "cyberExposure", "retirementPlanning",
]

const NOW = new Date("2026-08-04")

function profile(overrides: Record<string, unknown> = {}) {
    return {
        answeredFields: ALL_ANSWERED,
        dateOfBirth: new Date("1985-01-01"),
        maritalStatus: "single",
        childrenCount: 0,
        dependentsCount: 0,
        hasPets: false,
        vehiclesCount: 0,
        residenceType: "rented",
        propertiesOwned: 0,
        rentsOutProperty: false,
        ownsBusiness: false,
        employmentStatus: "employed",
        businessEmployees: 0,
        annualIncome: 30000,
        savingsAmount: 5000,
        mortgageAmount: null,
        hasLoans: false,
        loanAmount: null,
        travelsFrequently: false,
        activities: [],
        valuablesValue: 0,
        cyberExposure: "low",
        retirementPlanning: true,
        ...overrides,
    } as any
}

const assess = (p: Record<string, unknown>, policies: Array<{ lineOfBusiness: string; status: string }> = []) =>
    assessRisks(toLifeContext(profile(p), NOW), policies)

const find = (p: Record<string, unknown>, riskId: string) =>
    assess(p).find((a) => a.riskId === riskId)!

describe("urgency is a different question from priority", () => {
    it("says nothing about timing for a risk with no deadline", () => {
        // A 41-year-old renter's income-protection gap matters, but there is no
        // date by which it must be closed. Saying "urgent" would be a lie told
        // to create pressure.
        const verdict = deriveUrgency(find({}, "income_interruption"), { age: 41 }, NOW)
        expect(verdict.level).toBe("no_deadline")
        expect(verdict.reason).toBeNull()
    })

    it("calls compulsory cover urgent from day one", () => {
        // Not a judgement about prudence: driving uninsured is an offence in
        // Greece, so the exposure exists before any accident does.
        const verdict = deriveUrgency(find({ vehiclesCount: 1 }, "motor_liability"), { age: 41 }, NOW)
        expect(verdict.level).toBe("now")
        expect(verdict.reason?.el).toContain("υποχρεωτική")
    })

    it("does not confuse a high-priority risk with an urgent one", () => {
        // The whole reason the two axes were split. `life_dependents` for a
        // young parent is as serious as findings get and has no deadline.
        const life = find({ childrenCount: 2, dependentsCount: 2 }, "life_dependents")
        expect(life.priority === "critical" || life.priority === "high").toBe(true)
        expect(deriveUrgency(life, { age: 41 }, NOW).level).toBe("no_deadline")
    })

    it("treats expired cover as open right now", () => {
        const graph = assembleRiskGraph(profile({ vehiclesCount: 1 }), [
            {
                id: "m",
                lineOfBusiness: "motor",
                status: "active",
                insurerName: null,
                endDate: new Date("2020-01-01"),
                acordData: { coverage: { perils: ["liability"], sumInsured: 1000000 } },
            },
        ])
        const motor = graph.assessments.find((a) => a.riskId === "motor_liability")!
        const bound = graph.risks.find((r) => r.riskId === "motor_liability") ?? null
        expect(deriveUrgency(motor, { age: 41, graphRisk: bound }, NOW).level).toBe("now")
    })

    it("gives a life change three months to be acted on", () => {
        const risk = find({ mortgageAmount: 180000, residenceType: "owned", propertiesOwned: 1 }, "life_debt")
        const inputs = {
            age: 41,
            recentEvents: [{ definitionId: "mortgage", occurredAt: new Date("2026-07-01") }],
            eventExposes: () => ["life_debt"],
        }
        expect(deriveUrgency(risk, inputs, NOW).level).toBe("weeks")

        // The same change two years ago is not news.
        const stale = { ...inputs, recentEvents: [{ definitionId: "mortgage", occurredAt: new Date("2024-07-01") }] }
        expect(deriveUrgency(risk, stale, NOW).level).toBe("no_deadline")
    })

    it("invents no underwriting deadline when the age is unknown", () => {
        // The window is real; asserting it for someone whose age we never asked
        // would be a deadline we made up.
        const risk = find({ childrenCount: 1, dependentsCount: 1 }, "life_dependents")
        expect(deriveUrgency(risk, { age: null }, NOW).level).toBe("no_deadline")
        expect(deriveUrgency(risk, { age: 58 }, NOW).level).toBe("months")
        expect(deriveUrgency(risk, { age: 30 }, NOW).level).toBe("no_deadline")
    })

    it("treats an unreadable event date as no event, rather than throwing", () => {
        const risk = find({ mortgageAmount: 180000, residenceType: "owned", propertiesOwned: 1 }, "life_debt")
        const verdict = deriveUrgency(
            risk,
            {
                age: 41,
                recentEvents: [{ definitionId: "mortgage", occurredAt: new Date("bad") }],
                eventExposes: () => ["life_debt"],
            },
            NOW
        )
        expect(verdict.level).toBe("no_deadline")
    })

    it("never reports a deadline for a risk that does not apply", () => {
        const notMine = assess({}).find((a) => a.riskId === "pet_costs")!
        expect(notMine.applicability).toBe("not_applicable")
        expect(deriveUrgency(notMine, { age: 41 }, NOW).level).toBe("no_deadline")
    })

    it("only ever returns a level from the vocabulary, with a reason iff there is a deadline", () => {
        for (const a of assess({ vehiclesCount: 1, childrenCount: 2, dependentsCount: 2, hasPets: true })) {
            const v = deriveUrgency(a, { age: 58 }, NOW)
            expect(URGENCY_LEVELS as readonly string[]).toContain(v.level)
            expect(v.reason === null).toBe(v.level === "no_deadline")
        }
    })
})

describe("which risks an event opened is derived, not authored", () => {
    it("maps an event to risks through the factors they share", () => {
        // `ContextDelta.factor` and `RiskDefinition.requires` speak the same
        // vocabulary, so a new event in the registry gets correct urgency with
        // no edit here.
        expect(risksExposedBy("birth")).toContain("life_dependents")
        expect(risksExposedBy("mortgage")).toContain("life_debt")
        expect(risksExposedBy("property_purchase")).toContain("home_building_damage")
        expect(risksExposedBy("pet_adoption")).toContain("pet_costs")
    })

    it("returns nothing for an event that does not exist", () => {
        expect(risksExposedBy("not_an_event")).toEqual([])
    })

    it("never names a risk outside the catalog", () => {
        const ids = new Set(RISK_CATALOG.map((r) => r.id))
        for (const event of ["birth", "mortgage", "property_purchase", "retirement"]) {
            for (const riskId of risksExposedBy(event)) expect(ids.has(riskId)).toBe(true)
        }
    })
})

describe("advisor opportunity names their work, not a pitch", () => {
    it("stays silent when nothing is unresolved", () => {
        // A fully-answered profile with a clear-cut finding needs no human to
        // interpret it, and manufacturing a reason to involve one is the
        // product-driven behaviour this whole engine exists to remove.
        const clear = find({ hasPets: true, petsCount: 1 }, "pet_costs")
        const opportunity = deriveAdvisorOpportunity(clear, null)
        if (opportunity !== null) {
            // Only acceptable if something really is open on this assessment.
            expect(
                clear.missingFactors.length > 0 || clear.eligibilityNote !== null
            ).toBe(true)
        }
    })

    it("speaks up where the market, not the maths, decides", () => {
        const withCaveat = assess({ dateOfBirth: new Date("1958-01-01"), childrenCount: 1, dependentsCount: 1 })
            .find((a) => a.eligibilityNote !== null && a.applicability === "applicable")
        if (withCaveat) {
            expect(deriveAdvisorOpportunity(withCaveat, null)).not.toBeNull()
        }
    })

    it("offers to map objects to policies when there is more than one thing", () => {
        // Asserted on the branch directly rather than through a persona: most
        // multi-object risks also carry a market caveat, which correctly
        // outranks this line, so a persona test would silently test the wrong
        // branch the moment catalog copy changed.
        const assessment = {
            riskId: "x",
            lineOfBusiness: "home",
            applicability: "applicable",
            status: "protection_gap",
            eligibilityNote: null,
            missingFactors: [],
        } as any
        const graphRisk = { anchorNodeIds: ["a", "b"], dimensions: [] } as any
        expect(deriveAdvisorOpportunity(assessment, graphRisk)?.en).toMatch(/one by one/)

        // One object, nothing unresolved — no reason to involve anyone.
        expect(deriveAdvisorOpportunity(assessment, { anchorNodeIds: ["a"], dimensions: [] } as any)).toBeNull()
    })

    it("leads with the market caveat when there is one", () => {
        // Ordered by how decision-relevant each open question is: whether cover
        // is available at all outranks which object it attaches to.
        const graph = assembleRiskGraph(profile({ residenceType: "owned", propertiesOwned: 3 }), [])
        const home = graph.assessments.find((a) => a.riskId === "home_building_damage")!
        expect(home.eligibilityNote).not.toBeNull()
        expect(deriveAdvisorOpportunity(home, graph.risks.find((r) => r.riskId === "home_building_damage")!)?.en)
            .toMatch(/underwriting question/)
    })

    it("says nothing for a risk that is not theirs", () => {
        const notMine = assess({}).find((a) => a.riskId === "pet_costs")!
        expect(deriveAdvisorOpportunity(notMine, null)).toBeNull()
    })

    it("never reads as a sales line", () => {
        const banned = /\b(buy|purchase|best price|cheap|deal|offer|discount|save money)\b/i
        const graph = assembleRiskGraph(profile({ residenceType: "owned", propertiesOwned: 3 }), [])
        for (const a of graph.assessments) {
            const text = deriveAdvisorOpportunity(a, graph.risks.find((r) => r.riskId === a.riskId) ?? null)
            if (text) expect(text.en).not.toMatch(banned)
        }
    })
})

describe("customer benefit follows the mitigation ladder", () => {
    it("describes keeping a fund when the lead answer is to retain", () => {
        const retained = assess({ hasPets: true, savingsAmount: 400000 }).find(
            (a) => a.mitigations[0]?.kind === "retain"
        )
        if (retained) {
            expect(deriveCustomerBenefit(retained).en).toMatch(/keep the premium/)
        }
    })

    it("never promises a purchase for a risk whose answer is not insurance", () => {
        // A benefit field that always described buying something would quietly
        // turn the mitigation ladder back into a catalogue.
        for (const a of assess({ hasPets: true, vehiclesCount: 1, childrenCount: 1, dependentsCount: 1 })) {
            if (a.mitigations[0]?.kind === "avoid" || a.mitigations[0]?.kind === "retain") {
                expect(deriveCustomerBenefit(a).en).not.toMatch(/cost of the loss stops being yours/)
            }
        }
    })

    it("is always populated in both languages", () => {
        for (const a of assess({ vehiclesCount: 1, hasPets: true, childrenCount: 2, dependentsCount: 2 })) {
            const benefit = deriveCustomerBenefit(a)
            expect(benefit.en.length).toBeGreaterThan(0)
            expect(benefit.el.length).toBeGreaterThan(0)
        }
    })
})

describe("every open recommendation carries all nine things", () => {
    it("has risk, explanation, evidence, priority, urgency, confidence, actions, advisor angle and benefit", () => {
        const p = profile({
            vehiclesCount: 1,
            childrenCount: 2,
            dependentsCount: 2,
            residenceType: "owned",
            propertiesOwned: 2,
            mortgageAmount: 150000,
        })
        const graph = assembleRiskGraph(p, [])
        const open = openFindings(graph.assessments)
        expect(open.length).toBeGreaterThan(0)

        const rows = open.map((a) => ({ riskId: a.riskId, urgency: a.priority }))
        const enriched = withRecommendationContext(
            rows,
            graph.assessments,
            { age: 41, graphRisks: graph.risks },
            NOW
        )

        for (const row of enriched) {
            const a = graph.assessments.find((x) => x.riskId === row.riskId)!
            expect(a.name.el, "risk").toBeTruthy()
            expect(a.riskExplanation.el, "explanation").toBeTruthy()
            expect(row.evidence?.length, `evidence for ${row.riskId}`).toBeGreaterThan(0)
            expect(row.urgency, "priority").toBeTruthy()
            expect(row.timing?.level, "urgency").toBeTruthy()
            expect(a.confidence, "confidence").toBeTruthy()
            expect(a.mitigations.length, "suggested actions").toBeGreaterThan(0)
            expect(row.customerBenefit?.el, "customer benefit").toBeTruthy()
            // Advisor opportunity is legitimately null when nothing is open —
            // that is the honest answer, not a missing field.
            expect(row).toHaveProperty("advisorOpportunity")
        }
    })

    it("leaves a row with no live assessment renderable rather than dropping it", () => {
        // Policy and portfolio findings carry no catalog risk. Dropping them
        // would hide a real finding just because it has no context to attach.
        const enriched = withRecommendationContext(
            [{ riskId: null }, { riskId: "no_such_risk" }],
            [],
            { age: 40 },
            NOW
        )
        expect(enriched).toHaveLength(2)
        for (const row of enriched) {
            expect(row.timing).toBeNull()
            expect(row.evidence).toBeNull()
            expect(row.customerBenefit).toBeNull()
        }
    })
})

/**
 * The fuzz.
 *
 * Two thousand partially-answered profiles against random wallets and random
 * event histories, from a fixed seed. The hand-written cases above are the
 * situations someone thought of; this is the one that covers the customer who
 * answered a scattered handful of questions, which is most of them.
 */
describe("fuzz: the nine fields survive any profile", () => {
    const FIELDS = [
        "dateOfBirth", "maritalStatus", "childrenCount", "dependentsCount", "hasPets",
        "vehiclesCount", "residenceType", "propertiesOwned", "rentsOutProperty",
        "ownsBusiness", "employmentStatus", "businessEmployees", "annualIncome",
        "savingsAmount", "mortgageAmount", "hasLoans", "loanAmount", "travelsFrequently",
        "activities", "valuablesValue", "cyberExposure", "retirementPlanning",
        "chronicConditions", "petsCount", "occupation", "ownsBoat",
    ]

    it("never leaves a recommendation short, or invents a deadline", () => {
        let seed = 20260804
        const rnd = () => {
            seed = (seed * 1103515245 + 12345) & 0x7fffffff
            return seed / 0x7fffffff
        }
        const pick = <T,>(xs: T[]): T => xs[Math.floor(rnd() * xs.length)]

        const failures: string[] = []
        const levels = new Set<string>()

        for (let n = 0; n < 2000; n++) {
            const rate = rnd()
            const p: any = {
                answeredFields: FIELDS.filter(() => rnd() < rate),
                dateOfBirth: pick([null, new Date("1940-01-01"), new Date("1958-01-01"), new Date("1990-01-01"), new Date("bad")]),
                maritalStatus: pick([null, "single", "married", "divorced", "widowed"]),
                childrenCount: pick([0, 1, 3, -1]),
                dependentsCount: pick([0, 2, 4]),
                hasPets: pick([true, false, null]),
                petsCount: pick([0, 1, 3, null]),
                vehiclesCount: pick([0, 1, 2, -1]),
                residenceType: pick([null, "rented", "owned", "family"]),
                propertiesOwned: pick([0, 1, 3, null]),
                rentsOutProperty: pick([true, false, null]),
                ownsBusiness: pick([true, false]),
                businessEmployees: pick([0, 4, null]),
                employmentStatus: pick([null, "employed", "self_employed", "retired", "student", "unemployed"]),
                annualIncome: pick([null, 0, 25000, 150000, NaN]),
                savingsAmount: pick([null, 0, 300000]),
                mortgageAmount: pick([null, 0, 180000]),
                hasLoans: pick([true, false]),
                loanAmount: pick([null, 20000]),
                travelsFrequently: pick([true, false]),
                activities: pick([[], ["skiing"], null]),
                valuablesValue: pick([0, 50000, null]),
                cyberExposure: pick([null, "low", "high"]),
                retirementPlanning: pick([true, false]),
                chronicConditions: pick([null, ["diabetes"]]),
                occupation: pick([null, "δικηγόρος", ""]),
                ownsBoat: pick([true, false]),
            }
            const wallet = Array.from({ length: Math.floor(rnd() * 4) }, (_, i) => ({
                id: `p${i}`,
                lineOfBusiness: pick(["home", "motor", "life", "health", "travel", "pet", "boat", "renters", "", null]),
                status: pick(["active", "expired", "cancelled"]),
                insurerName: pick([null, "ΕΘΝΙΚΗ"]),
                endDate: pick([null, new Date("2019-01-01"), new Date("2030-01-01"), new Date("bad")]),
                acordData: pick([
                    null,
                    {},
                    { coverage: { perils: ["fire"], sumInsured: 1000 } },
                    { coverage: { perils: ["fire", "earthquake", "flood", "theft"], sumInsured: 300000 } },
                ]),
            }))
            // Including a future-dated event and an id that is not in the
            // registry — neither may manufacture a deadline.
            const events = Array.from({ length: Math.floor(rnd() * 4) }, () => ({
                definitionId: pick(["birth", "mortgage", "property_purchase", "pet_adoption", "bogus_event"]),
                // An unreadable date included deliberately: `calendarDaysUntil`
                // throws rather than answering on one, and this path has no
                // per-row catch around it.
                occurredAt: pick([
                    new Date("2026-07-15"),
                    new Date("2023-01-01"),
                    new Date("2099-01-01"),
                    new Date("bad"),
                ]),
            }))

            const graph = assembleRiskGraph(p, wallet as any)
            const open = openFindings(graph.assessments)

            // The mission's rule, asserted on the real output rather than on
            // the catalog: nothing reaches a recommendation without an exposure.
            for (const a of open) {
                if (a.applicability !== "applicable") failures.push(`#${n}: ${a.riskId} recommended without exposure`)
            }

            const enriched = withRecommendationContext(
                open.map((a) => ({ riskId: a.riskId, urgency: a.priority })),
                graph.assessments,
                {
                    age: pick([null, 28, 52, 58, 63, 71]),
                    recentEvents: events,
                    eventExposes: risksExposedBy,
                    graphRisks: graph.risks,
                },
                NOW
            )

            for (const row of enriched) {
                const a = graph.assessments.find((x) => x.riskId === row.riskId)!
                levels.add(row.timing!.level)
                if (!row.evidence?.length) failures.push(`#${n}: ${row.riskId} no evidence`)
                if (!row.customerBenefit?.el) failures.push(`#${n}: ${row.riskId} no benefit`)
                if (!row.urgency || !a.confidence || !a.mitigations.length)
                    failures.push(`#${n}: ${row.riskId} missing a core field`)
                if ((row.timing!.reason === null) !== (row.timing!.level === "no_deadline"))
                    failures.push(`#${n}: ${row.riskId} deadline without a reason, or vice versa`)

                const copy = [
                    row.customerBenefit?.en, row.customerBenefit?.el,
                    row.advisorOpportunity?.en, row.advisorOpportunity?.el,
                    row.timing?.reason?.en, row.timing?.reason?.el,
                ].filter(Boolean).join(" ")
                if (/NaN|undefined|Infinity|\[object/.test(copy)) failures.push(`#${n}: ${row.riskId} broken copy`)
                if (/\b(buy now|purchase|cheap|deal|discount|limited time)\b/i.test(copy))
                    failures.push(`#${n}: ${row.riskId} reads as a sales line`)
            }
        }

        expect([...new Set(failures)].slice(0, 20)).toEqual([])
        // A deadline that never fires and one that always fires are both useless.
        expect(levels.has("no_deadline")).toBe(true)
        expect(levels.size).toBeGreaterThan(1)
    })
})

describe("every surface that renders a card gets all nine fields", () => {
    it("no page reads the raw recommendation rows", () => {
        // `getActiveRecommendations` returns the persisted columns and leaves
        // the four derived fields null. Two pages called it directly and
        // rendered cards missing four of the nine things a recommendation is
        // supposed to say. A field set that depends on which function you
        // happened to call is how surfaces drift apart.
        const pages = [
            "app/(protected)/wallet/[id]/page.tsx",
            "app/(protected)/branches/[branch]/page.tsx",
            "app/(protected)/coverage-insights/page.tsx",
        ]
        for (const page of pages) {
            const src = readFileSync(page, "utf-8")
            expect(src, `${page} reads raw recommendation rows`).not.toMatch(
                /getActiveRecommendations/
            )
        }
    })

    it("offers a complete read for callers that hold nothing", () => {
        const src = readFileSync("lib/services/gap-engine/index.ts", "utf-8")
        expect(src).toMatch(/export async function getEnrichedRecommendations/)
        const body = src.slice(src.indexOf("export async function getEnrichedRecommendations"))
        expect(body.slice(0, 2000)).toMatch(/enrichRecommendations\(/)
    })
})

describe("priority and urgency are two names for two things", () => {
    it("keeps the deprecated alias equal to the field that replaced it", () => {
        // `urgency` is the severity axis under a wrong name, kept because
        // fifteen surfaces speak it. Both are assigned from one expression at
        // one site; this is what stops them drifting while the rename waits.
        const src = readFileSync("lib/services/gap-engine/recommendation-generator.ts", "utf-8")
        const block = src.slice(src.indexOf("urgency: r.urgency as GapSeverity"))
        expect(block.slice(0, 400)).toMatch(/priority: r\.urgency as GapSeverity/)
    })

    it("does not let the persisted column carry the timing axis", () => {
        // Timing is derived live. If it were ever written to the row it would go
        // stale exactly when it matters — the day after a policy expires.
        const schema = readFileSync("prisma/schema.prisma", "utf-8")
        const model = schema.slice(
            schema.indexOf("model RecommendationInstance"),
            schema.indexOf("model RecommendationInstance") + 3000
        )
        expect(model).not.toMatch(/\btiming\b/)
    })
})

describe("the card renders the four new fields safely", () => {
    const CARD = readFileSync("components/coverage/RecommendationCards.tsx", "utf-8")

    it("shows a deadline badge only when there is a deadline", () => {
        // `no_deadline` is the common case. A badge on every card would make the
        // urgency axis as uninformative as the severity one it was split from.
        expect(CARD).toMatch(/rec\.timing\.level !== "no_deadline"/)
    })

    it("never shows a deadline without saying what it is", () => {
        // A deadline asserted with no reason is just pressure.
        expect(CARD).toMatch(/rec\.timing\?\.reason/)
        expect(CARD).toMatch(/Γιατί τώρα/)
    })

    it("lets long Greek evidence wrap instead of widening the card", () => {
        const evidenceBlock = CARD.slice(CARD.indexOf("Σε τι βασιζόμαστε"), CARD.indexOf("Τι κερδίζετε"))
        expect(evidenceBlock).toMatch(/overflow-wrap:anywhere/)
        expect(evidenceBlock).toMatch(/min-w-0/)
    })

    it("hides each new block when its field is absent", () => {
        // Policy and portfolio findings carry no assessment, so all four are
        // null on those rows — they must render nothing rather than an empty
        // heading with a blank body.
        for (const field of ["rec.evidence", "rec.customerBenefit", "rec.advisorOpportunity"]) {
            expect(CARD, `${field} rendered unguarded`).toContain(`{${field} &&`)
        }
    })

    it("marks the deadline icon decorative", () => {
        const badge = CARD.slice(CARD.indexOf("rec.timing.level ==="), CARD.indexOf("Άμεσα") + 200)
        expect(badge).toMatch(/<Clock[^>]*aria-hidden="true"/)
    })

    it("adds no fixed width that could overflow a 320px viewport", () => {
        const widths = [...CARD.matchAll(/\bw-\[(\d+)px\]/g)].map((m) => Number(m[1]))
        expect(widths.filter((w) => w > 280)).toEqual([])
    })
})

describe("the context cannot go stale behind a profile change", () => {
    it("is derived from the live assessment, never read off the persisted row", () => {
        const src = readFileSync("lib/services/gap-engine/index.ts", "utf8")
        // Both engine paths must enrich; otherwise the four fields would be as
        // stale as whatever the last engine run wrote.
        expect([...src.matchAll(/enrichRecommendations\(/g)].length).toBeGreaterThanOrEqual(3)
    })

    it("re-runs the engine before the profile save responds", () => {
        // The wizard calls router.refresh() the moment the PATCH resolves and
        // re-reads the PERSISTED rows. Firing the engine without awaiting it
        // raced that, so answering questions appeared to change nothing.
        const route = readFileSync("app/api/v1/risk-profile/route.ts", "utf8")
        expect(route).toMatch(/await refreshProtectionScore\(/)

        const questionnaire = readFileSync("app/api/v1/questionnaires/[id]/route.ts", "utf8")
        expect(questionnaire).toMatch(/await import\("@\/lib\/services\/gap-engine"\)/)
    })
})
