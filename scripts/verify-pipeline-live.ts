/**
 * Live pipeline verification: run the REAL orchestrator on a REAL policy PDF
 * against a REAL database, and assert what the flow promises.
 *
 * Written during the 2026-08 verification session, where it caught a real bug
 * (the post-analysis score refresh was a dangling promise) and proved the
 * free-tier gate, provider honesty, versioned extraction cache, and all three
 * legs of the finalize gap union (ai_check + clarity + DSL) live. Persisted so
 * the remaining verification — extraction QUALITY with a real provider key —
 * is one command the moment a key exists:
 *
 *   ./scripts/dev-postgres.sh start
 *   export DATABASE_URL="$(./scripts/dev-postgres.sh url)" DIRECT_URL="$DATABASE_URL"
 *   npx prisma db push && npx prisma db seed
 *   GEMINI_API_KEY=...            npx tsx scripts/verify-pipeline-live.ts <policy.pdf>
 *   # or ANTHROPIC_API_KEY=...    (provider picked per lib/services/ai factory order)
 *   # or AI_SERVICE_TYPE=mock AI_ALLOW_MOCK=1   for the flow-only run
 *
 * Reads .env.local if present (without overriding already-set variables).
 * Serves the PDF over a loopback HTTP server so the document travels through
 * the real downloadPolicyDocument path. REFUSES to run against a non-local
 * database: it creates users, subscriptions and policies.
 */
import { createServer } from "node:http"
import { readFileSync, existsSync } from "node:fs"
import path from "node:path"

function loadEnvLocal() {
    const envPath = path.join(process.cwd(), ".env.local")
    if (!existsSync(envPath)) return
    for (const line of readFileSync(envPath, "utf-8").split("\n")) {
        const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"#]*)"?\s*$/)
        if (match && process.env[match[1]] === undefined) {
            process.env[match[1]] = match[2].trim()
        }
    }
}
loadEnvLocal()

const dbUrl = process.env.DATABASE_URL || ""
if (!/127\.0\.0\.1|localhost/.test(dbUrl)) {
    console.error(
        "verify-pipeline-live: DATABASE_URL is not local — refusing.\n" +
        "This harness creates users, subscriptions and policies; point it at\n" +
        "./scripts/dev-postgres.sh, never at a shared environment."
    )
    process.exit(1)
}

async function main() {
    // Imported AFTER the env is assembled — lib/env validates at import time.
    const { db } = await import("@/lib/db")
    const { PolicyAnalysisOrchestratorService } = await import(
        "@/lib/services/analysis/policy-analysis-orchestrator.service"
    )
    const { getActiveAIProvider } = await import("@/lib/services/ai/ai-service.factory")

    const pdfPath = process.argv[2]
    if (!pdfPath || !existsSync(pdfPath)) {
        console.error("usage: npx tsx scripts/verify-pipeline-live.ts <policy.pdf>")
        process.exit(1)
    }
    const pdf = readFileSync(pdfPath)

    const server = createServer((_req, res) => {
        res.writeHead(200, { "content-type": "application/pdf", "content-length": pdf.length })
        res.end(pdf)
    })
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
    const address = server.address()
    const port = typeof address === "object" && address ? address.port : 0
    const fileUrl = `http://127.0.0.1:${port}/${path.basename(pdfPath)}`
    console.log("serving document at", fileUrl)

    const problems: string[] = []
    try {
        const user = await db.user.upsert({
            where: { email: "pipeline-harness@example.com" },
            update: { aiProcessingConsentVersion: "v1" },
            create: {
                email: "pipeline-harness@example.com",
                name: "Pipeline Harness",
                roles: "policyholder",
                preferredLanguage: "el",
                aiProcessingConsentVersion: "v1",
            },
        })
        // Free tier correctly BLOCKS full analysis (verified live); the
        // harness user needs a paid plan for the pipeline itself to run.
        if (!(await db.subscription.findFirst({ where: { userId: user.id } }))) {
            await db.subscription.create({
                data: {
                    userId: user.id,
                    planId: "ph-pro",
                    status: "active",
                    currentPeriodStart: new Date(),
                    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 3600 * 1000),
                },
            })
        }

        // A fresh policy per invocation: re-runs of the same document are a
        // separate scenario (extraction-cache hit) best exercised explicitly.
        const policy = await db.policy.create({
            data: {
                ownerUserId: user.id,
                createdByUserId: user.id,
                policyNumber: `HARNESS-${path.basename(pdfPath).slice(0, 24)}`,
                insurerName: "unknown",
                lineOfBusiness: "other",
                startDate: new Date(),
                endDate: new Date(Date.now() + 365 * 24 * 3600 * 1000),
                status: "processing",
            },
        })
        await db.policyDocument.create({
            data: {
                policyId: policy.id,
                fileUrl,
                fileName: path.basename(pdfPath),
                fileSize: pdf.length,
                source: "upload",
                uploadedByUserId: user.id,
            },
        })

        console.log("provider:", getActiveAIProvider())
        const orchestrator = new PolicyAnalysisOrchestratorService()
        const created = await orchestrator.createRun(policy.id, user.id)
        const runId: string = (created as { id?: string; runId?: string }).runId ??
            (created as { id?: string }).id ?? ""
        if (!runId) throw new Error(`createRun returned no run id: ${JSON.stringify(created)}`)
        console.log("run:", runId, "status:", (created as { status?: string }).status)

        const t0 = Date.now()
        await orchestrator.executeRun(runId, "el")
        console.log("executeRun:", Date.now() - t0, "ms")

        const run = await db.policyAnalysisRun.findUnique({ where: { id: runId } })
        const fresh = await db.policy.findUnique({ where: { id: policy.id } })
        const doc = await db.policyDocument.findFirst({ where: { policyId: policy.id } })
        const cache = (doc?.extractionCache ?? null) as { __extractorVersion?: number } | null
        const instances = await db.gapInstance.findMany({
            where: { policyId: policy.id },
            include: { definition: { select: { slug: true, ruleId: true } } },
        })
        const score = await db.protectionScore.findUnique({ where: { userId: user.id } })
        const scoreEnvelope = (score?.categoryScores ?? null) as {
            __scoreModelVersion?: number
        } | null

        console.log("\n━━━ extraction result (judge this against the document) ━━━")
        console.log("  insurer:      ", fresh?.insurerName)
        console.log("  policyNumber: ", fresh?.policyNumber)
        console.log("  lineOfBusiness:", fresh?.lineOfBusiness)
        console.log("  period:       ", fresh?.startDate?.toISOString().slice(0, 10), "→",
            fresh?.endDate?.toISOString().slice(0, 10))
        console.log("  premium:      ", String(fresh?.premiumAmount))
        console.log("  summary:      ", String(fresh?.coverageSummary).slice(0, 160))
        console.log("  gaps:         ", instances.map((i) => `${i.definition.slug}(${i.definition.ruleId})`).join(", ") || "none")

        console.log("\n━━━ flow assertions ━━━")
        if (run?.status !== "completed" && run?.status !== "completed_with_warnings")
            problems.push(`run.status=${run?.status}`)
        if (run?.provider !== getActiveAIProvider()) problems.push("run.provider does not record the active provider")
        if (doc?.processingStatus !== "completed") problems.push("document not marked completed")
        if (!cache || cache.__extractorVersion === undefined) problems.push("extraction cache not versioned")
        if (!score) problems.push("protection score missing — the awaited refresh did not run")
        else if (scoreEnvelope?.__scoreModelVersion !== 2) problems.push("score envelope not v2")
        if (fresh?.status !== "active") problems.push(`policy.status=${fresh?.status}, expected active`)
    } finally {
        server.close()
        const { db } = await import("@/lib/db")
        await db.$disconnect()
    }

    if (problems.length > 0) {
        console.log("❌ FAILED:")
        for (const p of problems) console.log("  -", p)
        process.exitCode = 1
    } else {
        console.log("✅ flow assertions passed")
        console.log(
            "Extraction QUALITY is yours to judge from the block above — the harness" +
            " cannot know what the document says."
        )
    }
}

main().catch((err) => {
    console.error("HARNESS FAILURE:", err)
    process.exitCode = 1
})
