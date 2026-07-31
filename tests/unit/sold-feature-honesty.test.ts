/**
 * WP-26 — the product must not sell capabilities it does not have.
 *
 * The agent plans advertise 17 boolean features. This suite measures, from the
 * source, which of them anything actually reads, and requires every one with no
 * runtime effect to be DECLARED in `lib/pricing/unbuilt-features.ts`.
 *
 * **A correction to this suite's own first version.** It measured "does any
 * file mention this identifier" and called the answer "unbuilt". That measures
 * whether the FLAG is consulted, not whether the CAPABILITY exists, and the two
 * are different: collaboration threads have a model, a service, a page and a
 * timeline UI, but nothing reads `limits.collaborationThreads`. On that
 * evidence three implemented features were declared unbuilt, and the one flag
 * that really was sold over nothing — `sharedPolicyRoom`, `true` on every paid
 * tier, backed by a TypeScript interface with zero consumers — sat in the same
 * list, indistinguishable.
 *
 * So the declaration is now split, and the half that matters is asserted rather
 * than merely declared: a capability with no implementation must be OFF on
 * every tier. Nobody can pay for it while it does not exist.
 */
import { readFileSync } from "node:fs"
import { globSync } from "glob"
import { describe, expect, it } from "vitest"
import {
    ABSENT_AGENT_CAPABILITIES,
    PLAN_FLAGS_WITHOUT_EFFECT,
    UNENFORCED_AGENT_PLAN_FLAGS,
} from "@/lib/pricing/unbuilt-features"
import { DEFAULT_AGENT_ENTITLEMENT_LIMITS } from "@/lib/pricing/plan-defaults"

/** Files that DEFINE the plan shape rather than consume it. */
const DEFINITION_FILES = [
    "entitlement-schema",
    "plan-defaults",
    "plan-update",
    "unbuilt-features",
]

function soldBooleanFeatures(): string[] {
    const schema = readFileSync("lib/pricing/entitlement-schema.ts", "utf-8")
    const block = schema.split("AgentEntitlementLimitsSchema = z")[1].split(".strict()")[0]
    return [...block.matchAll(/(\w+):\s*z\.boolean\(\)/g)].map((m) => m[1])
}

function consumerFiles(): { path: string; src: string }[] {
    return [
        ...globSync("app/**/*.{ts,tsx}"),
        ...globSync("components/**/*.{ts,tsx}"),
        ...globSync("lib/**/*.ts"),
    ]
        .filter((f) => !DEFINITION_FILES.some((d) => f.includes(d)))
        .map((path) => ({ path, src: readFileSync(path, "utf-8") }))
}

/**
 * Flags that something reads by name.
 *
 * Deliberately narrow, and named for what it measures: a flag absent here is
 * unread, which is NOT the same as a capability being missing. Deciding that
 * takes a human look at where the capability would live — which is why
 * unbuilt-features.ts records those locations per entry.
 */
function readFlags(sold: string[]): Set<string> {
    const files = consumerFiles()
    const read = new Set<string>()
    for (const feature of sold) {
        const pattern = new RegExp(`\\b${feature}\\b`)
        if (files.some((f) => pattern.test(f.src))) read.add(feature)
    }
    return read
}

describe("sold agent features", () => {
    it("reads a real feature list and a real set of consumers", () => {
        // Vacuity floors: a broken split or glob would make every claim below
        // pass by having nothing to measure.
        expect(soldBooleanFeatures().length).toBeGreaterThan(10)
        expect(consumerFiles().length).toBeGreaterThan(100)
    })

    it("never sells a capability that does not exist", () => {
        // The assertion with teeth. Not "declare it somewhere" — off, on every
        // tier, no exceptions. This is what an agent's money buys.
        for (const [tier, limits] of Object.entries(DEFAULT_AGENT_ENTITLEMENT_LIMITS)) {
            for (const capability of ABSENT_AGENT_CAPABILITIES) {
                expect(
                    (limits as unknown as Record<string, unknown>)[capability],
                    `${tier} sells "${capability}", which nothing implements. ` +
                    "Build it, or set it false until it ships."
                ).toBe(false)
            }
        }
    })

    it("declares every advertised flag that nothing reads", () => {
        const sold = soldBooleanFeatures()
        const read = readFlags(sold)
        const undeclared = sold
            .filter((f) => !read.has(f))
            .filter((f) => !(PLAN_FLAGS_WITHOUT_EFFECT as readonly string[]).includes(f))

        expect(
            undeclared,
            "These plan flags are sold but nothing reads them. Gate the feature, " +
            "stop advertising it, or declare it in unbuilt-features.ts — as an " +
            "absent capability if nothing implements it, as an unenforced flag if " +
            "the capability already works for everyone."
        ).toEqual([])
    })

    it("removes a flag from the declaration once something reads it", () => {
        // The other direction: a stale list is its own kind of lie.
        const read = readFlags(soldBooleanFeatures())
        const stale = PLAN_FLAGS_WITHOUT_EFFECT.filter((f) => read.has(f))

        expect(
            stale,
            "These are declared as having no effect but the codebase now reads them."
        ).toEqual([])
    })

    it("keeps the two kinds apart", () => {
        // Conflating them is the mistake this file exists to not repeat: an
        // absent capability must be switched off, an unenforced flag must not.
        const overlap = (ABSENT_AGENT_CAPABILITIES as readonly string[]).filter((f) =>
            (UNENFORCED_AGENT_PLAN_FLAGS as readonly string[]).includes(f)
        )

        expect(overlap).toEqual([])
        expect(ABSENT_AGENT_CAPABILITIES.length).toBeGreaterThan(0)
        expect(UNENFORCED_AGENT_PLAN_FLAGS.length).toBeGreaterThan(0)
    })

    it("keeps the declared gap from growing silently", () => {
        // A ratchet. Raising either number is a product decision someone has to
        // make deliberately, in a diff, with this comment in front of them.
        expect(ABSENT_AGENT_CAPABILITIES.length).toBeLessThanOrEqual(2)
        expect(PLAN_FLAGS_WITHOUT_EFFECT.length).toBeLessThanOrEqual(5)
    })
})
