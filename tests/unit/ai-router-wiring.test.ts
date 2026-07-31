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
        // Now takes the admin runtime overrides as an argument (Phase 6b).
        expect(body).toMatch(/selectPrimaryProvider\(/)
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

describe("operator guidance reaches every prompt site (Phase 6c)", () => {
    it("the gateway resolves guidance for both interactive operations", () => {
        const src = read("lib/services/ai/gateway.ts")
        const hits = src.match(/resolveOperatorGuidance\(/g) ?? []
        expect(hits.length).toBeGreaterThanOrEqual(2)
    })
    it("the orchestrator resolves guidance per step with the policy's line of business", () => {
        const src = read("lib/services/analysis/policy-analysis-orchestrator.service.ts")
        expect(src).toMatch(/resolveOperatorGuidance\(promptOverrides, operation, policy\.lineOfBusiness\)/)
        const uses = src.match(/operatorGuidance: guidanceFor\(/g) ?? []
        expect(uses.length).toBe(3) // extraction, clarity, gap detection
    })
    it("the quick extract route resolves GLOBAL guidance (LoB unknown pre-extraction)", () => {
        const src = read("app/api/policies/extract/route.ts")
        expect(src).toMatch(/resolveOperatorGuidance\(promptOverrides, "extractPolicyData"\)/)
    })
    it("wallet Q&A passes the policy's line of business into the gateway context", () => {
        expect(read("app/(protected)/wallet/actions.ts")).toMatch(/lineOfBusiness: policy\.lineOfBusiness,\s*\n\s*\}\s*\n\s*\)/)
    })
})

describe("admin runtime overrides reach every routing site (Phase 6b)", () => {
    it("the gateway loads the cached overrides", () => {
        expect(read("lib/services/ai/gateway.ts")).toMatch(/getAiRuntimeOverrides\(\)/)
    })
    it("the orchestrator loads the cached overrides (createRun + step attempts)", () => {
        const src = read("lib/services/analysis/policy-analysis-orchestrator.service.ts")
        const hits = src.match(/getAiRuntimeOverrides\(\)/g) ?? []
        expect(hits.length).toBeGreaterThanOrEqual(2)
    })
    it("the quick extract route and the batch translator honor overrides", () => {
        expect(read("app/api/policies/extract/route.ts")).toMatch(/getAiRuntimeOverrides\(\)/)
        expect(read("lib/services/translation/batch-translator.ts")).toMatch(/getAiRuntimeOverrides\(\)/)
    })
})
