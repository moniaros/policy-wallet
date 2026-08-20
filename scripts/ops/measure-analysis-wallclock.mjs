/**
 * R5 — measure one real analysis end to end, so `maxDuration` is sized from a
 * number instead of a projection.
 *
 * Production has never run an analysis. The only real datapoint (258s run-span,
 * 2026-08-14) predates the boundary/caching optimisation, and ~205s was a
 * PROJECTION. A projection is not a measurement, and maxDuration is a hard kill
 * at the platform edge — undersize it and the run dies mid-pipeline with the
 * policy stuck 'analyzing'.
 *
 * Usage: npx tsx scripts/ops/measure-analysis-wallclock.mjs <policyId>
 */
import 'dotenv/config'

const policyId = process.argv[2]
if (!policyId) throw new Error('usage: measure-analysis-wallclock.mjs <policyId>')

const { db } = await import('../../lib/db.ts')
const { PolicyAnalysisOrchestratorService } = await import(
    '../../lib/services/analysis/policy-analysis-orchestrator.service.ts'
)

const policy = await db.policy.findUnique({
    where: { id: policyId },
    select: { id: true, ownerUserId: true, policyNumber: true, status: true },
})
if (!policy) throw new Error(`policy ${policyId} not found`)

console.log(`policy ${policy.policyNumber} (status=${policy.status}) owner=${policy.ownerUserId}`)

const orchestrator = new PolicyAnalysisOrchestratorService()
const t0 = Date.now()
let runId = null

try {
    const run = await orchestrator.createAndExecuteRun(policy.id, policy.ownerUserId, 'el')
    runId = run?.id ?? run?.analysisRunId ?? null
    console.log('run finished, status =', run?.status)
} catch (error) {
    console.error('run threw:', error?.message ?? error)
}

const clientSeconds = Math.round((Date.now() - t0) / 1000)
console.log(`client-observed wall clock: ${clientSeconds}s`)

// The authoritative number is the DB's, not the client's.
const rows = await db.$queryRawUnsafe(`
    SELECT analysis_run_id, status, provider, model,
           EXTRACT(EPOCH FROM (finished_at - started_at))::int AS run_span_seconds,
           actual_total_tokens, overall_success_pct
    FROM policy_analysis_runs
    WHERE policy_id = $1
    ORDER BY created_at DESC LIMIT 1`, policy.id)
console.log('DB run row:', JSON.stringify(rows[0], null, 2))

if (rows[0]) {
    const steps = await db.$queryRawUnsafe(`
        SELECT step_key, status,
               EXTRACT(EPOCH FROM (finished_at - started_at))::numeric(10,1) AS seconds
        FROM policy_analysis_steps
        WHERE analysis_run_id = $1
        ORDER BY step_order`, rows[0].analysis_run_id)
    console.log('\nper-step:')
    for (const s of steps) console.log(`  ${String(s.step_key).padEnd(32)} ${String(s.status).padEnd(12)} ${s.seconds}s`)
}

await db.$disconnect()
