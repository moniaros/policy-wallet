import { db } from "@/lib/db"
import { createApiResponse, createApiError } from "@/lib/api-utils"
import { detectGapsForPolicy, createGapInstances } from "@/lib/gap-detection"
import { sendNotification } from "@/lib/notifications"
import { rateLimit } from "@/lib/rate-limit"
import { logger } from "@/lib/logger"
import { requireApiUser } from "@/lib/api-auth"
import { z } from "zod"

const processPolicySchema = z.object({
    policyId: z.string().min(1, "Policy ID is required"),
})

export async function POST(req: Request) {
    const authCheck = await requireApiUser()
    if ("error" in authCheck) return authCheck.error
    const authResult = authCheck.auth

    // Rate limiting: max 5 policy analysis requests per minute per user.
    // The bare-IP key shared proxy.ts's global bucket, so browsing the site
    // could 429 the analysis trigger; keying on the authenticated user also
    // survives NAT'd offices sharing one IP.
    const limitCheck = await rateLimit(authResult.dbUser.id, 5, 60000, `process-policy:${authResult.dbUser.id}`)
    if (!limitCheck.success) return limitCheck.error!

    try {
        // Pre-flight: reap stale runs whose serverless lease timed out — they
        // would block this user's new attempt via the in-flight guard below.
        // Uses the orchestrator's reaper (NOT an inline updateMany) so the
        // policy and documents are reset too; the old inline version failed
        // only the run and left the policy stuck 'analyzing' forever. The
        // short grace protects a lease mid-handover to a QStash redelivery.
        try {
            const { PolicyAnalysisOrchestratorService } = await import(
                "@/lib/services/analysis/policy-analysis-orchestrator.service"
            )
            const preflight = await new PolicyAnalysisOrchestratorService().reapStaleRuns({
                graceMs: 2 * 60 * 1000,
                limit: 25,
            })
            if (preflight.reaped > 0) {
                logger("warn", "Reaped stale analysis runs in pre-flight", {
                    reaped: preflight.reaped,
                })
            }
        } catch (reapError) {
            // Best-effort: a reaper hiccup must not block a fresh analysis.
            logger("warn", "Pre-flight stale-run reap failed", {
                error: reapError instanceof Error ? reapError.message : String(reapError),
            })
        }

        const { policyId } = processPolicySchema.parse(await req.json())

        // Ensure user owns the policy
        const policy = await db.policy.findUnique({
            where: { id: policyId }
        })

        if (!policy || policy.ownerUserId !== authResult.dbUser.id) {
            return createApiError("FORBIDDEN", "Access denied", 403)
        }

        // M3: Idempotency guard — skip if an analysis is already in-flight for this policy
        const inFlight = await db.policyAnalysisRun.findFirst({
            where: { policyId, status: "running" },
            select: { id: true },
        })
        if (inFlight) {
            logger("info", "process-policy skipped — analysis already running", {
                policyId,
                runId: inFlight.id,
            })
            return createApiResponse({ processed: false, reason: "analysis_already_running" })
        }

        // 1. Process Gaps
        const newGaps = await detectGapsForPolicy(policy)
        await createGapInstances(newGaps)

        // 2. Notify the owner about the findings that warrant it.
        //
        // Three things were wrong with the message this sent. It was headed
        // "Security Alert", which belongs on a breach notice, not on a finding
        // about someone's cover. It called the set "critical gaps" while the
        // filter also admits `high` ones — so a policy with two high-severity
        // findings was reported as having two critical ones. And it was English
        // only, in a Greek-default product, with a fixed plural that read
        // "1 critical gaps".
        const seriousGaps = newGaps.filter(g => g.severity === 'critical' || g.severity === 'high')
        if (seriousGaps.length > 0) {
            const isEl = (authResult.dbUser.preferredLanguage ?? 'el') !== 'en'
            const n = seriousGaps.length
            const findings = isEl
                ? `${n} ${n === 1 ? 'σημαντικό εύρημα' : 'σημαντικά ευρήματα'}`
                : `${n} significant ${n === 1 ? 'finding' : 'findings'}`
            await sendNotification({
                userId: authResult.dbUser.id,
                eventType: 'GAP_DETECTED',
                title: isEl ? 'Εντοπίστηκε πιθανό κενό κάλυψης' : 'Possible coverage gap found',
                message: isEl
                    ? `Η ανάλυση εντόπισε ${findings} στο ασφαλιστήριο ${policy.insurerName}.`
                    : `The analysis found ${findings} in your ${policy.insurerName} policy.`,
                relatedObjectType: 'policy',
                relatedObjectId: policy.id,
                channels: ['email', 'push']
            })
        }

        return createApiResponse({
            processed: true,
            gaps_found: newGaps.length,
            critical_gaps: seriousGaps.length
        })

    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return createApiError("VALIDATION_ERROR", "Invalid process policy payload", 400, error.issues)
        }
        logger('error', 'Policy Processing Error', { error })
        return createApiError("INTERNAL_ERROR", "Failed to process policy intelligence", 500)
    }
}
