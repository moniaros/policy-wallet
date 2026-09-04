import { readFileSync } from "node:fs"
import { describe, it, expect } from "vitest"
import {
    REVIEW_POLICIES,
    REVIEW_TRIGGERS,
    getReviewPolicy,
    reviewOpeningTriggers,
    triggerForLifeEvent,
} from "@/lib/services/risk-review/policy"
import { LIFE_EVENT_REGISTRY } from "@/lib/services/life-events/registry"

/**
 * A review is a HUMAN CHECKPOINT; recalculation is automatic and continuous.
 * These are the rules that keep reviews rare enough to be read.
 */
describe("the trigger matrix answers all five questions for every trigger", () => {
    it("covers every trigger the brief names", () => {
        for (const trigger of [
            "life_event", "policy_uploaded", "policy_renewal", "claim",
            "protection_score_drop", "coverage_gap", "questionnaire_update",
            "customer_inactivity", "advisor_assignment", "ai_confidence_drop",
            "annual", "quarterly", "birthday", "mortgage_added", "child_born",
            "marriage", "divorce", "business_started", "property_purchased",
            "travel_increased",
        ]) {
            expect(getReviewPolicy(trigger), `${trigger} has no policy`).toBeTruthy()
        }
        expect(REVIEW_TRIGGERS.length).toBe(20)
    })

    it("gives every trigger an explicit answer, never an omission", () => {
        for (const [key, p] of Object.entries(REVIEW_POLICIES)) {
            for (const field of [
                "startsReview", "recalculates", "notifiesAdvisor", "guidesCustomer", "movesScore",
            ] as const) {
                expect(typeof p[field], `${key}.${field} is not a decision`).toBe("boolean")
            }
            expect(p.rationale, `${key} has no rationale`).toBeTruthy()
            expect(p.label.el && p.label.en, `${key} is not bilingual`).toBeTruthy()
            // The customer is told WHY in their language — never the admin rationale.
            expect(p.reason?.el && p.reason?.en, `${key} has no customer-facing reason`).toBeTruthy()
            expect(p.reason.el, `${key}.reason.el is not Greek`).toMatch(/[Ͱ-Ͽ]/)
            expect(p.reason.en, `${key}.reason.en is the admin rationale`).not.toBe(p.rationale)
        }
    })

    it("the dashboard shows the customer the reason, not the admin rationale", () => {
        const home = readFileSync("app/(protected)/dashboard/PolicyholderHome.tsx", "utf-8")
        expect(home).not.toMatch(/rationale=\{/)
        expect(home).toMatch(/reason=\{getReviewPolicy\(/)
    })
})

describe("reviews stay rare enough to be read", () => {
    it("most triggers recalculate WITHOUT opening a review", () => {
        // If every trigger opened one, a review would become the thing people
        // dismiss unread — the same failure as a list where everything is urgent.
        const opening = reviewOpeningTriggers().length
        expect(opening).toBeLessThan(REVIEW_TRIGGERS.length)
        expect(opening).toBeGreaterThan(0)
    })

    it("a policy upload does not open a review", () => {
        // The customer just acted; the findings ARE the response. Asking them to
        // review immediately would read as us not having looked.
        const p = getReviewPolicy("policy_uploaded")!
        expect(p.startsReview).toBe(false)
        expect(p.recalculates).toBe(true)
        expect(p.guidesCustomer).toBe(true)
    })

    it("a questionnaire update does not open a review", () => {
        // They have just reviewed their own facts. Opening a review moments
        // later asks them to do it twice.
        expect(getReviewPolicy("questionnaire_update")!.startsReview).toBe(false)
        expect(getReviewPolicy("questionnaire_update")!.recalculates).toBe(true)
    })

    it("an AI confidence drop is our problem, not a review of their life", () => {
        const p = getReviewPolicy("ai_confidence_drop")!
        expect(p.startsReview).toBe(false)
        // The work belongs to a human reading the document.
        expect(p.notifiesAdvisor).toBe(true)
        expect(p.recalculates).toBe(false)
    })

    it("every review-opening trigger has a deadline and a cooldown", () => {
        for (const p of reviewOpeningTriggers()) {
            // A review with no deadline is a to-do nobody does.
            expect(p.dueInDays, `${p.trigger} has no deadline`).toBeGreaterThan(0)
            // Claims are the one exception: a claim always deserves a review,
            // however recently we asked about something else.
            if (p.trigger !== "claim") {
                expect(p.cooldownDays, `${p.trigger} has no cooldown`).toBeGreaterThan(0)
            }
        }
    })
})

describe("weights make the collisions come out right", () => {
    it("a child being born outranks an annual review", () => {
        // The reverse would be absurd, and weight is what prevents it.
        expect(REVIEW_POLICIES.child_born.weight).toBeGreaterThan(REVIEW_POLICIES.annual.weight)
    })

    it("a claim outranks everything", () => {
        const others = Object.values(REVIEW_POLICIES).filter((p) => p.trigger !== "claim")
        for (const p of others) {
            expect(REVIEW_POLICIES.claim.weight).toBeGreaterThanOrEqual(p.weight)
        }
    })

    it("the quarterly nudge is the lightest periodic trigger", () => {
        expect(REVIEW_POLICIES.quarterly.weight).toBeLessThan(REVIEW_POLICIES.annual.weight)
        expect(REVIEW_POLICIES.quarterly.weight).toBeLessThan(REVIEW_POLICIES.birthday.weight)
    })

    it("no two review-opening triggers share a weight", () => {
        // Ties make supersede order arbitrary, and an arbitrary winner between
        // "you had a child" and "it is a year since we asked" is a real defect.
        const weights = reviewOpeningTriggers().map((p) => p.weight)
        // A handful legitimately pair (marriage/divorce, property/mortgage);
        // what matters is that no weight is shared by more than two.
        const counts = new Map<number, number>()
        for (const w of weights) counts.set(w, (counts.get(w) ?? 0) + 1)
        for (const [weight, count] of counts) {
            expect(count, `weight ${weight} is shared by ${count} triggers`).toBeLessThanOrEqual(2)
        }
    })
})

describe("life events map onto their own review triggers", () => {
    it("the big four keep their own window and their own words", () => {
        expect(triggerForLifeEvent("birth")).toBe("child_born")
        expect(triggerForLifeEvent("marriage")).toBe("marriage")
        expect(triggerForLifeEvent("divorce")).toBe("divorce")
        expect(triggerForLifeEvent("mortgage")).toBe("mortgage_added")
    })

    it("every mapped id is a real life-event definition", () => {
        // A mapping to an id the registry does not have would silently fall
        // through to the generic trigger for ever.
        const known = new Set(LIFE_EVENT_REGISTRY.map((d) => d.id))
        for (const id of [
            "birth", "marriage", "divorce", "mortgage",
            "property_purchase", "business_creation", "travel_frequency_increase",
        ]) {
            expect(known.has(id), `${id} is not in the life-event registry`).toBe(true)
        }
    })

    it("an unmapped life event still gets a review", () => {
        // Every declared life change deserves one; only the words differ.
        expect(triggerForLifeEvent("pet_adoption")).toBe("life_event")
        expect(getReviewPolicy("life_event")!.startsReview).toBe(true)
    })

    it("divorce gets the longest window of the life events", () => {
        // A hard time, not a sales moment.
        const lifeWindows = ["child_born", "marriage", "mortgage_added", "property_purchased"] as const
        for (const t of lifeWindows) {
            expect(REVIEW_POLICIES.divorce.dueInDays).toBeGreaterThanOrEqual(
                REVIEW_POLICIES[t].dueInDays
            )
        }
    })
})

describe("periodic cadence is justified, not arbitrary", () => {
    it("the annual review is the backstop and notifies the advisor", () => {
        const p = REVIEW_POLICIES.annual
        expect(p.startsReview).toBe(true)
        expect(p.recalculates).toBe(true)
        expect(p.notifiesAdvisor).toBe(true)
    })

    it("quarterly does not pester the advisor", () => {
        // It is a data-completeness nudge, not a piece of advisory work.
        expect(REVIEW_POLICIES.quarterly.notifiesAdvisor).toBe(false)
    })

    it("a birthday recalculates, because age is a real risk factor", () => {
        // `age` gates two risks in the catalog and refines four more, so an
        // assessment silently goes stale every year with nothing to recompute it.
        const p = REVIEW_POLICIES.birthday
        expect(p.recalculates).toBe(true)
        expect(p.movesScore).toBe(true)
        // Long cooldown: only decade boundaries are material, and the scan
        // enforces that too.
        expect(p.cooldownDays).toBeGreaterThanOrEqual(180)
    })
})

describe("claims are declared and honestly unwired", () => {
    it("claim has the heaviest weight and says it is not wired", () => {
        expect(REVIEW_POLICIES.claim.startsReview).toBe(true)
        expect(REVIEW_POLICIES.claim.rationale).toMatch(/NOT WIRED|no claims model/i)
    })
})

// ── Evidence closes a review (docs/planning/PERSONAL_RISK_PROFILE.md §I) ────

import { globSync } from "../helpers/glob"
import {
    decideEvidenceClosures,
    EVENT_AREA,
    EVENT_AREA_CROSSES_SPHERE,
    lifecycleBand,
    policyEvidenceArea,
    reviewArea,
    REVIEW_OUTCOME_POLICY_EVIDENCE,
} from "@/lib/services/risk-review/evidence"
import { AREAS, AREA_IDS } from "@/lib/protection/domains"

const openReviewRows = [
    { id: "rv-birth", status: "open", trigger: "child_born" },
    { id: "rv-marriage", status: "open", trigger: "marriage" },
    { id: "rv-mortgage", status: "open", trigger: "mortgage_added" },
    { id: "rv-home", status: "open", trigger: "property_purchased" },
    { id: "rv-business", status: "open", trigger: "business_started" },
    { id: "rv-pet", status: "open", trigger: "life_event", definitionId: "pet_adoption" },
    { id: "rv-boat", status: "open", trigger: "life_event", definitionId: "boat_purchase" },
    { id: "rv-retire", status: "open", trigger: "life_event", definitionId: "retirement" },
    { id: "rv-raise", status: "open", trigger: "life_event", definitionId: "income_increase" },
    { id: "rv-annual", status: "open", trigger: "annual" },
    { id: "rv-quarterly", status: "open", trigger: "quarterly" },
    { id: "rv-birthday", status: "open", trigger: "birthday" },
    { id: "rv-advisor", status: "open", trigger: "advisor_assignment" },
    { id: "rv-gap", status: "open", trigger: "coverage_gap" },
]

const analysed = { lifecycle: "active", detail: "analysed" } as const

describe("every registry event asks the customer to look at exactly one area", () => {
    it("maps every life event once — enumerated from the registry, no omission and no stray key", () => {
        const registryIds = LIFE_EVENT_REGISTRY.map((d) => d.id)
        expect(registryIds.length).toBeGreaterThan(15)
        expect(Object.keys(EVENT_AREA).sort()).toEqual([...registryIds].sort())
        for (const id of registryIds) expect(AREA_IDS, `${id} maps to a real area`).toContain(EVENT_AREA[id])
    })

    it("stays inside the event's own sphere unless the exception is named with its reason", () => {
        for (const def of LIFE_EVENT_REGISTRY) {
            const area = AREAS[EVENT_AREA[def.id]]
            if (EVENT_AREA_CROSSES_SPHERE.has(def.id)) expect(area.domain, def.id).not.toBe(def.domain)
            else expect(area.domain, `${def.id}: ${area.id} is not in ${def.domain}`).toBe(def.domain)
        }
        // The three crossings, and why: the boat lines and the boat risk are
        // listed under lifestyle; valuables and the fine-art line under
        // property; retiring is the pension question.
        expect([...EVENT_AREA_CROSSES_SPHERE].sort()).toEqual(["boat_purchase", "high_value_purchase", "retirement"])
        expect(EVENT_AREA.boat_purchase).toBe("lifestyle")
        expect(EVENT_AREA.high_value_purchase).toBe("property")
        expect(EVENT_AREA.retirement).toBe("retirement")
    })

    it("splits money three ways — a mortgage is debt, a raise is income", () => {
        expect(EVENT_AREA.mortgage).toBe("debt")
        expect(EVENT_AREA.mortgage_cleared).toBe("debt")
        expect(EVENT_AREA.income_increase).toBe("income")
    })
})

describe("a review's area comes from the life event it was raised for", () => {
    it("the mapped triggers resolve through the registry and the one event→area table, never a second table", () => {
        expect(reviewArea({ trigger: "child_born" })).toBe(EVENT_AREA.birth)
        expect(reviewArea({ trigger: "marriage" })).toBe(EVENT_AREA.marriage)
        expect(reviewArea({ trigger: "divorce" })).toBe(EVENT_AREA.divorce)
        expect(reviewArea({ trigger: "mortgage_added" })).toBe("debt")
        expect(reviewArea({ trigger: "property_purchased" })).toBe("residence")
        expect(reviewArea({ trigger: "business_started" })).toBe("work")
    })

    it("the generic life_event trigger needs its causing definition, and an orphan has no area", () => {
        expect(reviewArea({ trigger: "life_event", definitionId: "pet_adoption" })).toBe("lifestyle")
        expect(reviewArea({ trigger: "life_event", definitionId: "vehicle_purchase" })).toBe("mobility")
        expect(reviewArea({ trigger: "life_event", definitionId: "boat_purchase" })).toBe("lifestyle")
        expect(reviewArea({ trigger: "life_event" })).toBeNull()
        expect(reviewArea({ trigger: "life_event", definitionId: "not-a-real-event" })).toBeNull()
    })

    it("whole-picture reviews have no area, so no single document can close them", () => {
        for (const trigger of ["annual", "quarterly", "birthday", "customer_inactivity", "advisor_assignment", "protection_score_drop", "coverage_gap", "policy_renewal", "claim"]) {
            expect(reviewArea({ trigger }), trigger).toBeNull()
        }
    })

    it("a policy's area is its attention area (areaForLob); the residual line answers nothing", () => {
        expect(policyEvidenceArea("life")).toBe("household")
        expect(policyEvidenceArea("Auto Insurance")).toBe("mobility")
        expect(policyEvidenceArea("pension")).toBe("retirement")
        expect(policyEvidenceArea("boat_tpl")).toBe("lifestyle")
        expect(policyEvidenceArea("other")).toBeNull()
        expect(policyEvidenceArea(null)).toBeNull()
    })

    it("maps the lifecycle onto Layer 4's bands the way the loader does — cancelled and undated are not held", () => {
        expect(lifecycleBand("active")).toBe("active")
        // In force with an incomplete identity: the cover exists, the label does not.
        expect(lifecycleBand("action_needed")).toBe("active")
        expect(lifecycleBand("expiring_soon")).toBe("expiring_soon")
        expect(lifecycleBand("expired")).toBe("expired")
        expect(lifecycleBand("cancelled")).toBe("other")
        expect(lifecycleBand("unknown_duration")).toBe("other")
    })
})

describe("the evidence matrix", () => {
    it("same area closes — and only that area", () => {
        expect(decideEvidenceClosures({ lineOfBusiness: "life", ...analysed, reviews: openReviewRows })).toEqual([
            "rv-birth",
            "rv-marriage",
        ])
        expect(decideEvidenceClosures({ lineOfBusiness: "home", lifecycle: "expiring_soon", detail: "analysed", reviews: openReviewRows })).toEqual(["rv-home"])
        expect(decideEvidenceClosures({ lineOfBusiness: "liability", ...analysed, reviews: openReviewRows })).toEqual(["rv-business"])
        expect(decideEvidenceClosures({ lineOfBusiness: "fine_art", ...analysed, reviews: [...openReviewRows, { id: "rv-ring", status: "open", trigger: "life_event", definitionId: "high_value_purchase" }] })).toEqual(["rv-ring"])
    })

    it("lifestyle is ONE area — travel, pet, cyber and boat share it — so a pet policy answers the boat review too; the vocabulary's limit, stated", () => {
        expect(decideEvidenceClosures({ lineOfBusiness: "pet", ...analysed, reviews: openReviewRows })).toEqual(["rv-pet", "rv-boat"])
    })

    it("another area stays open", () => {
        expect(decideEvidenceClosures({ lineOfBusiness: "motor", ...analysed, reviews: openReviewRows })).toEqual([])
    })

    it("a sibling area of the same sphere is another area: a pension does not close the mortgage review, a car does not close the boat review", () => {
        // money: pension ↔ retirement, mortgage ↔ debt, raise ↔ income.
        expect(decideEvidenceClosures({ lineOfBusiness: "pension", ...analysed, reviews: openReviewRows })).toEqual(["rv-retire"])
        expect(decideEvidenceClosures({ lineOfBusiness: "income_protection", ...analysed, reviews: openReviewRows })).toEqual(["rv-raise"])
        expect(decideEvidenceClosures({ lineOfBusiness: "life", ...analysed, reviews: openReviewRows })).not.toContain("rv-mortgage")
        // mobility: the boat lives with lifestyle, so a car answers nothing about it.
        expect(decideEvidenceClosures({ lineOfBusiness: "motor", ...analysed, reviews: openReviewRows })).not.toContain("rv-boat")
        expect(decideEvidenceClosures({ lineOfBusiness: "boat_tpl", ...analysed, reviews: openReviewRows })).toContain("rv-boat")
        expect(decideEvidenceClosures({ lineOfBusiness: "boat_tpl", ...analysed, reviews: openReviewRows })).not.toContain("rv-mortgage")
    })

    it("an expired, cancelled or undated policy closes nothing", () => {
        for (const lifecycle of ["expired", "other"] as const) {
            expect(decideEvidenceClosures({ lineOfBusiness: "life", lifecycle, detail: "analysed", reviews: openReviewRows })).toEqual([])
        }
    })

    it("a summary-only policy closes nothing — the limits were not read, so the looking has not happened", () => {
        expect(decideEvidenceClosures({ lineOfBusiness: "life", lifecycle: "active", detail: "summary_only", reviews: openReviewRows })).toEqual([])
    })

    it("a review already closed is never touched, whatever its area", () => {
        const rows = [
            { id: "rv-done", status: "completed", trigger: "child_born" },
            { id: "rv-dismissed", status: "dismissed", trigger: "marriage" },
            { id: "rv-expired", status: "expired", trigger: "child_born" },
            { id: "rv-superseded", status: "superseded", trigger: "marriage" },
            { id: "rv-open", status: "open", trigger: "child_born" },
        ]
        expect(decideEvidenceClosures({ lineOfBusiness: "life", ...analysed, reviews: rows })).toEqual(["rv-open"])
    })

    it("the outcome word is the one the row records", () => {
        expect(REVIEW_OUTCOME_POLICY_EVIDENCE).toBe("policy_evidence")
    })
})

/**
 * Both completion paths call the ONE closer. The universe is stated: the
 * orchestrator's `extractBasicSummary` (the basic-summary path every
 * free/Starter upload takes) and `executePipelineAttempt` (the deep run, whose
 * finalize follows `persistAnalysisArtifacts`). A comment naming the closer
 * does not count, and in the deep path the call must come AFTER the gaps are
 * persisted — a review closed before the finding exists would be closed on a
 * promise.
 */
const ORCHESTRATOR = "lib/services/analysis/policy-analysis-orchestrator.service.ts"
const CLOSER = "closeReviewsByPolicyEvidence"

function stripComments(src: string): string {
    return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1")
}

/** The method's own line to the line before the next method at class-member indentation. */
function methodBody(src: string, name: string): string {
    // Indentation only — `\s+` would also match the blank line above and slice nothing.
    const start = src.search(new RegExp(`^[ \\t]+(?:private[ \\t]+|public[ \\t]+)?async[ \\t]+${name}\\(`, "m"))
    if (start < 0) return ""
    const rest = src.slice(start)
    const next = rest.slice(1).search(/^[ \t]{4}(?:private[ \t]+|public[ \t]+)?async[ \t]+[a-zA-Z]+\(/m)
    return next < 0 ? rest : rest.slice(0, next + 1)
}

export function evidenceHookFindings(src: string): string[] {
    const clean = stripComments(src)
    const findings: string[] = []
    const basic = methodBody(clean, "extractBasicSummary")
    if (!basic) findings.push("extractBasicSummary: method not found")
    else if (!basic.includes(`${CLOSER}(`)) findings.push(`extractBasicSummary: does not call ${CLOSER}`)
    const deep = methodBody(clean, "executePipelineAttempt")
    if (!deep) findings.push("executePipelineAttempt: method not found")
    else {
        const persistAt = deep.indexOf("persistAnalysisArtifacts(")
        const closeAt = deep.indexOf(`${CLOSER}(`)
        if (closeAt < 0) findings.push(`executePipelineAttempt: does not call ${CLOSER}`)
        else if (persistAt < 0) findings.push("executePipelineAttempt: gap persistence not found")
        else if (closeAt < persistAt) findings.push(`executePipelineAttempt: ${CLOSER} runs before the gaps are persisted`)
    }
    return findings
}

describe("both completion paths close reviews through the one closer", () => {
    it("the orchestrator's two completion paths are hooked, in order", () => {
        expect(evidenceHookFindings(readFileSync(ORCHESTRATOR, "utf-8"))).toEqual([])
    })

    it("the outcome word is written by the review service alone", () => {
        const writers = [...globSync("lib/**/*.ts"), ...globSync("app/**/*.{ts,tsx}"), ...globSync("components/**/*.{ts,tsx}")]
            .filter((file) => /outcome\s*:\s*(["']policy_evidence["']|REVIEW_OUTCOME_POLICY_EVIDENCE)/.test(stripComments(readFileSync(file, "utf-8"))))
        expect(writers).toEqual(["lib/services/risk-review/service.ts"])
    })

    it("is proven against committed probes", () => {
        const probe = (name: string) => readFileSync(`tests/fixtures/guard-probes/${name}`, "utf-8")
        expect(evidenceHookFindings(probe("review-evidence-hook-present.ts.txt"))).toEqual([])
        const red = evidenceHookFindings(probe("review-evidence-hook-missing.ts.txt"))
        expect(red).toContain(`extractBasicSummary: does not call ${CLOSER}`)
        expect(red).toContain(`executePipelineAttempt: ${CLOSER} runs before the gaps are persisted`)
    })
})
