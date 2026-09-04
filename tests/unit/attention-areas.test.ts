import { describe, expect, it } from "vitest"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

import { el } from "@/lib/i18n/translations/el"
import {
    ALIGNMENTS,
    attentionSummary,
    buildAttentionAreas,
    factorEvidence,
    type AttentionAreaView,
    type AttentionNeeds,
} from "@/lib/protection/attention-areas"
import { buildCoverageModel, type PolicyEvidenceInput } from "@/lib/protection/coverage-model"
import { AREA_IDS, AREA_ORDER, type AttentionAreaId } from "@/lib/protection/domains"
import type { FactProvenanceMap } from "@/lib/protection/evidence"
import { toLifeContext } from "@/lib/services/gap-engine/life-context"
import { assessRisks, type HeldPolicy } from "@/lib/services/gap-engine/risk-assessment"
import {
    deriveProtectionPriorities,
    type ProtectionPriority,
    type ProtectionStatementsLike,
} from "@/lib/services/protection-profile/derive-priorities"

/**
 * The composition — docs/planning/PERSONAL_RISK_PROFILE.md §C, §H, §I.
 *
 * Every fixture is built the way the surface will build it: facts through
 * `toLifeContext`, exposure through `assessRisks`, protection through
 * `buildCoverageModel`, importance through `deriveProtectionPriorities` (or a
 * hand-built row where the rule that produces it — §E's income dependency —
 * lives in another wave). Nothing is stubbed.
 */

const AT = "2026-09-04T10:00:00.000Z"
const exact = (source: "onboarding" | "assessment" = "onboarding") => ({ source, precision: "exact" as const, at: AT })
const coarse = () => ({ source: "onboarding" as const, precision: "coarse" as const, at: AT })

const ATTENTION = (el.protection as Record<string, any>).attention as {
    caveats: Record<string, string>
    next: Record<string, string>
    reasons: Record<string, string>
}

interface World {
    profile?: Record<string, unknown>
    policies?: PolicyEvidenceInput[]
    priorities?: ProtectionPriority[]
    statements?: ProtectionStatementsLike | null
    needs?: AttentionNeeds
    provenance?: FactProvenanceMap
    language?: "el" | "en"
}

function build(w: World): AttentionAreaView[] {
    const ctx = toLifeContext((w.profile ?? {}) as any)
    const policies = w.policies ?? []
    // The engine sees what is in force — both held bands — as `active`.
    const held: HeldPolicy[] = policies
        .filter((p) => p.lifecycle === "active" || p.lifecycle === "expiring_soon")
        .map((p) => ({ lineOfBusiness: p.lineOfBusiness, status: "active" }))
    const statements = w.statements ?? (w.needs?.riskConcerns ? { riskConcerns: [...w.needs.riskConcerns] } : null)
    return buildAttentionAreas({
        priorities: w.priorities ?? deriveProtectionPriorities(ctx, statements),
        assessments: assessRisks(ctx, held),
        coverage: buildCoverageModel(policies),
        provenance: w.provenance ?? {},
        ctx,
        needs: w.needs ?? {},
        language: w.language ?? "el",
    })
}

const area = (views: AttentionAreaView[], id: AttentionAreaId) => views.find((v) => v.area === id)!

/** Two people depend on this person, who is employed — the deciding facts of life_dependents. */
const FAMILY = {
    childrenCount: 1,
    dependentsCount: 2,
    employmentStatus: "employed",
    answeredFields: ["childrenCount", "dependentsCount", "employmentStatus"],
}
const FAMILY_PROVENANCE: FactProvenanceMap = { childrenCount: exact(), dependentsCount: exact(), employmentStatus: exact() }

/** …and the refining facts too, so the area has nothing left to ask. */
const FAMILY_FULL = {
    ...FAMILY,
    dateOfBirth: new Date("1985-05-05T00:00:00Z"),
    maritalStatus: "married",
    annualIncome: 30000,
    savingsAmount: 5000,
    answeredFields: [...FAMILY.answeredFields, "dateOfBirth", "maritalStatus", "annualIncome", "savingsAmount"],
}

/** §E: income dependency declared as `primary` → household high. The rule lives in wave 1a/2a; the row is what the composition reads. */
const HOUSEHOLD_HIGH: ProtectionPriority = {
    id: "household",
    domain: "household",
    importance: "high",
    reason: { id: "income_dependency", text: { el: "", en: "" } },
    confidence: "known",
    requiresValidation: true,
    status: "needs_review",
    source: "declared_fact",
}

const lifePolicy = (over: Partial<PolicyEvidenceInput> = {}): PolicyEvidenceInput => ({
    id: "life-1",
    lineOfBusiness: "life",
    lifecycle: "active",
    detail: "summary_only",
    gaps: [],
    ...over,
})
const RULE_GAP = { id: "g1", ruleId: "life_sum_below_income_years", slug: "life-sum-below-need", severity: "high", title: { el: "Ασφαλισμένο κεφάλαιο μικρότερο από την ανάγκη", en: "Sum insured below the need" } }

// ─── The brief's example, end to end ────────────────────────────────────────

describe("household: dependency declared, then a policy, then a finding", () => {
    it("declared, no policy: high · not_yet_checked · user_reported · nothing rendered as absence", () => {
        const h = area(build({ profile: FAMILY_FULL, priorities: [HOUSEHOLD_HIGH], provenance: { ...FAMILY_PROVENANCE, dateOfBirth: exact(), maritalStatus: exact(), annualIncome: exact("assessment"), savingsAmount: exact("assessment") } }), "household")
        expect(h.importance).toBe("high")
        expect(h.activated).toBe(true)
        expect(h.alignment).toBe("not_yet_checked")
        expect(h.confidence).toBe("user_reported")
        expect(h.requiresValidation).toBe(true)
        expect(h.protection.lines).toEqual([])
        expect(h.unknownFactors).toEqual([])
        // The engine's own reading of absence is kept visible as exposure…
        expect(h.exposure.risks.find((r) => r.id === "life_dependents")?.status).toBe("protection_gap")
        // …but the area never says «uncovered»: the triplet.
        expect(h.explanation.why).toBe("2 άτομα εξαρτώνται από το εισόδημά σας, και αυτή τη στιγμή εργάζεστε.")
        expect(h.explanation.unknown).toBe(`${ATTENTION.caveats.no_policy_seen} ${ATTENTION.caveats.absence_not_evidence}`)
        expect(h.explanation.nextStep).toBe("check_first_policy")
        expect(h.explanation.next).toBe(ATTENTION.next.check_first_policy)
    })

    it("the refining facts unknown: the unknown line lists them as nouns, the next step is still the first policy", () => {
        const h = area(build({ profile: FAMILY, priorities: [HOUSEHOLD_HIGH], provenance: FAMILY_PROVENANCE }), "household")
        expect(h.alignment).toBe("not_yet_checked")
        expect(h.unknownFactors).toEqual(["income", "age", "maritalStatus", "savings"])
        expect(h.explanation.unknown).toBe(
            `Δεν ξέρουμε ακόμη: το εισόδημά σας, την ηλικία σας, την οικογενειακή σας κατάσταση, τις αποταμιεύσεις σας. ${ATTENTION.caveats.absence_not_evidence}`
        )
        expect(h.explanation.nextStep).toBe("check_first_policy")
    })

    it("a floor-estimated dependant count caps confidence at inferred", () => {
        const h = area(build({ profile: FAMILY, priorities: [HOUSEHOLD_HIGH], provenance: { ...FAMILY_PROVENANCE, dependentsCount: coarse() } }), "household")
        expect(h.confidence).toBe("inferred")
    })

    it("a summary-only life policy: appears_covered, the limits caveat, and confidence capped by the weakest fact", () => {
        const h = area(build({ profile: FAMILY_FULL, priorities: [HOUSEHOLD_HIGH], provenance: FAMILY_PROVENANCE, policies: [lifePolicy()] }), "household")
        expect(h.alignment).toBe("appears_covered")
        expect(h.requiresValidation).toBe(false)
        expect(h.protection.lines.map((l) => [l.lob, l.held, l.detail, l.evidence])).toEqual([["life", true, "summary_only", "policy_verified"]])
        expect(h.protection.hasAnalysed).toBe(false)
        // The line is policy_verified; the facts it rests on are user_reported; the weaker wins.
        expect(h.confidence).toBe("user_reported")
        expect(`${h.explanation.why} ${h.explanation.unknown}`).toContain(ATTENTION.caveats.limits_unread)
        expect(h.explanation.nextStep).toBe("nothing_now")
    })

    it("summary-only with refining facts unknown: the why carries the limits caveat, the unknown line lists the facts", () => {
        const h = area(build({ profile: FAMILY, priorities: [HOUSEHOLD_HIGH], provenance: FAMILY_PROVENANCE, policies: [lifePolicy()] }), "household")
        expect(h.alignment).toBe("appears_covered")
        expect(h.explanation.why).toContain(ATTENTION.caveats.limits_unread)
        expect(h.explanation.unknown).toMatch(/^Δεν ξέρουμε ακόμη: το εισόδημά σας/)
        expect(h.explanation.nextStep).toBe("answer_questions")
        expect(h.explanation.next).toBe("Απαντήστε 4 σύντομες ερωτήσεις.")
    })

    it("an analysed policy reads the limits, and still cannot claim more than the facts", () => {
        const h = area(build({ profile: FAMILY_FULL, priorities: [HOUSEHOLD_HIGH], provenance: FAMILY_PROVENANCE, policies: [lifePolicy({ detail: "analysed", coverages: [{ name: "death", limit: 100000 }] })] }), "household")
        expect(h.alignment).toBe("appears_covered")
        expect(h.protection.hasAnalysed).toBe(true)
        expect(h.explanation.unknown).toBe(ATTENTION.caveats.limits_read)
        expect(h.confidence).toBe("user_reported")
    })

    it("a rule-decided finding on that policy is the only `gap`", () => {
        const h = area(build({ profile: FAMILY_FULL, priorities: [HOUSEHOLD_HIGH], provenance: FAMILY_PROVENANCE, policies: [lifePolicy({ gaps: [RULE_GAP] })] }), "household")
        expect(h.alignment).toBe("gap")
        expect(h.protection.gaps.map((g) => [g.ruleId, g.onHeldPolicy])).toEqual([["life_sum_below_income_years", true]])
        expect(h.protection.gaps[0].title.el).toBe(RULE_GAP.title.el)
        expect(h.explanation.nextStep).toBe("review_finding")
        expect(h.requiresValidation).toBe(false)
    })

    it("an expired-only line does not count — not for cover, not for its finding", () => {
        const h = area(build({ profile: FAMILY_FULL, priorities: [HOUSEHOLD_HIGH], provenance: FAMILY_PROVENANCE, policies: [lifePolicy({ lifecycle: "expired", gaps: [RULE_GAP] })] }), "household")
        expect(h.alignment).toBe("not_yet_checked")
        expect(h.requiresValidation).toBe(true)
        expect(h.protection.lines.map((l) => [l.lifecycle, l.held])).toEqual([["expired", false]])
        expect(h.protection.gaps[0].onHeldPolicy).toBe(false)
        expect(h.explanation.unknown).toContain(ATTENTION.caveats.absence_not_evidence)
    })

    it("a line held under another area that answers the risk still counts, and validation is satisfied", () => {
        const views = build({ profile: FAMILY_FULL, priorities: [HOUSEHOLD_HIGH], provenance: FAMILY_PROVENANCE, policies: [lifePolicy({ id: "pa", lineOfBusiness: "personal_accident" })] })
        const h = area(views, "household")
        expect(h.protection.lines).toEqual([])
        expect(area(views, "income").protection.lines.map((l) => l.lob)).toEqual(["personal_accident"])
        expect(h.alignment).toBe("appears_covered")
        expect(h.requiresValidation).toBe(false)
        expect(h.confidence).toBe("user_reported")
    })
})

// ─── The other rows of §C's table ───────────────────────────────────────────

describe("alignment rows", () => {
    it("unknown when a deciding fact is missing — the questions come first, requires before supports", () => {
        const h = area(build({}), "household")
        expect(h.alignment).toBe("unknown")
        expect(h.confidence).toBe("unknown")
        expect(h.unknownFactors.slice(0, 2)).toEqual(["dependents", "children"])
        expect(h.unknownFactors).toEqual(["dependents", "children", "income", "age", "maritalStatus", "savings"])
        expect(h.explanation.nextStep).toBe("answer_questions")
        expect(h.explanation.next).toBe("Απαντήστε 6 σύντομες ερωτήσεις.")
        expect(h.explanation.unknown).toMatch(/^Δεν ξέρουμε ακόμη: ποιοι βασίζονται σε εσάς, πόσα παιδιά έχετε/)
        expect(h.explanation.why).toBe(ATTENTION.reasons.dormant)
    })

    it("one missing fact reads as one question", () => {
        const m = area(build({}), "mobility")
        expect(m.alignment).toBe("unknown")
        expect(m.unknownFactors).toEqual(["vehicles"])
        expect(m.explanation.next).toBe(ATTENTION.next.answer_question_one)
    })

    it("a stated concern with nothing held is `review` — and never a gap", () => {
        const h = area(build({ profile: FAMILY_FULL, provenance: FAMILY_PROVENANCE, needs: { riskConcerns: ["family"] } }), "household")
        expect(h.importance).toBe("high")
        expect(h.activated).toBe(true)
        expect(h.alignment).toBe("review")
        expect(h.explanation.nextStep).toBe("check_first_policy")
        // With a policy the concern is answered, not escalated.
        const covered = area(build({ profile: FAMILY_FULL, provenance: FAMILY_PROVENANCE, needs: { riskConcerns: ["family"] }, policies: [lifePolicy()] }), "household")
        expect(covered.alignment).toBe("appears_covered")
    })

    it("an engine finding is `review` only on evidence: a home policy that leaves the manager's liability open", () => {
        const owner = {
            residenceType: "owned",
            ownsHome: true,
            propertiesOwned: 1,
            rentsOutProperty: false,
            isBuildingManager: true,
            answeredFields: ["residenceType", "ownsHome", "propertiesOwned", "rentsOutProperty", "isBuildingManager"],
        }
        const home = (): PolicyEvidenceInput => ({ id: "home-1", lineOfBusiness: "home", lifecycle: "active", detail: "summary_only", gaps: [] })
        const withPolicy = area(build({ profile: owner, policies: [home()] }), "residence")
        expect(withPolicy.exposure.risks.find((r) => r.id === "home_building_damage")?.status).toBe("already_covered")
        expect(withPolicy.exposure.risks.find((r) => r.id === "common_areas_liability")?.status).toBe("protection_gap")
        expect(withPolicy.alignment).toBe("review")
        expect(withPolicy.explanation.nextStep).toBe("review_finding")
        expect(withPolicy.requiresValidation).toBe(false)
        // The same exposure with nothing held is «δεν έχουμε δει», not a finding.
        const without = area(build({ profile: owner }), "residence")
        expect(without.alignment).toBe("not_yet_checked")
        expect(without.explanation.nextStep).toBe("check_first_policy")
    })

    it("an area whose risks are all out of scope has nothing to do", () => {
        const m = area(build({ profile: { vehiclesCount: 0, answeredFields: ["vehiclesCount"] } }), "mobility")
        expect(m.exposure.risks.every((r) => r.status === "not_applicable")).toBe(true)
        expect(m.alignment).toBe("not_yet_checked")
        expect(m.explanation.nextStep).toBe("nothing_now")
        expect(m.confidence).toBe("inferred") // known, but nothing recorded how
    })

    it("an area with no priority row is `watch`, not activated, and still listed", () => {
        const views = build({ profile: FAMILY_FULL })
        expect(views).toHaveLength(AREA_IDS.length)
        const w = area(views, "work")
        expect(w.importance).toBe("watch")
        expect(w.activated).toBe(false)
    })
})

// ─── Confidence ─────────────────────────────────────────────────────────────

describe("factorEvidence — the weakest link, per fact", () => {
    const ctx = toLifeContext({ dependentsCount: 2, residenceType: "owned", ownsHome: true, answeredFields: ["dependentsCount", "residenceType", "ownsHome"] } as any)

    it("unknown to the engine → unknown; known and unstamped → inferred", () => {
        expect(factorEvidence("vehicles", ctx, {})).toBe("unknown")
        expect(factorEvidence("dependents", ctx, {})).toBe("inferred")
    })

    it("reads the provenance: exact → user_reported, coarse → inferred, policy → policy_verified", () => {
        expect(factorEvidence("dependents", ctx, { dependentsCount: exact() })).toBe("user_reported")
        expect(factorEvidence("dependents", ctx, { dependentsCount: coarse() })).toBe("inferred")
        expect(factorEvidence("dependents", ctx, { dependentsCount: { source: "policy", precision: "exact", at: AT } })).toBe("policy_verified")
    })

    it("a factor known through several columns takes the strongest one", () => {
        expect(factorEvidence("residence", ctx, { residenceType: exact(), ownsHome: coarse() })).toBe("user_reported")
        expect(factorEvidence("residence", ctx, { ownsHome: coarse() })).toBe("inferred")
    })
})

// ─── Ordering, density, language, summary ───────────────────────────────────

const MANY = {
    ...FAMILY,
    residenceType: "owned",
    ownsHome: true,
    propertiesOwned: 1,
    vehiclesCount: 1,
    rentsOutProperty: false,
    valuablesValue: 0,
    answeredFields: [...FAMILY.answeredFields, "residenceType", "ownsHome", "propertiesOwned", "vehiclesCount", "rentsOutProperty", "valuablesValue"],
}

describe("ordering", () => {
    const needs: AttentionNeeds = { riskConcerns: ["vehicle"], recentChangeAreas: ["lifestyle"] }

    it("activated first (importance, concern, recent change), then importance, then the authored order — and stable", () => {
        const a = build({ profile: MANY, needs })
        const b = build({ profile: MANY, needs })
        expect(a).toEqual(b)
        expect(a.map((v) => v.area)).toEqual(["mobility", "household", "income", "residence", "lifestyle", "health", "debt", "work", "retirement", "property"])
        expect(a.map((v) => [v.area, v.importance, v.activated])).toEqual([
            ["mobility", "high", true],
            ["household", "medium", true],
            ["income", "medium", true],
            ["residence", "medium", true],
            ["lifestyle", "watch", true], // a recent change touched it
            ["health", "watch", false],
            ["debt", "watch", false],
            ["work", "watch", false],
            ["retirement", "watch", false],
            ["property", "watch", false],
        ])
        // The tail is the authored order.
        const tail = a.filter((v) => !v.activated).map((v) => v.area)
        expect(tail).toEqual(AREA_ORDER.filter((id) => tail.includes(id)))
    })

    it("«Δεν ξέρω τι ακριβώς καλύπτουν»: the unsettled areas come before the rest within the same importance", () => {
        const views = build({ profile: MANY, needs: { ...needs, uncertaintyReasons: ["dont_know_coverage"] } })
        expect(views.map((v) => [v.area, v.alignment])).toEqual([
            ["mobility", "review"],
            ["income", "unknown"],
            ["residence", "unknown"],
            ["household", "not_yet_checked"],
            ["lifestyle", "unknown"],
            ["health", "unknown"],
            ["debt", "unknown"],
            ["work", "unknown"],
            ["retirement", "unknown"],
            ["property", "not_yet_checked"],
        ])
    })
})

describe("density and language", () => {
    it.each([
        ["explain_everything", "expanded"],
        ["just_what_matters", "collapsed"],
        ["show_what_matters", "collapsed"],
        ["on_my_own", "minimal"],
        [null, "collapsed"],
    ] as const)("guidance %s → %s on every area", (preference, density) => {
        const views = build({ profile: FAMILY, needs: { guidancePreference: preference } })
        expect(new Set(views.map((v) => v.explanation.density))).toEqual(new Set([density]))
    })

    it("speaks the requested language", () => {
        const h = area(build({ profile: FAMILY_FULL, priorities: [HOUSEHOLD_HIGH], language: "en" }), "household")
        // The registry's own label (EVENT_DOMAIN_LABELS.household), by reference.
        expect(h.label).toBe("Family")
        expect(h.explanation.why).toBe("2 people depend on your income, and you are currently working.")
        expect(h.exposure.risks[0].name).not.toMatch(/[Ͱ-Ͽ]/)
        expect(area(build({ profile: FAMILY_FULL }), "household").label).toBe("Οικογένεια")
    })
})

describe("attentionSummary", () => {
    it("counts words, nothing else", () => {
        const views = build({ profile: MANY, needs: { riskConcerns: ["vehicle"] }, policies: [lifePolicy({ gaps: [RULE_GAP] })] })
        const s = attentionSummary(views)
        expect(s.areaCount).toBe(10)
        expect(s.activatedCount).toBe(views.filter((v) => v.activated).length)
        expect(s.gapCount).toBe(1)
        expect(s.coveredCount).toBe(0)
        expect(s.unknownCount).toBe(views.filter((v) => v.alignment === "unknown").length)
        expect(Object.keys(s).sort()).toEqual(["activatedCount", "areaCount", "coveredCount", "gapCount", "unknownCount"])
    })
})

// ─── Source guards ──────────────────────────────────────────────────────────

function stripComments(src: string): string {
    return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1")
}

function walk(dir: string, out: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
        const path = join(dir, entry)
        if (statSync(path).isDirectory()) {
            if (entry === "node_modules" || entry === ".next" || entry.startsWith(".")) continue
            walk(path, out)
        } else if (/\.(ts|tsx)$/.test(entry) && !/\.d\.ts$/.test(entry)) {
            out.push(path)
        }
    }
    return out
}

const MODULES = ["lib/protection/attention-areas.ts", "lib/protection/coverage-model.ts"]

describe("no score, no percentage — by construction", () => {
    it("the modules never name one", () => {
        for (const file of MODULES) {
            const src = stripComments(readFileSync(file, "utf-8"))
            expect(src, file).not.toMatch(/\b(score|scores|percent|percentage|pct)\b/i)
        }
    })

    it("the output carries no such field, at any depth", () => {
        const seen: string[] = []
        const visit = (node: unknown): void => {
            if (!node || typeof node !== "object") return
            for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
                if (/score|percent|pct/i.test(k)) seen.push(k)
                visit(v)
            }
        }
        visit(build({ profile: MANY, policies: [lifePolicy()] }))
        visit(attentionSummary(build({ profile: MANY })))
        expect(seen).toEqual([])
    })
})

/**
 * A production of an alignment word: written to an `alignment:` field,
 * assigned, or compared. Comparisons are included on purpose — a surface that
 * compares to a sixth word is a surface expecting one to exist.
 */
const ALIGNMENT_PRODUCTION = /\balignment\s*(?::|={1,3}|!==?)\s*["']([a-z_]+)["']/g

export function foreignAlignmentWords(src: string): string[] {
    const vocabulary = new Set<string>(ALIGNMENTS)
    const out: string[] = []
    for (const m of stripComments(src).matchAll(ALIGNMENT_PRODUCTION)) if (!vocabulary.has(m[1])) out.push(m[1])
    return out
}

describe("the alignment vocabulary is closed", () => {
    it("is §C's five words, in the module and in both dictionaries", () => {
        expect([...ALIGNMENTS]).toEqual(["unknown", "not_yet_checked", "appears_covered", "review", "gap"])
        expect(Object.keys((el.protection as Record<string, any>).attention.alignment)).toEqual([...ALIGNMENTS])
    })

    it("every area speaks it", () => {
        for (const v of build({ profile: MANY, policies: [lifePolicy({ gaps: [RULE_GAP] })] })) expect(ALIGNMENTS).toContain(v.alignment)
    })

    it("no file under lib/, components/ or app/ produces a sixth word", () => {
        const files = [...walk("lib"), ...walk("components"), ...walk("app")]
        expect(files.length).toBeGreaterThan(200)
        expect(files).toContain("lib/protection/attention-areas.ts")
        const offenders = files
            .map((file) => ({ file, words: foreignAlignmentWords(readFileSync(file, "utf-8")) }))
            .filter(({ words }) => words.length > 0)
            .map(({ file, words }) => `${file}: ${words.join(", ")}`)
        expect(offenders).toEqual([])
    })

    it("is proven against committed probes", () => {
        const probe = (name: string) => readFileSync(`tests/fixtures/guard-probes/${name}`, "utf-8")
        const red = foreignAlignmentWords(probe("attention-alignment-foreign-word.ts.txt"))
        expect(red).toContain("uncovered")
        expect(red).toContain("unprotected")
        const green = probe("attention-alignment-compliant.ts.txt")
        // The compliant probe genuinely carries the near-miss shapes.
        expect(green).toMatch(/alignmentCta:\s*"uncovered"/)
        expect(green).toMatch(/\/\/ alignment:\s*"unprotected"/)
        expect(foreignAlignmentWords(green)).toEqual([])
    })
})
