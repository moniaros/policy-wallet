import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { globSync } from "../helpers/glob"
import {
    NOTIFICATION_EVENTS,
    deliverableEvents,
    isSuppressible,
    retryDelayMinutes,
    type NotificationEventDefinition,
} from "@/lib/notifications/registry"
import { IMPLEMENTED_CHANNELS } from "@/lib/notifications/channels"

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")

const SOURCES = [...globSync("lib/**/*.ts"), ...globSync("app/**/*.ts"), ...globSync("app/**/*.tsx")]

/**
 * The rules that make the notification architecture true rather than merely
 * intended. Each one below is a defect this codebase actually shipped.
 */
describe("one bus: nothing writes a notification behind the dispatcher's back", () => {
    it("no notificationEvent.create outside lib/notifications/", () => {
        const offenders: string[] = []
        for (const f of SOURCES) {
            if (f.startsWith("lib/notifications/")) continue
            const src = strip(readFileSync(f, "utf-8"))
            if (/\bnotificationEvent\s*\.\s*create\b/.test(src)) offenders.push(f)
        }
        // There were ~20 of these. Each hardcoded `channel: 'in_app'` at the call
        // site, skipped the user's preferences entirely, and could never reach a
        // second channel — per-channel business logic copied across the codebase.
        expect(
            offenders,
            `write notifications through emit() instead:\n${offenders.join("\n")}`
        ).toEqual([])
    })

    it("every event a sender emits is declared in the registry", () => {
        const undeclared = new Set<string>()
        for (const f of SOURCES) {
            const src = strip(readFileSync(f, "utf-8"))
            for (const m of src.matchAll(/\b(?:emit|orchestrate)\(\{\s*event:\s*["']([A-Za-z0-9_]+)["']/g)) {
                if (!(m[1] in NOTIFICATION_EVENTS)) undeclared.add(m[1])
            }
        }
        expect(
            [...undeclared],
            `emitted but not declared in lib/notifications/registry.ts:\n${[...undeclared].join("\n")}`
        ).toEqual([])
    })

    it("every live event has an emitter, and planned events have none", () => {
        const emitted = new Set<string>()
        for (const f of SOURCES) {
            const src = strip(readFileSync(f, "utf-8"))
            // `emit` and `orchestrate` are both sanctioned entry points — the
            // orchestrator resolves recipients and applies quiet hours, then
            // calls emit. A guard that knew only about emit would report every
            // orchestrated event as an orphan.
            for (const m of src.matchAll(/\b(?:emit|orchestrate)\(\{\s*event:\s*["']([A-Za-z0-9_]+)["']/g)) {
                emitted.add(m[1])
            }
            // The compatibility shims still route eventType through the bus.
            for (const m of src.matchAll(/eventType:\s*["']([A-Za-z0-9_]+)["']/g)) {
                emitted.add(m[1])
            }
        }

        // An escalation TARGET is emitted by the retry sweep, which reads
        // `rule.event` off the registry rather than naming the event in source.
        // Derived rather than flagged: the wiring genuinely exists, and a
        // rule pointing at it is the proof.
        const escalationTargets = new Set(
            Object.values(NOTIFICATION_EVENTS)
                .map((d) => d.escalation?.event)
                .filter(Boolean) as string[]
        )

        const liveWithoutEmitter = Object.entries(NOTIFICATION_EVENTS)
            .filter(
                ([key, d]) =>
                    d.status === "live" &&
                    !emitted.has(key) &&
                    !d.emittedDynamically &&
                    !escalationTargets.has(key)
            )
            .map(([key]) => key)

        // A `live` event nothing emits is the failure mode this registry exists
        // to surface: eleven of the brief's required triggers were simply
        // missing, and nothing anywhere said so.
        expect(
            liveWithoutEmitter,
            `declared live but never emitted:\n${liveWithoutEmitter.join("\n")}`
        ).toEqual([])
    })

    it("a dynamically-named emitter still names the module it lives in", () => {
        // The escape hatch for `conv_${type}`-style names must not become a way
        // to declare an event live with nothing behind it at all.
        for (const [key, def] of Object.entries(NOTIFICATION_EVENTS)) {
            if (!def.emittedDynamically) continue
            expect(def.emittedBy, `${key} claims a dynamic emitter but names no module`).toBeTruthy()
        }
    })

    it("planned events are declared with a note explaining what blocks them", () => {
        for (const [key, def] of Object.entries(NOTIFICATION_EVENTS)) {
            if (def.status !== "planned") continue
            expect(def.note, `${key} is planned with no explanation`).toBeTruthy()
        }
    })
})

describe("every event carries a complete rule", () => {
    const REQUIRED: (keyof NotificationEventDefinition)[] = [
        "businessEvent",
        "triggerCondition",
        "category",
        "priority",
        "channels",
        "recipients",
        "transactional",
        "retry",
        "audit",
        "status",
    ]

    it("declares all ten required fields", () => {
        for (const [key, def] of Object.entries(NOTIFICATION_EVENTS)) {
            for (const field of REQUIRED) {
                expect(def[field], `${key} is missing ${String(field)}`).not.toBeUndefined()
            }
            // Nullable but must be stated, never merely absent.
            expect(def, `${key} must state requiredAction (null is an answer)`).toHaveProperty("requiredAction")
            expect(def, `${key} must state escalation (null is an answer)`).toHaveProperty("escalation")
            expect(def, `${key} must state expiresAfterHours (null is an answer)`).toHaveProperty("expiresAfterHours")
        }
    })

    it("names at least one recipient and one channel", () => {
        for (const [key, def] of Object.entries(NOTIFICATION_EVENTS)) {
            expect(def.recipients.length, `${key} reaches nobody`).toBeGreaterThan(0)
            expect(def.channels.length, `${key} has no channel`).toBeGreaterThan(0)
        }
    })

    it("only uses channels that exist", () => {
        const known = new Set([...IMPLEMENTED_CHANNELS, "sms", "whatsapp", "webhook", "analytics"])
        for (const [key, def] of Object.entries(NOTIFICATION_EVENTS)) {
            for (const channel of def.channels) {
                expect(known.has(channel), `${key} declares unknown channel ${channel}`).toBe(true)
            }
        }
    })

    it("escalates only to events that exist", () => {
        for (const [key, def] of Object.entries(NOTIFICATION_EVENTS)) {
            if (!def.escalation) continue
            expect(
                NOTIFICATION_EVENTS[def.escalation.event],
                `${key} escalates to undeclared event ${def.escalation.event}`
            ).toBeTruthy()
        }
    })

    it("gives every escalation a threshold to cross", () => {
        for (const [key, def] of Object.entries(NOTIFICATION_EVENTS)) {
            if (!def.escalation) continue
            const hasThreshold =
                typeof def.escalation.afterFailures === "number" ||
                typeof def.escalation.afterUnreadHours === "number"
            expect(hasThreshold, `${key} escalates but names no threshold`).toBe(true)
        }
    })

    it("only escalates unread thresholds on events the user can actually read", () => {
        for (const [key, def] of Object.entries(NOTIFICATION_EVENTS)) {
            if (typeof def.escalation?.afterUnreadHours !== "number") continue
            // Read state exists on in-app rows only. An "unread for 3 days"
            // rule on an email-only event would never fire.
            expect(def.channels, `${key} escalates on unread but never goes in-app`).toContain("in_app")
        }
    })
})

describe("the settings screen can only offer switches the dispatcher honours", () => {
    it("transactional and analytics events are not suppressible", () => {
        for (const [key, def] of Object.entries(NOTIFICATION_EVENTS)) {
            if (def.transactional || def.category === "analytics") {
                expect(isSuppressible(key), `${key} must not be switchable off`).toBe(false)
            }
        }
    })

    it("security and billing events are always transactional", () => {
        for (const [key, def] of Object.entries(NOTIFICATION_EVENTS)) {
            if (def.category === "security" || def.category === "billing") {
                // Nobody consents away from being told their card failed or
                // their password changed.
                expect(def.transactional, `${key} must be transactional`).toBe(true)
            }
        }
    })

    it("critical events reach more than one channel", () => {
        for (const [key, def] of deliverableEvents()) {
            if (def.priority !== "critical") continue
            const reach = def.channels.filter((c) => c !== "analytics")
            expect(reach.length, `${key} is critical but has one way through`).toBeGreaterThan(1)
        }
    })
})

describe("retry and expiry are coherent", () => {
    it("backs off increasingly, and never instantly", () => {
        for (const [key, def] of Object.entries(NOTIFICATION_EVENTS)) {
            if (def.retry.attempts <= 1) continue
            const first = retryDelayMinutes(def.retry, 1)
            const second = retryDelayMinutes(def.retry, 2)
            expect(first, `${key} retries immediately`).toBeGreaterThan(0)
            expect(second, `${key} does not back off`).toBeGreaterThanOrEqual(first)
        }
    })

    it("never keeps retrying past the point the message expires", () => {
        for (const [key, def] of Object.entries(NOTIFICATION_EVENTS)) {
            if (def.expiresAfterHours === null || def.retry.attempts <= 1) continue
            let total = 0
            for (let attempt = 1; attempt < def.retry.attempts; attempt++) {
                total += retryDelayMinutes(def.retry, attempt)
            }
            // A renewal reminder that arrives after the renewal has passed is
            // worse than one that never came, so the retry schedule must fit
            // inside the window in which the message is still true.
            expect(
                total / 60,
                `${key} could still be retrying ${Math.round(total / 60)}h after it expires at ${def.expiresAfterHours}h`
            ).toBeLessThanOrEqual(def.expiresAfterHours)
        }
    })
})

describe("risk notifications cannot be lost or skipped", () => {
    const ENGINE = strip(readFileSync("lib/services/gap-engine/index.ts", "utf-8"))
    const LIFE = strip(readFileSync("lib/services/life-events/service.ts", "utf-8"))

    it("the risk-profile version write is awaited, not floated", () => {
        // It used to be `void import(...).then(recordRiskProfileVersion)`, which
        // was defensible while versioning was pure observability. It stopped
        // being defensible when GAP_DETECTED, protection_score_changed and
        // risk_level_changed were hung off it: a floating promise in a
        // serverless function may be terminated when the response returns, so
        // the customer-facing consequence of an upload could never fire.
        expect(ENGINE).not.toMatch(/void\s+import\([^)]*risk-profile-version/)
        expect(ENGINE).toMatch(/await\s+recordRiskProfileVersion\(/)
    })

    it("the life-event path runs the FULL engine, not a version-only recompute", () => {
        // The dashboard reads the CACHED score. A version-only recompute left a
        // customer who declared "a child was born" looking at their pre-event
        // score, with recommendations that did not mention the new gap, moments
        // after being notified that it had opened.
        expect(LIFE).toMatch(/runGapEngine\(userId, \{ trigger, lifeEventId/)
        expect(LIFE).not.toMatch(/getGapEngineSnapshot/)
    })

    it("the causal link to the life event survives the full engine", () => {
        // The only thing the reduced path was really protecting was
        // `lifeEventId` — the link the timeline uses to say "this risk opened
        // because you declared a mortgage on the 14th".
        expect(ENGINE).toMatch(/lifeEventId: opts\?\.lifeEventId/)
    })
})
