/**
 * The feature-flag console's form rules.
 *
 * These decide whether an operator can turn off the email-verification gate or
 * send live analyses to a different AI provider, so they are asserted directly
 * rather than trusted to the UI.
 */

import { describe, expect, it } from "vitest"
import {
    computeFlagDiff,
    describeFlagChange,
    parseFlagForm,
    validateFlagInput,
    type FlagInput,
} from "@/lib/admin/flag-admin"
import { flagDefinition } from "@/lib/flags/registry"

function form(fields: Record<string, string>): FormData {
    const fd = new FormData()
    for (const [k, v] of Object.entries(fields)) fd.set(k, v)
    return fd
}

const input = (partial: Partial<FlagInput>): FlagInput => ({
    key: "ai.failover_openai",
    enabled: null,
    rollout: null,
    notes: null,
    ...partial,
})

describe("parseFlagForm", () => {
    it("reads the tri-state, keeping inherit distinct from off", () => {
        // The trap: if "inherit" parsed as false, clearing an override would
        // silently disable the feature.
        expect(parseFlagForm(form({ key: "k", enabled: "inherit" })).enabled).toBeNull()
        expect(parseFlagForm(form({ key: "k", enabled: "false" })).enabled).toBe(false)
        expect(parseFlagForm(form({ key: "k", enabled: "true" })).enabled).toBe(true)
    })

    it("treats a missing or blank field as inherit", () => {
        expect(parseFlagForm(form({ key: "k" })).enabled).toBeNull()
        expect(parseFlagForm(form({ key: "k", enabled: "   " })).enabled).toBeNull()
    })

    it("trims the key and caps notes rather than rejecting long ones", () => {
        const parsed = parseFlagForm(form({ key: "  ai.failover_openai  ", notes: "x".repeat(5000) }))
        expect(parsed.key).toBe("ai.failover_openai")
        expect(parsed.notes).toHaveLength(2000)
    })
})

describe("validateFlagInput", () => {
    it("refuses a key the registry does not declare", () => {
        const errors = validateFlagInput(input({ key: "made.up" }), undefined)
        expect(errors).toHaveLength(1)
        expect(errors[0].field).toBe("key")
        expect(errors[0].message).toMatch(/registry/i)
    })

    it("refuses to change an environment-only flag", () => {
        const def = flagDefinition("extraction.citations")!
        expect(def.envOnly).toBe(true)
        const errors = validateFlagInput(input({ key: def.key, enabled: true }), def)
        expect(errors.some((e) => /environment-only/i.test(e.message))).toBe(true)
    })

    it("requires a reason before a safety-critical flag is switched off", () => {
        const def = flagDefinition("auth.enforce_email_verification")!
        expect(def.safetyCritical).toBe(true)

        const withoutReason = validateFlagInput(input({ key: def.key, enabled: false }), def)
        expect(withoutReason.some((e) => e.field === "notes")).toBe(true)

        const withReason = validateFlagInput(
            input({ key: def.key, enabled: false, notes: "Blocking the demo accounts" }),
            def
        )
        expect(withReason).toHaveLength(0)
    })

    it("does not demand a reason to switch a safety flag ON", () => {
        // Turning a protection on is the safe direction; friction there just
        // discourages the right action.
        const def = flagDefinition("auth.enforce_email_verification")!
        expect(validateFlagInput(input({ key: def.key, enabled: true }), def)).toHaveLength(0)
    })

    it("rejects a rollout that is not one of the five modes", () => {
        const def = flagDefinition("ai.remediation_canary")!
        expect(validateFlagInput(input({ key: def.key, rollout: "75" }), def)).toHaveLength(1)
        expect(validateFlagInput(input({ key: def.key, rollout: "50" }), def)).toHaveLength(0)
    })

    it("rejects an audience on a boolean flag", () => {
        const def = flagDefinition("ai.failover_openai")!
        const errors = validateFlagInput(input({ key: def.key, rollout: "50" }), def)
        expect(errors.some((e) => e.field === "rollout")).toBe(true)
    })
})

describe("computeFlagDiff", () => {
    it("records only what moved", () => {
        const existing = { enabled: true, rollout: null, notes: "old" }
        const diff = computeFlagDiff(existing, input({ enabled: true, notes: "new" }))
        expect(Object.keys(diff)).toEqual(["notes"])
        expect(diff.notes).toEqual({ from: "old", to: "new" })
    })

    it("treats a first write as a change from nothing", () => {
        const diff = computeFlagDiff(null, input({ enabled: false }))
        expect(diff.enabled).toEqual({ from: null, to: false })
    })

    it("sees clearing an override as a change", () => {
        // A version history that omits "someone removed the override" is a
        // history that cannot explain why behaviour moved.
        const diff = computeFlagDiff({ enabled: false, rollout: null, notes: null }, input({ enabled: null }))
        expect(diff.enabled).toEqual({ from: false, to: null })
    })

    it("is empty when nothing moved, so no revision is manufactured", () => {
        const existing = { enabled: true, rollout: null, notes: "why" }
        expect(computeFlagDiff(existing, input({ enabled: true, notes: "why" }))).toEqual({})
    })
})

describe("describeFlagChange", () => {
    it("reads as a sentence in an incident review", () => {
        expect(describeFlagChange(input({ key: "ai.failover_openai", enabled: true }))).toBe(
            "Turned OpenAI failover on"
        )
        expect(describeFlagChange(input({ key: "ai.failover_openai", enabled: null }))).toMatch(
            /^Cleared the override/
        )
        expect(
            describeFlagChange(input({ key: "ai.remediation_canary", rollout: "50" }))
        ).toBe("Set Remediation audience to 50")
    })
})
