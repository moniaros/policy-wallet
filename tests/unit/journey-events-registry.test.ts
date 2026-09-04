import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { globSync } from "../helpers/glob"

/**
 * The typed journey registry must describe what the code emits — in both
 * directions. Seven onboarding names sat in the union for months with no
 * emitter; a registry that tolerates that is documentation, not a contract.
 */
const REGISTRY = readFileSync("types/journey-events.ts", "utf-8")
const NAMES = new Set([...REGISTRY.matchAll(/^\s*\| "([a-z_]+)"$/gm)].map((m) => m[1]))
const SOURCES = [...globSync("app/**/*.{ts,tsx}"), ...globSync("components/**/*.{ts,tsx}"), ...globSync("lib/**/*.{ts,tsx}")]
const EMITTED = new Set<string>()
for (const file of SOURCES) {
    const src = readFileSync(file, "utf-8")
    for (const m of src.matchAll(/trackJourneyEvent\(\s*["']([a-z_]+)["']/g)) EMITTED.add(m[1])
}

describe("journey-event registry ↔ emitters", () => {
    it("finds a meaningful number of names and emitters (the scan is not vacuous)", () => {
        expect(NAMES.size).toBeGreaterThan(20)
        expect(EMITTED.size).toBeGreaterThan(10)
    })

    it("every emitted name is registered", () => {
        const unregistered = [...EMITTED].filter((n) => !NAMES.has(n))
        expect(unregistered, `emitted but not in JourneyEventName: ${unregistered.join(", ")}`).toEqual([])
    })

    it("the dashboard's recommendation events are emitted somewhere", () => {
        // §J of docs/planning/PERSONAL_RISK_PROFILE.md — registered on
        // 2e22616f, emitted by components/dashboard/home/RecommendationAnalytics.tsx.
        for (const name of ["recommendation_viewed", "action_started"]) {
            expect(NAMES.has(name), `${name} is not registered`).toBe(true)
            expect(EMITTED.has(name), `${name} is registered but never emitted`).toBe(true)
        }
    })

    it("every first-stage onboarding name is emitted somewhere", () => {
        const onboarding = [...NAMES].filter((n) =>
            /^(onboarding_|intent_|life_context_|risk_concern_|confidence_level_|life_change_|future_consideration_|guidance_preference_|protection_)/.test(n)
        )
        const dead = onboarding.filter((n) => !EMITTED.has(n))
        expect(dead, `registered but never emitted: ${dead.join(", ")}`).toEqual([])
    })
})
