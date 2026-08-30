import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"

/**
 * §8.6: a failed reading appears ONCE on /updates. The registry emits
 * `policy_analysis_failed` with no dedupeKey until Grafí G9 — so five retries
 * were five badge entries. Every emit of that event must now carry a
 * dedupeKey, and /updates groups strictly on the stored key
 * (lib/notifications/event-grouping.ts — exact match, never a heuristic).
 */
describe("a failed reading folds to one entry", () => {
    it("every policy_analysis_failed emit carries a dedupeKey", () => {
        const src = readFileSync("lib/services/policy.service.ts", "utf-8")
        const emits = src.split(/await emit\(\{/).slice(1).filter((chunk) => /event: 'policy_analysis_failed'/.test(chunk.slice(0, 200)))
        expect(emits.length).toBeGreaterThanOrEqual(2)
        for (const [i, chunk] of emits.entries()) {
            const body = chunk.slice(0, chunk.indexOf("})"))
            expect(body, `emit #${i + 1} has no dedupeKey`).toMatch(/dedupeKey: `policy_analysis_failed:/)
        }
    })
    it("the per-policy key is the policy id — retries of one policy fold, different policies do not", () => {
        const src = readFileSync("lib/services/policy.service.ts", "utf-8")
        expect(src).toMatch(/dedupeKey: `policy_analysis_failed:\$\{policyId\}`/)
    })
    it("/updates marks the whole dedupe group read, and «Τα είδα όλα» stamps every unread row of the stream", () => {
        const actions = readFileSync("app/(protected)/updates/actions.ts", "utf-8")
        expect(actions).toMatch(/dedupeKey: row\.dedupeKey/)
        expect(actions).toMatch(/eventType: \{ in: eventTypesOf\(parsed\.data\.stream\) \}/)
        expect(actions).not.toMatch(/take:/)
    })
})

describe("no percentage of the person survives into /updates (H-001, AI Act §10)", () => {
    it("the model drops retired score rows instead of rendering their stored prose", () => {
        const src = readFileSync("lib/app/updates-model.ts", "utf-8")
        expect(src).toMatch(/isRetiredScoreRow/)
        expect(src).toMatch(/retired score notification dropped/)
    })
})
