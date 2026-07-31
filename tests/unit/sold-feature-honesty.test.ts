/**
 * WP-26 — the product must not sell capabilities it does not have.
 *
 * The agent plans advertise 17 boolean features. This suite measures, from the
 * source, which of them anything in the codebase actually consults, and
 * requires every unimplemented one to be DECLARED in
 * `lib/pricing/unbuilt-features.ts`. Silence is the failure mode: an agent who
 * upgrades for a flag nothing reads pays and receives nothing.
 *
 * A prior audit put this at "~13 sold boolean flags unfenced" by grepping only
 * for `canAgentUseFeature`. That undercounted enforcement: `priorityQueue` sets
 * queue priority inside the orchestrator and `pipelineAnalytics` is read
 * straight by the agent dashboard — enforced, just not through the helper. The
 * measured figure is 5. Counting the gate instead of the behaviour is how a
 * number stops tracking the code.
 */
import { readFileSync } from "node:fs"
import { globSync } from "glob"
import { describe, expect, it } from "vitest"
import { SOLD_BUT_UNBUILT_AGENT_FEATURES } from "@/lib/pricing/unbuilt-features"

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

/** A feature is "built" when any non-definition file references it by name. */
function builtFeatures(sold: string[]): Set<string> {
    const files = consumerFiles()
    const built = new Set<string>()
    for (const feature of sold) {
        const pattern = new RegExp(`\\b${feature}\\b`)
        if (files.some((f) => pattern.test(f.src))) built.add(feature)
    }
    return built
}

describe("sold agent features", () => {
    it("reads a real feature list and a real set of consumers", () => {
        // Vacuity floors: a broken split or glob would make every claim below
        // pass by having nothing to measure.
        expect(soldBooleanFeatures().length).toBeGreaterThan(10)
        expect(consumerFiles().length).toBeGreaterThan(100)
    })

    it("declares every advertised feature that nothing implements", () => {
        const sold = soldBooleanFeatures()
        const built = builtFeatures(sold)
        const undeclared = sold
            .filter((f) => !built.has(f))
            .filter((f) => !(SOLD_BUT_UNBUILT_AGENT_FEATURES as readonly string[]).includes(f))

        expect(
            undeclared,
            "These plan features are sold but nothing reads them. Build them, stop " +
            "advertising them, or add them to SOLD_BUT_UNBUILT_AGENT_FEATURES."
        ).toEqual([])
    })

    it("removes a feature from the unbuilt list once it is implemented", () => {
        // The other direction: a stale list is its own kind of lie, and would
        // keep a shipped capability marked unavailable in pricing copy.
        const sold = soldBooleanFeatures()
        const built = builtFeatures(sold)
        const staleEntries = SOLD_BUT_UNBUILT_AGENT_FEATURES.filter((f) => built.has(f))

        expect(
            staleEntries,
            "These are listed as unbuilt but the codebase now references them."
        ).toEqual([])
    })

    it("keeps the declared gap from growing silently", () => {
        // A ratchet. Raising this number is a product decision someone has to
        // make deliberately, in a diff, with this comment in front of them.
        expect(SOLD_BUT_UNBUILT_AGENT_FEATURES.length).toBeLessThanOrEqual(5)
    })
})
