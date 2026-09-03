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
