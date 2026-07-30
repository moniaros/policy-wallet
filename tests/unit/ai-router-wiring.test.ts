/**
 * Source-level wiring guarantees for the per-call router (Phase 2).
 *
 * These pin the dead-code fixes so they can't silently regress: the orchestrator
 * no longer hardcodes provider: "gemini" at run creation, the risk-profile
 * providers honor modelOverride, and the interactive paths go through the gateway.
 */

import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8")

describe("orchestrator uses the router for provider selection", () => {
    const src = read("lib/services/analysis/policy-analysis-orchestrator.service.ts")

    it("createRun no longer hardcodes provider: \"gemini\"", () => {
        const start = src.indexOf("async createRun(")
        const end = src.indexOf("\n    async ", start + 1)
        const body = src.slice(start, end === -1 ? undefined : end)
        expect(body).not.toMatch(/provider:\s*"gemini"/)
        expect(body).toMatch(/selectPrimaryProvider\(\)/)
    })

    it("admits anthropic as a primary provider (not coerced back to gemini)", () => {
        expect(src).toMatch(/run\.provider === "anthropic"/)
    })
})

describe("risk-profile providers honor modelOverride", () => {
    for (const file of [
        "lib/services/ai/gemini-ai.service.ts",
        "lib/services/ai/anthropic-ai.service.ts",
        "lib/services/ai/openai-ai.service.ts",
    ]) {
        it(`${file} reads options?.modelOverride on the risk path`, () => {
            const src = read(file)
            const idx = src.indexOf("analyzeRiskProfile")
            expect(idx).toBeGreaterThan(-1)
            // From the method start, the model name must consult modelOverride.
            const body = src.slice(idx, idx + 2000)
            expect(body).toMatch(/options\?\.modelOverride/)
        })
    }
})

describe("interactive paths route through the gateway", () => {
    it("Q&A calls aiGateway.askQuestion", () => {
        expect(read("app/(protected)/wallet/actions.ts")).toMatch(/aiGateway\.askQuestion\(/)
    })
    it("risk analysis calls aiGateway.analyzeRiskProfile", () => {
        expect(read("lib/services/gap-engine/index.ts")).toMatch(/aiGateway\.analyzeRiskProfile\(/)
    })
})
