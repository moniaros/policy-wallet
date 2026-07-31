/**
 * /admin/ai/settings — pure form parsing rules + write-path wiring.
 *
 * The parse rules encode the row semantics (auto XOR fully pinned), the
 * translate-provider restriction, the missing-API-key block, and the
 * unknown-model warning. Source-text assertions pin the plans-shaped write
 * path (verifyAdminRole, audit row, tag revalidation) so a refactor cannot
 * silently drop them.
 */

import { describe, it, expect, vi } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

vi.mock("@/lib/env", () => ({
    env: {
        GEMINI_MODEL_EXTRACTION: "gemini-3-flash-preview",
        GEMINI_MODEL_GAP_ANALYSIS: "gemini-3-flash-preview",
        GEMINI_MODEL_CLARITY_ANALYSIS: "gemini-3.1-flash-lite",
        GEMINI_MODEL_QA: "gemini-3.1-flash-lite",
        GEMINI_MODEL_FALLBACK: "gemini-3.5-flash",
        GEMINI_MODEL_TRANSLATION: "gemini-3.1-flash-lite",
        OPENAI_MODEL_EXTRACTION: "gpt-4.1-mini",
        OPENAI_MODEL_GAP_ANALYSIS: "gpt-4.1-mini",
        OPENAI_MODEL_CLARITY_ANALYSIS: "gpt-4.1-mini",
        OPENAI_MODEL_QA: "gpt-4.1-mini",
        OPENAI_MODEL_FALLBACK: "gpt-4.1-mini",
        CLAUDE_MODEL_EXTRACTION: "claude-sonnet-5",
        CLAUDE_MODEL_GAP_ANALYSIS: "claude-sonnet-5",
        CLAUDE_MODEL_CLARITY_ANALYSIS: "claude-sonnet-5",
        CLAUDE_MODEL_QA: "claude-haiku-4-5",
        CLAUDE_MODEL_FALLBACK: "claude-haiku-4-5",
        GEMINI_API_KEY: "test-key",
    },
}))
vi.mock("@/lib/logger", () => ({ logger: vi.fn() }))
vi.mock("next/cache", () => ({
    unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
    revalidateTag: vi.fn(),
    revalidatePath: vi.fn(),
}))
vi.mock("@/lib/db", () => ({ db: {} }))

import { parseAiConfigForm, computeAiConfigDiff } from "@/lib/admin/ai-config-update"

const keys = { gemini: true, anthropic: true, openai: false }

function form(fields: Record<string, string>): FormData {
    const fd = new FormData()
    for (const [k, v] of Object.entries(fields)) fd.set(k, v)
    return fd
}

describe("parseAiConfigForm", () => {
    it("accepts a fully pinned operation row", () => {
        const input = parseAiConfigForm(form({ configKey: "askQuestion", provider: "anthropic", model: "claude-haiku-4-5" }), keys)
        expect(input).toMatchObject({ configKey: "askQuestion", provider: "anthropic", model: "claude-haiku-4-5", warnings: [] })
    })

    it("accepts auto with an empty model (pure env behavior)", () => {
        const input = parseAiConfigForm(form({ configKey: "analyzeGaps", provider: "auto", model: "" }), keys)
        expect(input).toMatchObject({ provider: "auto", model: null })
    })

    it("rejects auto with a model (D2: no third precedence rung)", () => {
        expect(() => parseAiConfigForm(form({ configKey: "askQuestion", provider: "auto", model: "x" }), keys)).toThrow(/auto/i)
    })

    it("rejects a pinned provider with an empty model", () => {
        expect(() => parseAiConfigForm(form({ configKey: "askQuestion", provider: "anthropic", model: " " }), keys)).toThrow(/model/i)
    })

    it("rejects a non-gemini pin on the translate row (hardwired SDK)", () => {
        expect(() => parseAiConfigForm(form({ configKey: "translate", provider: "openai", model: "gpt-4.1-mini" }), keys)).toThrow(/gemini/i)
    })

    it("blocks pinning a provider whose API key is absent", () => {
        expect(() => parseAiConfigForm(form({ configKey: "askQuestion", provider: "openai", model: "gpt-4.1-mini" }), keys)).toThrow(/API key/i)
    })

    it("warns (does not block) on a model unknown to TOKEN_COSTS", () => {
        const input = parseAiConfigForm(form({ configKey: "askQuestion", provider: "anthropic", model: "claude-new-model-x" }), keys)
        expect(input.warnings.length).toBe(1)
        expect(input.warnings[0]).toMatch(/TOKEN_COSTS/)
    })

    it("primaryProvider row pins the provider only (model rejected)", () => {
        const ok = parseAiConfigForm(form({ configKey: "primaryProvider", provider: "anthropic", model: "" }), keys)
        expect(ok).toMatchObject({ provider: "anthropic", model: null })
        expect(() => parseAiConfigForm(form({ configKey: "primaryProvider", provider: "anthropic", model: "claude-haiku-4-5" }), keys)).toThrow(/provider only/i)
    })

    it("rejects unknown config keys", () => {
        expect(() => parseAiConfigForm(form({ configKey: "hack", provider: "auto", model: "" }), keys)).toThrow(/configKey/i)
    })
})

describe("computeAiConfigDiff", () => {
    it("returns an empty diff for a no-op save (missing row == auto)", () => {
        expect(computeAiConfigDiff(null, { provider: "auto", model: null })).toEqual([])
        expect(computeAiConfigDiff({ provider: "anthropic", model: "m" }, { provider: "anthropic", model: "m" })).toEqual([])
    })

    it("captures per-field {from,to} changes", () => {
        const diff = computeAiConfigDiff({ provider: "auto", model: null }, { provider: "anthropic", model: "claude-haiku-4-5" })
        expect(diff).toEqual([
            { field: "provider", from: "auto", to: "anthropic" },
            { field: "model", from: null, to: "claude-haiku-4-5" },
        ])
    })
})

describe("settings write-path wiring (source-text)", () => {
    const src = readFileSync(join(process.cwd(), "app/(protected)/admin/ai/settings/actions.ts"), "utf8")

    it("verifies the admin role and audits the change", () => {
        expect(src).toMatch(/verifyAdminRole\(\)/)
        expect(src).toMatch(/logAdminAction\(/)
        expect(src).toMatch(/UPDATE_AI_MODEL_CONFIG/)
    })

    it("writes a revision row in the same transaction", () => {
        expect(src).toMatch(/\$transaction/)
        expect(src).toMatch(/aiRuntimeConfigRevision\.create/)
    })

    it("revalidates the runtime-config cache tag so edits land immediately", () => {
        expect(src).toMatch(/revalidateTag\(AI_RUNTIME_CONFIG_CACHE_TAG/)
    })
})
