import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { globSync } from "../helpers/glob"
import {
    ACTIONS,
    AGGREGATES,
    BUSINESS_EVENTS,
    getEventDefinition,
    liveEvents,
    permitsAction,
    type ActionType,
} from "@/lib/events/catalog"
import {
    DECISION_RULES,
    DEFAULT_DECISION_THRESHOLDS,
    decide,
    isStateAction,
    type DecisionThresholds,
    type EventContext,
} from "@/lib/events/decision-engine"

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")
const SOURCES = [...globSync("lib/**/*.ts"), ...globSync("app/**/*.ts"), ...globSync("app/**/*.tsx")]

function ctxFor(
    name: string,
    payload: Record<string, unknown> = {},
    isReplay = false,
    thresholds: DecisionThresholds = DEFAULT_DECISION_THRESHOLDS
): EventContext {
    const definition = getEventDefinition(name)!
    return {
        eventId: "evt-1",
        name,
        definition,
        occurredAt: new Date("2026-01-01T00:00:00Z"),
        aggregate: { type: definition.aggregate, id: "agg-1" },
        subjectUserId: "user-1",
        actor: { type: "system", id: null },
        payload,
        correlationId: "corr-1",
        isReplay,
        thresholds,
    }
}

/**
 * The rules that make "everything revolves around business events" true rather
 * than aspirational.
 */
describe("the catalog describes facts, not messages", () => {
    it("every event is named aggregate.verb_past", () => {
        for (const [key, def] of Object.entries(BUSINESS_EVENTS)) {
            expect(key, `${key} must be namespaced`).toMatch(/^[a-z_]+\.[a-z_]+$/)
            expect(key).toBe(def.name)
            const [aggregate] = key.split(".")
            expect(AGGREGATES, `${key} has an unknown aggregate`).toContain(aggregate)
        }
    })

    it("no event is named after a channel or a feature", () => {
        // `notification.sent` would be a platform event; `email.policy_expiring`
        // would be a message. Neither is a business fact, and letting one in is
        // how a catalog turns back into a list of notifications.
        for (const key of Object.keys(BUSINESS_EVENTS)) {
            expect(key).not.toMatch(/^(email|push|sms|notification|in_app)\./)
            expect(key).not.toMatch(/(sent|delivered|queued|read)$/)
        }
    })

    it("every event declares at least one permitted action", () => {
        for (const [key, def] of Object.entries(BUSINESS_EVENTS)) {
            expect(def.actions.length, `${key} can cause nothing`).toBeGreaterThan(0)
            for (const action of def.actions) {
                expect(ACTIONS, `${key} declares unknown action ${action}`).toContain(action)
            }
        }
    })

    it("a planned event says what blocks it", () => {
        for (const [key, def] of Object.entries(BUSINESS_EVENTS)) {
            if (def.status !== "planned") continue
            expect(def.note, `${key} is planned with no explanation`).toBeTruthy()
        }
    })

    it("claims are declared and honestly marked absent", () => {
        // The product has no claims model. Specifying the shape is right;
        // shipping an emitter for an unreachable state would not be.
        for (const key of ["claim.registered", "claim.status_changed", "claim.settled"]) {
            expect(BUSINESS_EVENTS[key]?.status, `${key} must stay planned`).toBe("planned")
        }
    })

    it("derived events are produced by subscribers, never by controllers", () => {
        // A controller publishing a conclusion means the conclusion is computed
        // in two places — the exact duplication this architecture removes.
        const derived = Object.values(BUSINESS_EVENTS).filter((d) => d.kind === "derived")
        expect(derived.length).toBeGreaterThan(0)
        for (const f of globSync("app/**/route.ts")) {
            const src = strip(readFileSync(f, "utf-8"))
            for (const d of derived) {
                expect(src, `${f} publishes the derived event ${d.name}`).not.toContain(`"${d.name}"`)
            }
        }
    })
})

describe("the decision engine bounds what an event can cause", () => {
    it("every rule targets a declared event", () => {
        for (const name of Object.keys(DECISION_RULES)) {
            expect(getEventDefinition(name), `rule for undeclared event ${name}`).toBeTruthy()
        }
    })

    it("no rule plans an action its event does not declare", () => {
        // Checked here as well as at runtime: a rule that plans an undeclared
        // action would otherwise only be caught in production, once.
        for (const [name, rule] of Object.entries(DECISION_RULES)) {
            const planned = rule(ctxFor(name, { severity: "critical", daysUntilExpiry: 5, attemptCount: 3, delta: -20, currentScore: 30, advisorUserId: "a1" }))
            for (const action of planned) {
                expect(
                    permitsAction(name, action.type),
                    `${name} plans ${action.type}, which its catalog entry does not declare`
                ).toBe(true)
            }
        }
    })

    it("every planned action carries a reason", () => {
        for (const [name, rule] of Object.entries(DECISION_RULES)) {
            for (const action of rule(ctxFor(name, { severity: "critical", attemptCount: 1 }))) {
                expect(action.reason, `${name}/${action.type} has no reason`).toBeTruthy()
            }
        }
    })

    it("an event with no rule is recorded, not lost", () => {
        // Most facts are worth knowing and not worth acting on.
        const decision = decide(ctxFor("policy.shared"))
        expect(decision.actions.some((a) => a.type === "audit_log")).toBe(true)
    })
})

describe("a replay never reaches a customer", () => {
    it("refuses customer-facing actions and states why", () => {
        // Backfilling a subscriber must not email two years of notifications.
        const decision = decide(ctxFor("policy.lapsed", { lineOfBusiness: "motor" }, true))
        for (const action of decision.actions) {
            expect(isStateAction(action.type), `${action.type} reached a customer on a replay`).toBe(true)
        }
        expect(decision.skipped.length).toBeGreaterThan(0)
        for (const skip of decision.skipped) expect(skip.reason).toBe("replay")
    })

    it("still performs state actions, because repeating them is harmless", () => {
        // Recomputing a score twice costs a query; emailing about it twice costs
        // the customer's trust.
        const decision = decide(ctxFor("policy.lapsed", { lineOfBusiness: "motor" }, true))
        expect(decision.actions.map((a) => a.type)).toContain("risk_recalculation")
    })
})

describe("decisions that matter, asserted directly", () => {
    it("a lapsed motorbike is as urgent as a lapsed car", () => {
        // Motor cover is compulsory in Greece. Comparing to the literal "motor"
        // would have missed a motorbike, which is the defect the branch-family
        // guard exists to catch.
        for (const lob of ["motor", "motorbike"]) {
            const task = decide(ctxFor("policy.lapsed", { lineOfBusiness: lob })).actions.find(
                (a) => a.type === "advisor_notification"
            )
            expect(task?.params?.priority, `${lob} should be high priority`).toBe("high")
        }
    })

    it("a critical coverage gap creates advisory work; a low one does not", () => {
        // The largest missing automation the audit found: userTask.create had
        // two call sites and neither was a coverage gap.
        const critical = decide(ctxFor("coverage_gap.opened", { severity: "critical" }))
        expect(critical.actions.some((a) => a.type === "advisor_notification")).toBe(true)

        const low = decide(ctxFor("coverage_gap.opened", { severity: "low" }))
        expect(low.actions.some((a) => a.type === "advisor_notification")).toBe(false)
        // …but the customer is still told.
        expect(low.actions.some((a) => a.type === "in_app")).toBe(true)
    })

    it("a renewal 90 days out notifies but raises no task", () => {
        // A task raised three months early sits and rots.
        const far = decide(ctxFor("policy.renewal_approaching", { daysUntilExpiry: 90 }))
        expect(far.actions.some((a) => a.type === "advisor_notification")).toBe(false)
        const near = decide(ctxFor("policy.renewal_approaching", { daysUntilExpiry: 20 }))
        expect(near.actions.some((a) => a.type === "advisor_notification")).toBe(true)
    })

    it("payment failure schedules a dunning ladder and escalates at the third", () => {
        const first = decide(ctxFor("payment.failed", { attemptCount: 1 }))
        expect(first.actions.some((a) => a.type === "scheduled_review")).toBe(true)
        expect(first.actions.some((a) => a.type === "admin_notification")).toBe(false)

        const third = decide(ctxFor("payment.failed", { attemptCount: 3 }))
        expect(third.actions.some((a) => a.type === "admin_notification")).toBe(true)
    })

    it("a customer is not notified about something they did themselves", () => {
        // Telling people what they did ten seconds ago is noise, and noise is
        // what makes the useful notifications ignored.
        const byOwner = decide(ctxFor("policy.coverage_changed", { actorIsOwner: true }))
        expect(byOwner.actions.some((a) => a.type === "in_app")).toBe(false)

        const byAdvisor = decide(ctxFor("policy.coverage_changed", { actorIsOwner: false }))
        expect(byAdvisor.actions.some((a) => a.type === "in_app")).toBe(true)
    })

    it("a life event confirms receipt but does not claim a finding", () => {
        // "We recorded this" and "this changed your exposure" are different
        // claims; the consequence is a separate derived event.
        const decision = decide(ctxFor("life_event.declared"))
        const notify = decision.actions.find((a) => a.type === "in_app")
        expect(notify?.params?.notificationEvent).toBe("life_event_recorded")
        expect(decision.actions.some((a) => a.type === "risk_recalculation")).toBe(true)
    })
})

describe("publishing", () => {
    it("every live event has a publisher", () => {
        const published = new Set<string>()
        for (const f of SOURCES) {
            const src = strip(readFileSync(f, "utf-8"))
            for (const m of src.matchAll(/name:\s*"([a-z_]+\.[a-z_]+)"/g)) published.add(m[1])
        }
        const orphans = liveEvents()
            .map((d) => d.name)
            .filter((name) => !published.has(name))
        // A `live` event nothing publishes is the failure mode the catalog
        // exists to surface.
        expect(orphans, `declared live but never published:\n${orphans.join("\n")}`).toEqual([])
    })

    it("no planned event is published", () => {
        const planned = Object.values(BUSINESS_EVENTS).filter((d) => d.status === "planned")
        for (const f of SOURCES) {
            if (f.startsWith("lib/events/")) continue
            const src = strip(readFileSync(f, "utf-8"))
            for (const d of planned) {
                expect(src, `${f} publishes the planned event ${d.name}`).not.toContain(`name: "${d.name}"`)
            }
        }
    })

    it("the outbox is written through publish(), never by hand", () => {
        // A direct businessEvent.create bypasses the catalog check, the
        // idempotency key and the sequence — i.e. everything that makes the log
        // trustworthy.
        const offenders: string[] = []
        for (const f of SOURCES) {
            if (f.startsWith("lib/events/")) continue
            const src = strip(readFileSync(f, "utf-8"))
            if (/\bbusinessEvent\s*\.\s*create\b/.test(src)) offenders.push(f)
        }
        expect(offenders, `publish() instead:\n${offenders.join("\n")}`).toEqual([])
    })
})

describe("the action vocabulary is closed", () => {
    it("declares exactly the twelve supported actions", () => {
        expect([...ACTIONS].sort()).toEqual(
            [
                "advisor_notification",
                "admin_notification",
                "ai_recommendation",
                "analytics",
                "audit_log",
                "coverage_gap_update",
                "email",
                "in_app",
                "protection_score_update",
                "push",
                "risk_recalculation",
                "scheduled_review",
            ].sort()
        )
    })

    it("classifies every action as customer-facing or state-shaped", () => {
        // The replay rule depends on this split being total.
        for (const action of ACTIONS) {
            expect(typeof isStateAction(action as ActionType)).toBe("boolean")
        }
    })
})

/**
 * Operator-tunable boundaries.
 *
 * These numbers were literals inside the rules, so moving where "the lowest
 * band" starts — a judgement about customers, not about code — took a deploy.
 * What matters is that they are genuinely consulted (a setting nothing reads is
 * worse than no setting) and that the DEFAULTS reproduce the old literals
 * exactly, so an empty or unreadable settings table decides what it always did.
 */
describe("decision thresholds", () => {
    const scoreDrop = (current: number, thresholds = DEFAULT_DECISION_THRESHOLDS) =>
        decide(
            ctxFor("protection_score.changed", { delta: -12, currentScore: current }, false, thresholds)
        )

    const raisesAdvisorTask = (d: ReturnType<typeof decide>) =>
        d.actions.some((a) => a.type === "advisor_notification")

    it("defaults reproduce the literals they replaced", () => {
        expect(DEFAULT_DECISION_THRESHOLDS.protectionScoreLowBand).toBe(40)
        expect(DEFAULT_DECISION_THRESHOLDS.advisorTaskOnHighGaps).toBe(false)
    })

    it("a fall into the low band raises an advisor task, above it does not", () => {
        expect(raisesAdvisorTask(scoreDrop(35))).toBe(true)
        expect(raisesAdvisorTask(scoreDrop(45))).toBe(false)
    })

    it("moving the band moves the outcome — the setting is actually read", () => {
        const higher = { ...DEFAULT_DECISION_THRESHOLDS, protectionScoreLowBand: 60 }
        // 45 was drift at the shipped band; at 60 it is the lowest band.
        expect(raisesAdvisorTask(scoreDrop(45))).toBe(false)
        expect(raisesAdvisorTask(scoreDrop(45, higher))).toBe(true)
    })

    it("critical gaps always reach a human, whatever the setting says", () => {
        // The floor is deliberately not tunable: an operator quietly switching
        // off the response to a critical exposure is a defect, not a setting.
        for (const advisorTaskOnHighGaps of [true, false]) {
            const decision = decide(
                ctxFor("coverage_gap.opened", { severity: "critical" }, false, {
                    ...DEFAULT_DECISION_THRESHOLDS,
                    advisorTaskOnHighGaps,
                })
            )
            expect(raisesAdvisorTask(decision)).toBe(true)
        }
    })

    it("high-severity gaps reach a human only when the operator asks", () => {
        const high = (advisorTaskOnHighGaps: boolean) =>
            decide(
                ctxFor("coverage_gap.opened", { severity: "high" }, false, {
                    ...DEFAULT_DECISION_THRESHOLDS,
                    advisorTaskOnHighGaps,
                })
            )
        expect(raisesAdvisorTask(high(false))).toBe(false)
        expect(raisesAdvisorTask(high(true))).toBe(true)
    })

    it("a lower-severity gap is still notified, never escalated", () => {
        const decision = decide(
            ctxFor("coverage_gap.opened", { severity: "medium" }, false, {
                ...DEFAULT_DECISION_THRESHOLDS,
                advisorTaskOnHighGaps: true,
            })
        )
        expect(raisesAdvisorTask(decision)).toBe(false)
        expect(decision.actions.some((a) => a.type === "in_app")).toBe(true)
    })
})
