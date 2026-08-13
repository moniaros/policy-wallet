/**
 * Feature flags — the precedence contract.
 *
 * Pins the three rules the whole design rests on:
 *
 *   1. DB row > environment variable > the default declared in the registry.
 *   2. NULL on a row means "no opinion, fall through" — NOT "off". Collapsing
 *      those two would mean clearing an override silently disabled a feature.
 *   3. The loader NEVER throws: a database error resolves to the environment,
 *      i.e. exactly what this product did before the flags table existed.
 *
 * Plus: a row for a key the registry does not declare is inert, and percentage
 * rollouts are stable per user rather than re-rolled on every read.
 */

import { describe, expect, it } from "vitest"
import {
    baseFlagState,
    flagAppliesTo,
    flagEnabled,
    hashUserToPercent,
    parseBooleanEnv,
    resolveFlag,
    type FlagOverrideRow,
    type FlagState,
} from "@/lib/flags/config"
import { FEATURE_FLAGS } from "@/lib/flags/registry"

const booleanDef = FEATURE_FLAGS["ai.failover_openai"] // default false
const defaultOnDef = FEATURE_FLAGS["ai.degraded_completion"] // default true
const canaryDef = FEATURE_FLAGS["ai.remediation_canary"] // default "internal"

function row(partial: Partial<FlagOverrideRow>): FlagOverrideRow {
    return { key: "k", enabled: null, rollout: null, notes: null, ...partial }
}

describe("feature flag precedence", () => {
    it("uses the registry default when nothing else says anything", () => {
        expect(resolveFlag(booleanDef, undefined, null).enabled).toBe(false)
        expect(resolveFlag(defaultOnDef, undefined, null).enabled).toBe(true)
        expect(resolveFlag(booleanDef, undefined, null).source).toBe("default")
    })

    it("lets the environment override the registry default", () => {
        expect(resolveFlag(booleanDef, "true", null).enabled).toBe(true)
        expect(resolveFlag(defaultOnDef, "false", null).enabled).toBe(false)
        expect(resolveFlag(booleanDef, "true", null).source).toBe("env")
    })

    it("lets a DB row override the environment", () => {
        const off = resolveFlag(booleanDef, "true", row({ enabled: false }))
        expect(off.enabled).toBe(false)
        expect(off.source).toBe("override")
        expect(off.overridden).toBe(true)

        const on = resolveFlag(booleanDef, "false", row({ enabled: true }))
        expect(on.enabled).toBe(true)
    })

    it("treats NULL on the row as fall-through, not as off", () => {
        // The trap this guards: clearing an override must restore the
        // environment's answer, not disable the feature.
        const resolved = resolveFlag(booleanDef, "true", row({ enabled: null }))
        expect(resolved.enabled).toBe(true)
        expect(resolved.source).toBe("env")
        expect(resolved.overridden).toBe(false)
    })

    it("ignores an unparseable environment value rather than coercing it off", () => {
        // A typo in an env var must not silently disable a feature that
        // defaults on.
        expect(parseBooleanEnv("ture")).toBeUndefined()
        expect(resolveFlag(defaultOnDef, "ture", null).enabled).toBe(true)
        expect(resolveFlag(defaultOnDef, "ture", null).source).toBe("default")
    })

    it("accepts the spellings the old env readers accepted", () => {
        for (const yes of ["1", "true", "yes", "on", "TRUE", " On "]) {
            expect(parseBooleanEnv(yes)).toBe(true)
        }
        for (const no of ["0", "false", "no", "off"]) {
            expect(parseBooleanEnv(no)).toBe(false)
        }
        expect(parseBooleanEnv("")).toBeUndefined()
        expect(parseBooleanEnv(undefined)).toBeUndefined()
    })
})

describe("canary flags", () => {
    it("resolves the audience from row, then env, then default", () => {
        expect(resolveFlag(canaryDef, undefined, null).rollout).toBe("internal")
        expect(resolveFlag(canaryDef, "50", null).rollout).toBe("50")
        expect(resolveFlag(canaryDef, "50", row({ rollout: "100" })).rollout).toBe("100")
    })

    it("ignores an unknown audience instead of coercing it", () => {
        // "75" is not a mode this product implements; falling through to the
        // env is safer than inventing a bucket.
        expect(resolveFlag(canaryDef, "10", row({ rollout: "75" })).rollout).toBe("10")
    })

    it("reports off as disabled", () => {
        expect(resolveFlag(canaryDef, "off", null).enabled).toBe(false)
        expect(resolveFlag(canaryDef, "10", null).enabled).toBe(true)
    })
})

describe("audience evaluation", () => {
    function stateWith(rollout: string): FlagState {
        return {
            flags: {
                "ai.remediation_canary": resolveFlag(canaryDef, rollout, null),
            },
            degraded: false,
        }
    }

    it("internal means admin or internal roles only", () => {
        const state = stateWith("internal")
        expect(flagAppliesTo(state, "ai.remediation_canary", "u1", "admin")).toBe(true)
        expect(flagAppliesTo(state, "ai.remediation_canary", "u1", "internal")).toBe(true)
        expect(flagAppliesTo(state, "ai.remediation_canary", "u1", "policyholder")).toBe(false)
        expect(flagAppliesTo(state, "ai.remediation_canary", "u1", undefined)).toBe(false)
    })

    it("100 means everybody and off means nobody", () => {
        expect(flagAppliesTo(stateWith("100"), "ai.remediation_canary", "u1", undefined)).toBe(true)
        expect(flagAppliesTo(stateWith("off"), "ai.remediation_canary", "u1", "admin")).toBe(false)
    })

    it("buckets a user stably, so a rollout is not a coin toss per request", () => {
        const first = hashUserToPercent("user-abc")
        for (let i = 0; i < 25; i++) expect(hashUserToPercent("user-abc")).toBe(first)
        expect(first).toBeGreaterThanOrEqual(0)
        expect(first).toBeLessThan(100)
    })

    it("a 10% rollout is a subset of a 50% rollout for the same user", () => {
        const ten = stateWith("10")
        const fifty = stateWith("50")
        for (let i = 0; i < 200; i++) {
            const id = `user-${i}`
            if (flagAppliesTo(ten, "ai.remediation_canary", id, undefined)) {
                expect(flagAppliesTo(fifty, "ai.remediation_canary", id, undefined)).toBe(true)
            }
        }
    })

    it("an unknown flag key is off, never a throw", () => {
        expect(flagAppliesTo(stateWith("100"), "does.not.exist", "u1", "admin")).toBe(false)
        expect(flagEnabled(stateWith("100"), "does.not.exist")).toBe(false)
    })
})

describe("registry integrity", () => {
    it("every declared flag names the call site that reads it", () => {
        // The rule that keeps the console honest: a switch wired to nothing is
        // worse than no switch, because it looks like control.
        for (const def of Object.values(FEATURE_FLAGS)) {
            expect(def.readAt, `${def.key} must name where it is read`).toMatch(/\.ts /)
            expect(def.envVar, `${def.key} must name its environment variable`).toMatch(/^[A-Z0-9_]+$/)
            expect(def.description.length).toBeGreaterThan(20)
        }
    })

    it("keys match their map entry, so a rename cannot half-land", () => {
        for (const [key, def] of Object.entries(FEATURE_FLAGS)) {
            expect(def.key).toBe(key)
        }
    })

    it("baseFlagState resolves every declared flag", () => {
        const state = baseFlagState()
        for (const key of Object.keys(FEATURE_FLAGS)) {
            expect(state.flags[key], `${key} missing from base state`).toBeTruthy()
        }
        expect(state.degraded).toBe(false)
    })
})
