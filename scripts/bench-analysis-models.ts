/**
 * Model latency benchmark for the two steps that dominate an analysis run.
 *
 * Measured on 2026-09-01 against the dev database, run cmtc2nsgn001l86687vnl4ipi
 * (226.7s total): metadata_extraction 89.8s and gap_detection 92.6s were 80% of
 * the wall clock, both on `gemini-3-flash-preview`, while the clarity step on
 * `gemini-3.1-flash-lite` took 12.6s. Input was 11.5K tokens — small — so the
 * cost is model latency, not payload size.
 *
 * This re-runs those two calls against candidate models on a REAL document so
 * the model decision is made on numbers rather than on the assumption that
 * "flash-preview" is fast. It makes billed provider calls: one extraction and
 * one gap analysis per candidate.
 *
 *   npx ts-node -r tsconfig-paths/register -P evals/tsconfig.evals.json \
 *     scripts/bench-analysis-models.ts [policyId] [--provider=gemini|anthropic|openai] [--models=a,b]
 *
 * Anthropic needs ANTHROPIC_API_KEY in the environment; the provider itself is
 * already wired (lib/services/ai/anthropic-ai.service.ts) and is selected in the
 * app by AI_SERVICE_TYPE=anthropic.
 */

import { db } from "@/lib/db"
import { getAIService } from "@/lib/services/ai/ai-service.factory"
import { downloadPolicyDocument } from "@/lib/supabase/storage-download"
import type { AIServiceType } from "@/lib/services/ai/ai-service.factory"
import type { GapDefinitionForAI, PolicyMetadata } from "@/lib/services/ai/ai-service.interface"

/** Per provider: incumbent first, then the configured fallback, then the lite model. */
const DEFAULT_CANDIDATES: Record<string, string[]> = {
    gemini: [
        process.env.GEMINI_MODEL_EXTRACTION || "gemini-3.1-flash-lite",
        process.env.GEMINI_MODEL_FALLBACK || "gemini-3.5-flash",
        "gemini-3-flash-preview",
    ],
    anthropic: [
        process.env.CLAUDE_MODEL_EXTRACTION || "claude-sonnet-5",
        process.env.CLAUDE_MODEL_FALLBACK || "claude-haiku-4-5",
    ],
    openai: [process.env.OPENAI_MODEL_EXTRACTION || "gpt-4.1-mini"],
}

function arg(name: string): string | undefined {
    const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
    return hit ? hit.split("=")[1] : undefined
}

async function main() {
    const provider = (arg("provider") || "gemini") as AIServiceType
    const candidates = arg("models")?.split(",") ?? DEFAULT_CANDIDATES[provider] ?? []
    if (candidates.length === 0) {
        console.error(`No candidate models for provider "${provider}". Pass --models=a,b`)
        process.exit(1)
    }
    const policyId = process.argv.find((a) => !a.startsWith("--") && a.startsWith("c"))
    const policy = policyId
        ? await db.policy.findUnique({ where: { id: policyId }, include: { documents: true } })
        : await db.policy.findFirst({
              where: { documents: { some: {} } },
              orderBy: { createdAt: "desc" },
              include: { documents: true },
          })

    if (!policy || policy.documents.length === 0) {
        console.error("No policy with a document found. Pass a policyId.")
        process.exit(1)
    }

    const doc = policy.documents[0]
    const buffer = await downloadPolicyDocument(doc.fileUrl)
    if (!buffer) {
        console.error(`Could not download ${doc.fileUrl}`)
        process.exit(1)
    }

    const document = { data: buffer.toString("base64"), mimeType: doc.mimeType || "application/pdf" }
    const service = getAIService(provider)
    const gapDefinitions = (await db.gapDefinition.findMany({
        where: { lineOfBusiness: { equals: policy.lineOfBusiness, mode: "insensitive" }, isActive: true },
    })) as unknown as GapDefinitionForAI[]

    console.log(
        `provider ${provider} · policy ${policy.id} · ${policy.lineOfBusiness} · ${(buffer.length / 1024).toFixed(0)} KB · ${gapDefinitions.length} gap defs\n`
    )
    console.log("model".padEnd(28), "step".padEnd(12), "secs".padEnd(8), "out chars")

    for (const model of candidates) {
        const tExtract = Date.now()
        let extraction
        try {
            extraction = await service.extractPolicyData(document, { modelOverride: model })
            console.log(
                model.padEnd(28),
                "extraction".padEnd(12),
                ((Date.now() - tExtract) / 1000).toFixed(1).padEnd(8),
                JSON.stringify(extraction).length
            )
        } catch (e) {
            console.log(
                model.padEnd(28),
                "extraction".padEnd(12),
                "FAILED".padEnd(8),
                e instanceof Error ? e.message.slice(0, 70) : String(e)
            )
            continue
        }

        const metadata = {
            insurerName: extraction.insurerName,
            policyNumber: extraction.policyNumber,
            lineOfBusiness: extraction.lineOfBusiness,
            startDate: extraction.startDate,
            endDate: extraction.endDate,
            premiumAmount: extraction.premiumAmount,
            coverageSummary: extraction.coverageSummary,
        } as unknown as PolicyMetadata

        const tGaps = Date.now()
        try {
            const gaps = await service.analyzeGaps(null, metadata, gapDefinitions, {
                modelOverride: model,
                structuredContext: extraction,
            })
            console.log(
                model.padEnd(28),
                "gaps".padEnd(12),
                ((Date.now() - tGaps) / 1000).toFixed(1).padEnd(8),
                JSON.stringify(gaps).length
            )
        } catch (e) {
            console.log(
                model.padEnd(28),
                "gaps".padEnd(12),
                "FAILED".padEnd(8),
                e instanceof Error ? e.message.slice(0, 70) : String(e)
            )
        }
    }

    await db.$disconnect()
}

main().catch((e) => {
    console.error(e)
    process.exit(1)
})
