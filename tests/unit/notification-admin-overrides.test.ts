import { describe, it, expect } from "vitest"
import { applyOverride, baseConfig, type RuleOverrideRow } from "@/lib/notifications/config"
import { NOTIFICATION_EVENTS } from "@/lib/notifications/registry"
import {
    validateRuleOverride,
    validateTemplateInput,
    computeRuleDiff,
    type RuleOverrideInput,
} from "@/lib/admin/notification-admin"
import {
    NOTIFICATION_SETTINGS,
    defaultSettings,
    validateSetting,
} from "@/lib/notifications/settings"
import { interpolate, renderTemplate, validateTemplate, variablesFor } from "@/lib/notifications/templates"

/**
 * The admin layer lets an operator change what customers receive without a
 * deploy. These are the rules that stop that from becoming a way to change
 * things they must not.
 */

const emptyOverride = (patch: Partial<RuleOverrideRow>): RuleOverrideRow => ({
    eventType: "policy_analyzed",
    enabled: null,
    priority: null,
    channels: null,
    retryAttempts: null,
    retryBackoff: null,
    retryBaseDelayMinutes: null,
    escalationAfterFailures: null,
    escalationAfterUnreadHours: null,
    expiresAfterHours: null,
    notes: null,
    ...patch,
})

const emptyInput = (patch: Partial<RuleOverrideInput>): RuleOverrideInput => ({
    eventType: "policy_analyzed",
    enabled: null,
    priority: null,
    channels: null,
    retryAttempts: null,
    retryBackoff: null,
    retryBaseDelayMinutes: null,
    escalationAfterFailures: null,
    escalationAfterUnreadHours: null,
    expiresAfterHours: null,
    notes: null,
    ...patch,
})

describe("an override is a set of deltas, not a copy", () => {
    it("null means inherit — an empty override changes nothing", () => {
        const def = NOTIFICATION_EVENTS.policy_analyzed
        const result = applyOverride(def, emptyOverride({}))

        expect(result.priority).toBe(def.priority)
        expect(result.channels).toEqual(def.channels)
        expect(result.retry).toEqual(def.retry)
        expect(result.expiresAfterHours).toBe(def.expiresAfterHours)
        expect(result.overridden).toBe(false)
        // The point: an operator who set one field years ago still tracks the
        // code default on the other nine.
        expect(result.overriddenFields).toEqual([])
    })

    it("no override at all is exactly the registry", () => {
        const def = NOTIFICATION_EVENTS.payment_failed
        expect(applyOverride(def, null)).toMatchObject({
            priority: def.priority,
            channels: def.channels,
            enabled: true,
            overridden: false,
        })
    })

    it("reports which fields an operator has taken control of", () => {
        const def = NOTIFICATION_EVENTS.policy_analyzed
        const result = applyOverride(def, emptyOverride({ priority: "low", expiresAfterHours: 12 }))

        expect(result.priority).toBe("low")
        expect(result.expiresAfterHours).toBe(12)
        expect(result.overriddenFields.sort()).toEqual(["expiresAfterHours", "priority"])
    })
})

describe("an override cannot reach a state the code forbids", () => {
    it("cannot widen an event's channels beyond what it declares", () => {
        const def = NOTIFICATION_EVENTS.recommendation_generated
        expect(def.channels).toEqual(["in_app"])

        // An operator trying to route an in-app-only event to email. That is a
        // product decision about what the event IS, not an operational setting.
        const result = applyOverride(def, emptyOverride({ channels: ["in_app", "email", "push"] }))
        expect(result.channels).toEqual(["in_app"])
        expect(result.overriddenFields).not.toContain("channels")
    })

    it("narrows to a declared subset, and drops undeclared channels from the set", () => {
        const def = NOTIFICATION_EVENTS.policy_analyzed
        const result = applyOverride(def, emptyOverride({ channels: ["in_app", "sms"] }))
        expect(result.channels).toEqual(["in_app"])
    })

    it("an empty channel list does not silently mute the event", () => {
        const def = NOTIFICATION_EVENTS.policy_analyzed
        // Muting belongs to `enabled`, where it is visible and audited — not to
        // a channel list that happens to have been emptied.
        const result = applyOverride(def, emptyOverride({ channels: [] }))
        expect(result.channels).toEqual(def.channels)
    })

    it("ignores an unknown priority rather than coercing it", () => {
        const def = NOTIFICATION_EVENTS.policy_analyzed
        const result = applyOverride(def, emptyOverride({ priority: "urgent" }))
        expect(result.priority).toBe(def.priority)
    })

    it("ignores an unknown backoff strategy", () => {
        const def = NOTIFICATION_EVENTS.policy_analyzed
        const result = applyOverride(def, emptyOverride({ retryBackoff: "fibonacci" }))
        expect(result.retry.backoff).toBe(def.retry.backoff)
    })

    it("cannot invent an escalation on an event that declares none", () => {
        const def = NOTIFICATION_EVENTS.weekly_digest
        expect(def.escalation).toBeNull()

        // Escalating would emit the rule's target event — and there is no
        // target, so this would fire something undeclared.
        const result = applyOverride(def, emptyOverride({ escalationAfterFailures: 2 }))
        expect(result.escalation).toBeNull()
    })

    it("cannot change transactional, category or recipients at all", () => {
        const def = NOTIFICATION_EVENTS.password_change
        const result = applyOverride(
            def,
            emptyOverride({ eventType: "password_change", priority: "low" })
        )
        // No override field exists for these, by design — this pins that the
        // merged result still carries the code's values.
        expect(result.transactional).toBe(def.transactional)
        expect(result.category).toBe(def.category)
        expect(result.recipients).toEqual(def.recipients)
    })
})

describe("a transactional event cannot be switched off", () => {
    it("rejects disabling one through the rule editor", () => {
        const def = NOTIFICATION_EVENTS.payment_failed
        expect(def.transactional).toBe(true)

        const errors = validateRuleOverride(
            emptyInput({ eventType: "payment_failed", enabled: false }),
            def
        )
        expect(errors.some((e) => e.field === "enabled")).toBe(true)
    })

    it("allows disabling a suppressible one", () => {
        const def = NOTIFICATION_EVENTS.weekly_digest
        expect(def.transactional).toBe(false)
        const errors = validateRuleOverride(
            emptyInput({ eventType: "weekly_digest", enabled: false }),
            def
        )
        expect(errors).toEqual([])
    })

    it("covers every security and billing event, not just the one tested", () => {
        for (const [key, def] of Object.entries(NOTIFICATION_EVENTS)) {
            if (def.category !== "security" && def.category !== "billing") continue
            const errors = validateRuleOverride(emptyInput({ eventType: key, enabled: false }), def)
            expect(
                errors.some((e) => e.field === "enabled"),
                `${key} must not be switchable off`
            ).toBe(true)
        }
    })
})

describe("an override cannot produce an incoherent rule", () => {
    it("rejects a retry schedule that outlives the notification", () => {
        const def = NOTIFICATION_EVENTS.policy_expiring
        // policy_expiring expires in 3 days on purpose. A 10-attempt exponential
        // backoff from 60m would still be retrying long after the renewal date.
        const errors = validateRuleOverride(
            emptyInput({
                eventType: "policy_expiring",
                retryAttempts: 10,
                retryBackoff: "exponential",
                retryBaseDelayMinutes: 60,
            }),
            def
        )
        expect(errors.some((e) => e.field === "retryAttempts")).toBe(true)
    })

    it("accepts a schedule that fits inside the expiry window", () => {
        const def = NOTIFICATION_EVENTS.policy_expiring
        const errors = validateRuleOverride(
            emptyInput({
                eventType: "policy_expiring",
                retryAttempts: 3,
                retryBackoff: "exponential",
                retryBaseDelayMinutes: 15,
            }),
            def
        )
        expect(errors).toEqual([])
    })

    it("rejects out-of-range numbers rather than clamping them", () => {
        const def = NOTIFICATION_EVENTS.policy_analyzed
        expect(
            validateRuleOverride(emptyInput({ retryAttempts: 999 }), def).length
        ).toBeGreaterThan(0)
        expect(
            validateRuleOverride(emptyInput({ expiresAfterHours: 0 }), def).length
        ).toBeGreaterThan(0)
    })
})

describe("settings are declared, validated and defaulted", () => {
    it("an empty table is exactly the shipped behaviour", () => {
        const settings = defaultSettings()
        expect(settings["automation.paused"]).toBe(false)
        expect(settings["automation.retryEnabled"]).toBe(true)
        expect(settings["channel.email.enabled"]).toBe(true)
        expect(settings["threshold.scoreMateriality"]).toBe(5)
    })

    it("baseConfig covers every registry event and every setting", () => {
        const config = baseConfig()
        expect(Object.keys(config.events).length).toBe(Object.keys(NOTIFICATION_EVENTS).length)
        for (const setting of NOTIFICATION_SETTINGS) {
            expect(config.settings[setting.key]).toBe(setting.default)
        }
    })

    it("rejects rather than coerces", () => {
        // A settings table that silently turns "yes" into true is one whose
        // stored value differs from what the operator believes they set.
        expect(validateSetting("automation.paused", "yes").ok).toBe(false)
        expect(validateSetting("threshold.scoreMateriality", "5").ok).toBe(false)
        expect(validateSetting("threshold.scoreMateriality", 2.5).ok).toBe(false)
        expect(validateSetting("threshold.scoreMateriality", 999).ok).toBe(false)
        expect(validateSetting("nope.not.a.key", true).ok).toBe(false)
        expect(validateSetting("threshold.scoreMateriality", 8)).toMatchObject({ ok: true, value: 8 })
    })

    it("every declared setting has both languages and a sane default", () => {
        for (const s of NOTIFICATION_SETTINGS) {
            expect(s.label.el, `${s.key} has no Greek label`).toBeTruthy()
            expect(s.label.en, `${s.key} has no English label`).toBeTruthy()
            expect(s.description.el, `${s.key} has no Greek description`).toBeTruthy()
            expect(validateSetting(s.key, s.default).ok, `${s.key} default is invalid`).toBe(true)
        }
    })
})

describe("templates are closed over their variables", () => {
    it("renders only declared variables and drops anything else", () => {
        const allowed = variablesFor("policy_analyzed")
        expect(allowed).toContain("policyNumber")

        const out = interpolate(
            "Policy {{policyNumber}} for {{recipientName}} — {{internalUserId}}",
            { policyNumber: "POL-1", recipientName: "Maria", internalUserId: "usr_secret" },
            allowed
        )
        // The undeclared one renders empty. A typo becomes a terse sentence,
        // never a leaked identifier on a lock screen.
        expect(out).toContain("POL-1")
        expect(out).toContain("Maria")
        expect(out).not.toContain("usr_secret")
    })

    it("reports unknown variables at save time", () => {
        const issues = validateTemplate(
            { subject: null, title: "Hi {{recipientName}}", body: "Your {{nonsense}}" },
            "policy_analyzed"
        )
        expect(issues).toHaveLength(1)
        expect(issues[0].unknownVariables).toEqual(["nonsense"])
    })

    it("falls back to the caller's copy rather than sending something empty", () => {
        // A template that renders to nothing is not a usable notification.
        const rendered = renderTemplate(
            { "policy_analyzed:email:en": { subject: null, title: "{{unknown}}", body: "{{unknown}}" } },
            "policy_analyzed",
            "email",
            "en",
            {}
        )
        expect(rendered).toBeNull()
    })

    it("returns null when there is no template, which is the normal case", () => {
        expect(renderTemplate({}, "policy_analyzed", "email", "en", {})).toBeNull()
    })

    it("rejects a push body the device would truncate", () => {
        const errors = validateTemplateInput({
            eventType: "policy_analyzed",
            channel: "push",
            locale: "en",
            subject: null,
            title: "Analysis complete",
            body: "x".repeat(200),
            isActive: true,
        })
        expect(errors.some((e) => e.field === "body")).toBe(true)
    })
})

describe("revisions record what actually moved", () => {
    it("an unchanged save produces an empty diff", () => {
        const input = emptyInput({ priority: "low" })
        expect(computeRuleDiff(input, input)).toEqual({})
    })

    it("records only the fields that changed", () => {
        const diff = computeRuleDiff(emptyInput({ priority: "low" }), emptyInput({ priority: "high" }))
        expect(Object.keys(diff)).toEqual(["priority"])
        expect(diff.priority).toEqual({ from: "low", to: "high" })
    })
})
