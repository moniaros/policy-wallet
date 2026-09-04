import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { el } from "@/lib/i18n/translations/el"
import { toLifeContext } from "@/lib/services/gap-engine/life-context"
import { PROFILE_GAP_RULES, type ProfileFields } from "@/lib/services/gap-engine/profile-gap-rules"
import { RISK_CATALOG } from "@/lib/services/gap-engine/risk-catalog"
import { SINGULAR_FORMS, stringLeaves } from "../helpers/greek-register"

/**
 * The home speaks the formal plural — every sentence of it, including the
 * ones it does not author. The walk read «Μας δήλωσες 1 όχημα» under a
 * recommendation on /dashboard: a sentence in the onboarding's singular
 * («όσα μας είπες») inside «Η εικόνα σας». The card's own copy is
 * `dashboard.home.*`; the sentences it RENDERS come from elsewhere — a
 * recommendation's `personalReason` is the risk catalogue's `whyItApplies`
 * (assessmentsToRecommendations), a profile rule's `reason`, or a portfolio
 * rule's — and the map's singular reason table (REASON_TEXT in
 * derive-priorities) has a formal twin under `protection.attention.reasons`
 * that is the only one a formal surface may read.
 *
 * Universe, enumerated rather than assumed:
 *   - every string leaf of `el.dashboard.home`;
 *   - every catalogue risk's name, riskExplanation, whyItApplies and
 *     expectedImpact, EVALUATED over four life contexts (the functions
 *     compose their sentences from the facts — a static grep would miss a
 *     branch);
 *   - every profile gap rule's reason, evaluated over a full profile;
 *   - every Greek string literal in the two files that compose reasons
 *     without a context (portfolio-rules, risk-assessment);
 *   - and no file under components/dashboard or app/(protected)/dashboard
 *     may reach the singular table (`REASON_TEXT`, `.reason.text`).
 *
 * Probe: tests/fixtures/guard-probes/dashboard-register-singular.txt.
 */

const REPO = process.cwd()

const ANSWERED = [
    "dateOfBirth", "maritalStatus", "childrenCount", "dependentsCount", "residenceType", "ownsHome", "propertiesOwned", "rentsOutProperty",
    "ownsBoat", "vehiclesCount", "hasPets", "petsCount", "valuablesValue", "employmentStatus", "occupation", "ownsBusiness", "businessEmployees",
    "annualIncome", "incomeDependency", "savingsAmount", "mortgageAmount", "hasLoans", "loanAmount", "travelsFrequently", "isBuildingManager",
    "activities", "cyberExposure", "retirementPlanning", "chronicConditions", "familyMedicalHistory", "drivingRecord", "smokingStatus",
]

/** Everything true at once: every `applies` branch that can fire, fires. */
const RICH = {
    dateOfBirth: new Date("1980-01-01T00:00:00Z"),
    maritalStatus: "married",
    childrenCount: 2,
    dependentsCount: 3,
    residenceType: "owned",
    ownsHome: true,
    propertiesOwned: 2,
    rentsOutProperty: true,
    ownsBoat: true,
    vehiclesCount: 2,
    hasPets: true,
    petsCount: 1,
    valuablesValue: 20000,
    employmentStatus: "self_employed",
    occupation: "lawyer",
    ownsBusiness: true,
    businessEmployees: 3,
    annualIncome: 40000,
    incomeDependency: "primary",
    savingsAmount: 10000,
    mortgageAmount: 100000,
    hasLoans: true,
    loanAmount: 20000,
    travelsFrequently: true,
    isBuildingManager: true,
    activities: ["climbing", "motorsport"],
    cyberExposure: "high",
    retirementPlanning: "none",
    chronicConditions: ["diabetes"],
    familyMedicalHistory: ["cancer"],
    drivingRecord: "clean",
    smokingStatus: "never",
    answeredFields: ANSWERED,
}
const CONTEXTS = [
    RICH,
    { ...RICH, residenceType: "rented", ownsHome: false, mortgageAmount: 0 },
    { ...RICH, employmentStatus: "employed", occupation: "teacher", ownsBusiness: false, businessEmployees: 0, vehiclesCount: 1, childrenCount: 0, dependentsCount: 0 },
    { answeredFields: [] as string[] },
].map((profile) => toLifeContext(profile as any, new Date("2026-09-04T10:00:00Z")))

const PROFILE_FIELDS: ProfileFields = {
    maritalStatus: "married",
    dependentsCount: 2,
    employmentStatus: "self_employed",
    ownsHome: true,
    mortgageAmount: 100000,
    hasPets: true,
    vehiclesCount: 1,
    dateOfBirth: new Date("1980-01-01T00:00:00Z"),
    annualIncome: 40000,
    occupation: "lawyer",
    riskTolerance: "medium",
    hasLoans: true,
    loanAmount: 20000,
    travelsFrequently: true,
    smokingStatus: "never",
    lifeEvents: [],
    gender: "female",
    heightCm: 170,
    weightKg: 65,
    chronicConditions: ["diabetes"],
    familyMedicalHistory: ["cancer"],
    drivingRecord: "clean",
    activityLevel: "active",
}

function walk(dir: string, out: string[] = []): string[] {
    for (const name of readdirSync(dir)) {
        const p = join(dir, name)
        if (statSync(p).isDirectory()) {
            if (name === "node_modules" || name.startsWith(".")) continue
            walk(p, out)
        } else if (/\.(ts|tsx)$/.test(name)) out.push(p)
    }
    return out
}

/** Every string / template literal in a source that contains Greek. */
function greekLiterals(source: string): string[] {
    const out: string[] = []
    for (const m of source.matchAll(/"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g)) {
        const text = m[1] ?? m[2] ?? m[3] ?? ""
        if (/[Ͱ-Ͽἀ-῿]/.test(text)) out.push(text)
    }
    return out
}

const flag = (sentences: readonly [string, string][]) => sentences.filter(([, text]) => SINGULAR_FORMS.test(text)).map(([where, text]) => `${where}: ${text}`)

describe("the home speaks the formal plural — its own copy and every reason it renders", () => {
    it("dashboard.home.* carries no singular form", () => {
        const leaves = stringLeaves((el as any).dashboard.home, "dashboard.home")
        expect(leaves.length).toBeGreaterThan(50)
        expect(flag(leaves)).toEqual([])
    })

    it("every catalogue sentence a recommendation can carry, evaluated over four contexts, is formal", () => {
        const sentences: [string, string][] = []
        for (const risk of RISK_CATALOG) {
            sentences.push([`${risk.id}.name`, risk.name.el])
            CONTEXTS.forEach((ctx, i) => {
                for (const field of ["riskExplanation", "whyItApplies", "expectedImpact"] as const) {
                    try {
                        sentences.push([`${risk.id}.${field}[ctx${i}]`, risk[field](ctx).el])
                    } catch {
                        /* a composer that needs a fact this context lacks — the other contexts cover it */
                    }
                }
            })
        }
        // The universe is real: ~22 risks × 3 fields × 4 contexts, plus the names.
        expect(sentences.length).toBeGreaterThan(200)
        expect(flag(sentences)).toEqual([])
        // And the doubled pronoun is gone from the self-employed sentence.
        const pl = RISK_CATALOG.find((r) => r.id === "professional_liability")!
        // No occupation the catalogue lists as high-liability, so the generic self-employed branch composes the sentence.
        const selfEmployed = pl.whyItApplies(toLifeContext({ ...RICH, occupation: null, ownsBusiness: false } as any)).el
        expect(selfEmployed).not.toMatch(/σας σας/)
        expect(selfEmployed).toContain("φτάνουν σε εσάς προσωπικά")
    })

    it("every profile gap rule's reason is formal", () => {
        const sentences: [string, string][] = PROFILE_GAP_RULES.map((rule) => [rule.id, rule.reason(PROFILE_FIELDS).el])
        expect(sentences.length).toBeGreaterThan(10)
        expect(flag(sentences)).toEqual([])
    })

    it("the context-free reason composers carry no singular literal", () => {
        for (const file of ["lib/services/gap-engine/portfolio-rules.ts", "lib/services/gap-engine/risk-assessment.ts"]) {
            const literals = greekLiterals(readFileSync(join(REPO, file), "utf-8")).map((s): [string, string] => [file, s])
            expect(literals.length, `${file} holds Greek literals`).toBeGreaterThan(5)
            expect(flag(literals)).toEqual([])
        }
    })

    it("no dashboard file reaches the map's singular reason table", () => {
        const files = [...walk(join(REPO, "components/dashboard")), ...walk(join(REPO, "app/(protected)/dashboard"))]
        expect(files.length).toBeGreaterThan(10)
        const offenders = files.filter((f) => /\bREASON_TEXT\b|\.reason\.text\b/.test(readFileSync(f, "utf-8")))
        expect(offenders).toEqual([])
    })

    it("PROBE: the scanner flags every SINGULAR line of the committed fixture and none of the FORMAL ones", () => {
        const lines = readFileSync(join(REPO, "tests/fixtures/guard-probes/dashboard-register-singular.txt"), "utf-8")
            .split("\n")
            .filter((l) => /^(SINGULAR|FORMAL) /.test(l))
        const singular = lines.filter((l) => l.startsWith("SINGULAR ")).map((l) => l.slice("SINGULAR ".length))
        const formal = lines.filter((l) => l.startsWith("FORMAL ")).map((l) => l.slice("FORMAL ".length))
        expect(singular.length).toBeGreaterThanOrEqual(7)
        expect(formal.length).toBeGreaterThanOrEqual(7)
        expect(singular.filter((s) => !SINGULAR_FORMS.test(s))).toEqual([])
        expect(formal.filter((s) => SINGULAR_FORMS.test(s))).toEqual([])
    })
})
