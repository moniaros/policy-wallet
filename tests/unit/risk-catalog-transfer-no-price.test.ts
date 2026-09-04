import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"

import { toLifeContext } from "@/lib/services/gap-engine/life-context"
import { RISK_CATALOG } from "@/lib/services/gap-engine/risk-catalog"
import type { Mitigation } from "@/lib/services/gap-engine/risk-types"

/**
 * A `transfer` mitigation names a mechanism — what the cover does. It does
 * not say what it costs, that it is cheap, or why you should want it: that
 * is a quote, and PolicyWallet advises, it does not sell (IDD / Law
 * 4583/2018 framing; docs/planning/PERSONAL_RISK_PROFILE.md). Until Sept
 * 2026 twelve transfer details carried «φθηνότερο», «δεν σας κοστίζει
 * τίποτα», «έκπτωση ΕΝΦΙΑ … αντισταθμίζει μέρος του ασφαλίστρου», «από τα
 * φθηνότερα ασφαλιστήρια της αγοράς … ο λόγος να το έχετε».
 *
 * The catalogue is enumerated from the module — every risk, every transfer,
 * both languages, across the contexts that change the wording — and the
 * matcher is proven against committed probes. `retain` / `reduce` / `avoid`
 * details are out of scope on purpose: «pay as you go is the cheaper answer»
 * is the honest retain advice, and a price word is what makes it honest.
 */

const PRICE_EN = [
    /\bcheap(?:er|est|ly)?\b/i,
    /\bpremiums?\b/i,
    /\bdiscount/i,
    /\bafford/i,
    /\blow(?:er)?[- ]cost\b/i,
    /\bcosts? you nothing\b/i,
    /\bless it costs\b/i,
    /\bat no (?:cost|charge)\b/i,
    /\bprices?\b/i,
    /\bpriced\b/i,
    /\binexpensive\b/i,
]
const PRICE_EL = [
    /φθην/i,
    /φτην/i,
    /κοστίζ/i,
    // «ασφάλιστρο» and its genitive «ασφαλίστρου» move the accent; «ασφαλιστήριο» (the policy) never matches.
    /ασφ[άα]λ[ίι]στρ/i,
    /έκπτωσ/i,
    /τιμή/i,
    /τιμές/i,
    /οικονομικότερ/i,
    /χαμηλό κόστος/i,
    /χωρίς κόστος/i,
]
/** Persuasion — a reason to WANT the product rather than what it does. */
const PERSUASION_EN = [/\bthe reason to (?:hold|have|buy) it\b/i, /\bmost (?:freelancers|people) skip\b/i]
const PERSUASION_EL = [/ο λόγος να το έχετε/i, /οι περισσότεροι .{0,40}παραλείπουν/i]

export function priceClauseFindings(detail: { en: string; el: string }): string[] {
    const out: string[] = []
    for (const re of [...PRICE_EN, ...PERSUASION_EN]) if (re.test(detail.en)) out.push(`en: ${re.source}`)
    for (const re of [...PRICE_EL, ...PERSUASION_EL]) if (re.test(detail.el)) out.push(`el: ${re.source}`)
    return out
}

/** Contexts that flip the wording branches inside `mitigations(ctx)`. */
const ANSWERED = [
    "dateOfBirth", "maritalStatus", "childrenCount", "dependentsCount", "hasPets", "vehiclesCount", "residenceType",
    "propertiesOwned", "rentsOutProperty", "ownsBusiness", "employmentStatus", "businessEmployees", "annualIncome",
    "savingsAmount", "mortgageAmount", "hasLoans", "loanAmount", "travelsFrequently", "activities", "valuablesValue",
    "cyberExposure", "retirementPlanning", "occupation", "drivingRecord", "chronicConditions", "familyMedicalHistory",
    "ownsBoat", "isBuildingManager",
]
const NOW = new Date("2026-09-04")
const CONTEXTS = [
    null,
    {
        answeredFields: ANSWERED, dateOfBirth: new Date("1990-01-01"), maritalStatus: "single", childrenCount: 0, dependentsCount: 0,
        hasPets: false, vehiclesCount: 0, residenceType: "rented", propertiesOwned: 0, rentsOutProperty: false, ownsBusiness: false,
        employmentStatus: "employed", businessEmployees: 0, annualIncome: 24000, savingsAmount: 12000, mortgageAmount: null,
        hasLoans: false, loanAmount: null, travelsFrequently: false, activities: [], valuablesValue: 0, cyberExposure: "low",
        retirementPlanning: false, occupation: "Office worker", drivingRecord: "clean", chronicConditions: [], familyMedicalHistory: [],
        ownsBoat: false, isBuildingManager: false,
    },
    {
        answeredFields: ANSWERED, dateOfBirth: new Date("1968-01-01"), maritalStatus: "married", childrenCount: 2, dependentsCount: 3,
        hasPets: true, vehiclesCount: 2, residenceType: "owned", propertiesOwned: 2, rentsOutProperty: true, ownsBusiness: true,
        employmentStatus: "self_employed", businessEmployees: 4, annualIncome: 60000, savingsAmount: 500, mortgageAmount: 180000,
        hasLoans: true, loanAmount: 20000, travelsFrequently: true, activities: ["skiing", "climbing"], valuablesValue: 30000,
        cyberExposure: "high", retirementPlanning: false, occupation: "Architect", drivingRecord: "accidents",
        chronicConditions: ["diabetes"], familyMedicalHistory: ["heart"], ownsBoat: true, isBuildingManager: true,
    },
].map((p) => toLifeContext(p as any, NOW))

describe("no transfer mitigation prices or persuades — the catalogue, enumerated", () => {
    const transfers: Array<{ riskId: string; label: string; detail: Mitigation["detail"] }> = []
    for (const risk of RISK_CATALOG) {
        for (const ctx of CONTEXTS) {
            for (const m of risk.mitigations(ctx)) if (m.kind === "transfer") transfers.push({ riskId: risk.id, label: m.label.en, detail: m.detail })
        }
    }

    it("sees every risk's transfers", () => {
        expect(RISK_CATALOG.length).toBeGreaterThan(20)
        expect(new Set(transfers.map((t) => t.riskId)).size).toBe(RISK_CATALOG.filter((r) => CONTEXTS.some((c) => r.mitigations(c).some((m) => m.kind === "transfer"))).length)
        expect(transfers.length).toBeGreaterThan(30)
    })

    it("no transfer detail carries a price or persuasion clause, in either language", () => {
        const offenders = transfers
            .map((t) => ({ ...t, findings: priceClauseFindings(t.detail) }))
            .filter((t) => t.findings.length > 0)
            .map((t) => `${t.riskId} › ${t.label}: ${t.findings.join(", ")}`)
        expect(offenders).toEqual([])
    })

    it("no transfer LABEL does either", () => {
        for (const risk of RISK_CATALOG) {
            for (const ctx of CONTEXTS) {
                for (const m of risk.mitigations(ctx)) {
                    if (m.kind !== "transfer") continue
                    expect(priceClauseFindings(m.label), `${risk.id} › ${m.label.en}`).toEqual([])
                }
            }
        }
    })
})

describe("the matcher is proven against committed probes", () => {
    const probe = (name: string) => readFileSync(`tests/fixtures/guard-probes/${name}`, "utf-8")
    /** The `detail: { en, el }` block of the probe — the label precedes it and is not under test. */
    const detailOf = (src: string) => {
        const block = src.slice(src.indexOf("detail: {"))
        return { en: /en: "([^"]+)"/.exec(block)?.[1] ?? "", el: /el: "([^"]+)"/.exec(block)?.[1] ?? "" }
    }

    it("flags the clauses that shipped", () => {
        const red = priceClauseFindings(detailOf(probe("transfer-detail-price-clause.ts.txt")))
        expect(red).toContain("en: \\bcheap(?:er|est|ly)?\\b")
        expect(red).toContain("en: \\bpremiums?\\b")
        expect(red).toContain("en: \\bdiscount")
        expect(red).toContain("en: \\bthe reason to (?:hold|have|buy) it\\b")
        expect(red).toContain("el: φθην")
        expect(red).toContain("el: κοστίζ")
        expect(red).toContain("el: ασφ[άα]λ[ίι]στρ")
        expect(red).toContain("el: έκπτωσ")
        expect(red).toContain("el: ο λόγος να το έχετε")
    })

    it("stays silent on defence costs, rebuild value, charges, «έξοδα υπεράσπισης», «εκτίμηση» and «ασφαλιστήριο»", () => {
        const green = detailOf(probe("transfer-detail-mechanism-only.ts.txt"))
        expect(green.en).toMatch(/defence costs/)
        expect(green.el).toMatch(/εκτίμηση/)
        expect(priceClauseFindings(green)).toEqual([])
        expect(priceClauseFindings({ en: "Add the policy here.", el: "Προσθέστε το ασφαλιστήριο εδώ." })).toEqual([])
    })
})
