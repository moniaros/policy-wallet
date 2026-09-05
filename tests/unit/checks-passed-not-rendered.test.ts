import { describe, expect, it } from "vitest"
import { readFileSync, readdirSync, statSync } from "node:fs"
import path from "node:path"

/**
 * The prose-derived "checks passed" number reaches no user surface (A1.2).
 *
 * `PolicyAnalysisRun.overallSuccessPct` is the mean of per-step `successPct`,
 * and the gap step's `successPct` is
 * `min(gapResults.length, gapDefinitions.length) / gapDefinitions.length`
 * (policy-analysis-orchestrator.service.ts, `checksPassed`) — the share of
 * definitions for which the MODEL RETURNED PROSE, not the share of checks a
 * policy passed. `resultJson.checklistScores[].checksPassed` is a model-authored
 * number of the same kind. Rendered, either is a fabricated metric of the same
 * class as the marketing counts that were removed. Goal 0 F1 found it feeding
 * a B2C progress bar, two JSON API fields, a per-branch "average" in the
 * portfolio view and a run-to-run "score change".
 *
 * Rule: the identifiers may appear only in PRODUCERS — the orchestrator that
 * computes and stores them, telemetry, the provider contracts that receive
 * them, and the translator that carries the stored payload. Nothing under
 * app/ or components/ may mention them at all, and no other lib/ module may
 * either. Comments are stripped first so a producer can document the number
 * without being counted as a consumer.
 *
 * The universe is enumerated from disk; the allowlist is the only thing that
 * shrinks it, and every entry names why it may know the identifier.
 */
const ROOT = process.cwd()

const FORBIDDEN =
    /\b(overall_success_pct|overallSuccessPct|success_pct|successPct|avgSuccessPct|overallScoreChange|checksPassed|checks_passed)\b/

const PRODUCERS: ReadonlyMap<string, string> = new Map([
    ["lib/services/analysis/policy-analysis-orchestrator.service.ts", "computes and stores the number; never renders"],
    ["lib/services/analysis/step-telemetry.ts", "structured logs"],
    ["lib/services/ai/ai-service.interface.ts", "provider response contract"],
    ["lib/services/ai/gemini-ai.service.ts", "provider response schema"],
    ["lib/services/ai/anthropic-ai.service.ts", "provider response schema"],
    ["lib/services/ai/openai-ai.service.ts", "provider response schema"],
    ["lib/services/ai/mock-ai.service.ts", "test provider"],
    ["lib/services/ai/json-mode-schema.ts", "provider response parsing"],
    ["lib/services/ai/prompts.ts", "asks the model for the field (model input, never rendered)"],
    ["lib/services/translation/greek-to-bilingual.ts", "translates the stored payload field-for-field"],
])

function walk(dir: string, out: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
        if (entry === "node_modules" || entry === ".next" || entry.startsWith(".")) continue
        const full = path.join(dir, entry)
        if (statSync(full).isDirectory()) walk(full, out)
        else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(full)
    }
    return out
}

const stripComments = (src: string) =>
    src
        .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
        .replace(/^(\s*)\/\/.*$/gm, "$1")
        .replace(/\{\/\*[\s\S]*?\*\/\}/g, (m) => m.replace(/[^\n]/g, " "))

export function findForbiddenMentions(src: string): number[] {
    const lines = stripComments(src).split("\n")
    const hits: number[] = []
    lines.forEach((line, i) => {
        if (FORBIDDEN.test(line)) hits.push(i + 1)
    })
    return hits
}

const FILES = ["app", "components", "lib"]
    .map((d) => path.join(ROOT, d))
    .filter((d) => {
        try {
            return statSync(d).isDirectory()
        } catch {
            return false
        }
    })
    .flatMap((d) => walk(d))

const PROBES = path.join(ROOT, "tests/fixtures/guard-probes")

describe("the prose-derived checks-passed number renders nowhere (A1.2)", () => {
    it("enumerates a real universe", () => {
        expect(FILES.length).toBeGreaterThan(400)
    })

    it("is proven red on a JSX render and a JSON payload, green on a clean file", () => {
        expect(findForbiddenMentions(readFileSync(path.join(PROBES, "checks-passed-render.tsx.txt"), "utf8"))).not.toEqual([])
        expect(findForbiddenMentions(readFileSync(path.join(PROBES, "checks-passed-payload.ts.txt"), "utf8"))).not.toEqual([])
        expect(findForbiddenMentions(readFileSync(path.join(PROBES, "checks-passed-clean.tsx.txt"), "utf8"))).toEqual([])
    })

    it("every producer still exists and lives under lib/ (a producer that moves into app/ becomes a consumer)", () => {
        for (const rel of PRODUCERS.keys()) {
            expect(rel.startsWith("lib/"), `${rel} is not a lib/ producer`).toBe(true)
            expect(() => statSync(path.join(ROOT, rel)), `${rel} no longer exists — remove it from PRODUCERS`).not.toThrow()
        }
    })

    it("no file outside the producer allowlist mentions the identifiers", () => {
        const offenders: string[] = []
        for (const file of FILES) {
            const rel = path.relative(ROOT, file)
            if (PRODUCERS.has(rel)) continue
            const hits = findForbiddenMentions(readFileSync(file, "utf8"))
            for (const line of hits) offenders.push(`${rel}:${line}`)
        }
        expect(offenders, `checks-passed number reaches a consumer:\n${offenders.join("\n")}`).toEqual([])
    })
})
