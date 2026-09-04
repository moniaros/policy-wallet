/**
 * Offline evaluation runner.
 *
 *   npm run eval -- --provider=mock --suite=all           # deterministic, no cost
 *   EVAL_ALLOW_PAID=1 npm run eval -- --provider=gemini --suite=extraction
 *
 * CI runs only the mock path (npm run eval:ci) plus the deterministic scorer
 * unit tests — no paid API calls. Real providers are refused unless
 * EVAL_ALLOW_PAID=1, so a stray CI run can never spend money.
 *
 * The runner scores a chosen provider against the golden datasets and prints a
 * summary. It is a REPORT, not a pass/fail gate, unless --fail-under is given.
 */

import type { IAIService, AIDocument } from "@/lib/services/ai/ai-service.interface"
import { MockAIService } from "@/lib/services/ai/mock-ai.service"
import { asValidatedForTests } from "../tests/helpers/validated-document"
import { EXTRACTION_CASES } from "./datasets/extraction/health-ethniki-1"
import { GAP_CASES } from "./datasets/gaps/health-gaps-1"
import { QA_CASES } from "./datasets/qa/qa-compliance-1"
import { scoreExtraction } from "./scorers/extraction-scorer"
import { scoreGaps } from "./scorers/gap-scorer"
import { scoreQaCompliance } from "./scorers/qa-compliance-scorer"

type Provider = "mock" | "gemini" | "anthropic" | "openai"
type Suite = "extraction" | "gaps" | "qa" | "all"

function parseArgs(argv: string[]): { provider: Provider; suite: Suite; failUnder: number } {
    const get = (name: string, fallback: string) => {
        const hit = argv.find((a) => a.startsWith(`--${name}=`))
        return hit ? hit.slice(name.length + 3) : fallback
    }
    return {
        provider: get("provider", "mock") as Provider,
        suite: get("suite", "all") as Suite,
        failUnder: Number(get("fail-under", "0")),
    }
}

async function buildService(provider: Provider): Promise<IAIService> {
    if (provider === "mock") return new MockAIService()
    if (!process.env.EVAL_ALLOW_PAID) {
        throw new Error(
            `Refusing to run provider "${provider}": real providers cost money. ` +
                `Set EVAL_ALLOW_PAID=1 to run paid evals.`
        )
    }
    const { getAIService } = await import("@/lib/services/ai/ai-service.factory")
    return getAIService(provider)
}

async function runExtraction(service: IAIService) {
    const results = []
    for (const c of EXTRACTION_CASES) {
        const actual = await service.extractPolicyData(asValidatedForTests(c.document as AIDocument), {})
        const score = scoreExtraction(c.expected, actual)
        results.push({ id: c.id, accuracyPct: score.accuracyPct, passed: score.passed, total: score.total })
        console.log(`  [extraction] ${c.id}: ${score.accuracyPct}% (${score.passed}/${score.total} fields)`)
    }
    return results
}

async function runGaps(service: IAIService) {
    const results = []
    for (const c of GAP_CASES) {
        const res = await service.analyzeGaps(null, c.metadata, c.gapDefinitions, {})
        const score = scoreGaps(c.expectedDetectedSlugs, res.gapResults)
        results.push({ id: c.id, recallPct: score.recallPct, precisionPct: score.precisionPct })
        console.log(`  [gaps] ${c.id}: recall ${score.recallPct}% precision ${score.precisionPct}% (missed: ${score.falseNegatives.join(", ") || "none"})`)
    }
    return results
}

async function runQa(service: IAIService) {
    const results = []
    for (const c of QA_CASES) {
        const answer = await service.askQuestion(null, c.metadata, c.question, {})
        const score = scoreQaCompliance(answer, c.rules)
        results.push({ id: c.id, pass: score.pass, passed: score.passed, total: score.total })
        console.log(`  [qa] ${c.id}: ${score.pass ? "PASS" : "FAIL"} (${score.passed}/${score.total} checks)`)
    }
    return results
}

async function main() {
    const { provider, suite, failUnder } = parseArgs(process.argv.slice(2))
    console.log(`AI eval — provider=${provider} suite=${suite}`)

    const service = await buildService(provider)
    const report: Record<string, unknown> = { provider, suite, generatedAt: new Date().toISOString() }

    if (suite === "extraction" || suite === "all") report.extraction = await runExtraction(service)
    if (suite === "gaps" || suite === "all") report.gaps = await runGaps(service)
    if (suite === "qa" || suite === "all") report.qa = await runQa(service)

    // Aggregate the accuracy-style metrics for the optional fail gate.
    const accuracies: number[] = []
    for (const r of (report.extraction as { accuracyPct: number }[]) ?? []) accuracies.push(r.accuracyPct)
    for (const r of (report.gaps as { recallPct: number }[]) ?? []) accuracies.push(r.recallPct)
    const aggregate = accuracies.length ? Math.round(accuracies.reduce((a, b) => a + b, 0) / accuracies.length) : 0
    console.log(`\nAggregate accuracy/recall: ${aggregate}%`)

    if (failUnder > 0 && aggregate < failUnder) {
        console.error(`FAIL: aggregate ${aggregate}% is below --fail-under=${failUnder}`)
        process.exit(1)
    }
    console.log("Eval run complete.")
}

main().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err))
    process.exit(1)
})
