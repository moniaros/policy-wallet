/** Explicit dev-only, owner-authorized two-document benchmark. Never runs from a page read. */
import { config } from 'dotenv'
config({ path: '.env.local', quiet: true })
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'

async function main() {
    const [directory, email] = process.argv.slice(2)
    if (!directory || !email) throw new Error('Pass the private PDF directory and consented demo account email')
    if (!new URL(process.env.DIRECT_URL || '').username.includes('lzqvtvjggylcujenlelh')) throw new Error('Development database only')
    process.env.PREVENTION_HUB_ENABLED = '1'
    process.env.PREVENTION_PERSONALIZATION_ENABLED = '1'
    process.env.EXTRACTION_CITATIONS = '1'
    // A configured second provider remains subject to the existing authorization/canary and quota gates.
    if (process.argv[4] === "openai") process.env.AGENT_VERIFICATION_PROVIDER = "openai"
    const { db } = await import('../lib/db')
    const { ingestPolicyDocument } = await import('../lib/ingestion/ingest-policy-document')
    const { PolicyAnalysisOrchestratorService } = await import('../lib/services/analysis/policy-analysis-orchestrator.service')
    const user = await db.user.findUniqueOrThrow({ where: { email }, select: { id: true, aiProcessingConsentVersion: true } })
    if (!user.aiProcessingConsentVersion) throw new Error('Existing AI processing consent required')
    const started = new Date()
    let policyId: string | undefined
    const samples = []
    for (const [name, kind] of [['LIFE_POLICY.pdf','policy_schedule'],['LIFE_POLICY_RENEWAL.pdf','renewal_notice']] as const) {
        const bytes = readFileSync(path.join(directory, name))
        const sha256 = createHash('sha256').update(bytes).digest('hex')
        const existing = await db.policyDocument.findFirst({ where: { documentHash: sha256, policy: { ownerUserId: user.id, status: { not: 'deleted' } } }, select: { id: true, policyId: true } })
        if (existing) {
            if (policyId && policyId !== existing.policyId) throw new Error('Existing documents need explicit same-policy reconciliation')
            policyId = existing.policyId; samples.push({ sha256, kind, reused: true }); continue
        }
        const result = await ingestPolicyDocument({ actorUserId: user.id, ownerUserId: user.id,
            file: new File([bytes], name, { type: 'application/pdf' }), surface: policyId ? 'renewal' : 'wallet_add',
            mode: policyId ? 'attachment' : 'policy', existingPolicyId: policyId, declaredBranch: 'health', declaredBranchSource: policyId ? 'policy' : 'user',
            documentKind: kind, trustDeclaredKind: true, policyStatus: 'analyzing', processingStatus: 'processing' })
        if (!result.ok) throw new Error(`Intake blocked: ${result.code}`)
        policyId = result.policyId; samples.push({ sha256, kind, reused: false })
    }
    const result = await new PolicyAnalysisOrchestratorService().extractBasicSummary(policyId!, user.id)
    const policy = await db.policy.findUniqueOrThrow({ where: { id: policyId }, select: { acordData: true } })
    const composition = (policy.acordData as any)?.extraction?.benefitComposition
    const usage = await db.tokenUsage.findMany({ where: { userId: user.id, createdAt: { gte: started } }, select: { operationType: true, inputTokens: true, outputTokens: true, costEur: true, model: true } })
    // Full extraction stays private, out of the repository and report.
    writeFileSync('/tmp/pw-prevention-live-private.json', JSON.stringify({ policyId, acordData: policy.acordData }, null, 2), { mode: 0o600 })
    const report = { at: started.toISOString(), elapsedMs: Date.now() - started.getTime(), result, samples,
        issues: composition?.issues ?? [], period: composition?.period ?? null,
        benefitCodes: composition?.benefits?.map((b: any) => b.perk.rules?.code ?? 'unclassified') ?? [],
        documents: composition?.documents?.map(({ id, ...d }: any) => d) ?? [],
        usage: usage.map(u => ({ ...u, costEur: Number(u.costEur) })),
        note: 'Actual provider execution; manual reference evaluation is recorded separately. Tokens are metered provider usage; cost uses configured prices, not an invoice.' }
    writeFileSync('docs/evidence/prevention-hub/live-pair-results.json', JSON.stringify(report, null, 2) + '\n')
    console.log(JSON.stringify({ result, elapsedMs: report.elapsedMs, issues: report.issues, benefitCodes: report.benefitCodes, calls: usage.length }))
    await db.$disconnect()
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'benchmark_failed'); process.exitCode = 1 })
