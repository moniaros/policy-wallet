import { createApiError } from "@/lib/api-utils"
import { db } from "@/lib/db"
import { withApiGuard } from "@/lib/api-guard"
import { z } from "zod"
import { canUserUseFeature } from "@/lib/subscription-limits"
import { getPolicyAccess } from "@/lib/policy-access"
import { generateSavingsReportHtml } from "@/lib/services/reports/savings-report"
import { attemptedRuleCountOf, describeFindingsProvenance, findingsProvenanceLine, formatProvenanceDate } from "@/lib/gaps/findings-provenance"
import { getTranslations } from "@/lib/i18n"
import { readLiveGapRows } from "@/lib/gaps/gap-rows"
import { resolveUserLanguage } from "@/lib/i18n/resolve-language"

const paramsSchema = z.object({ id: z.string().min(1) })

/**
 * GET /api/v1/policies/:id/savings-report
 *
 * Generates a downloadable savings report for the policy's latest analysis.
 * Returns HTML that can be printed to PDF via the browser.
 * Requires Pro tier (savingsReportExport entitlement).
 */
export const GET = withApiGuard(
    {
        auth: { mode: "user" },
        validation: { params: paramsSchema },
        rateLimit: {
            limit: 10,
            windowMs: 60 * 1000,
            key: ({ auth, params }) =>
                `policy:savings-report:${auth?.dbUser.id || "anonymous"}:${params.id}`,
        },
    },
    async ({ auth, params }) => {
        const authResult = auth!
        const { id: policyId } = params

        // Check entitlement
        const allowed = await canUserUseFeature(authResult.dbUser.id, "savingsReportExport")
        if (!allowed && !authResult.dbUser.roles?.includes("admin")) {
            return createApiError(
                "FORBIDDEN",
                "Savings report export is available on Pro plans.",
                403
            )
        }

        // One authorization path (lib/policy-access.ts). This used to be an
        // inline owner check, which meant the advisor who ran the analysis
        // could not download its report.
        const access = await getPolicyAccess(policyId, {
            id: authResult.dbUser.id,
            roles: authResult.dbUser.roles,
        })
        if (!access.exists || !access.canRead) {
            return createApiError("NOT_FOUND", "Policy not found", 404)
        }

        // Get latest completed analysis
        const run = await db.policyAnalysisRun.findFirst({
            where: {
                policyId,
                status: { in: ["completed", "completed_with_warnings"] },
            },
            orderBy: { finishedAt: "desc" },
            select: { resultJson: true, finishedAt: true, attemptedRules: true },
        })

        if (!run?.resultJson) {
            return createApiError(
                "NOT_FOUND",
                "No completed analysis found for this policy. Run an analysis first.",
                404
            )
        }

        // The gaps the rules decided. A GapInstance row cannot exist unless a rule
        // produced it, so its presence IS the detection — there is no isDetected flag
        // to filter on, and the report must not infer findings from the AI prose bag.
        const decidedGaps = await readLiveGapRows({ scope: "disclosed",
            where: { policyId, status: "open", supersededAt: null },
            select: { severity: true, analysisRunId: true, analysisRun: { select: { finishedAt: true } }, definition: { select: { slug: true } } },
        })

        // B0.3: the report names the run its findings came from and states a
        // failed latest attempt — the prose run and the rows' run can differ.
        const language = resolveUserLanguage(authResult.dbUser.preferredLanguage)
        const latestAttempt = await db.policyAnalysisRun.findFirst({
            where: { policyId },
            orderBy: { createdAt: "desc" },
            select: { id: true, status: true, finishedAt: true, createdAt: true, attemptedRules: true },
        })
        const provenance = findingsProvenanceLine(
            describeFindingsProvenance(
                decidedGaps.map((g) => ({ analysisRunId: g.analysisRunId, runFinishedAt: g.analysisRun?.finishedAt ?? null })),
                latestAttempt ? { ...latestAttempt, attemptedRuleCount: attemptedRuleCountOf(latestAttempt.attemptedRules) } : null,
                { id: "prose-run", status: "completed", finishedAt: run.finishedAt }
            ),
            getTranslations(language).gapProvenance,
            language
        )

        // V3: a completed run that predates the catalogue plan cannot state what it checked.
        const prePlan = Array.isArray((run.attemptedRules as { slugs?: unknown } | null)?.slugs)
            ? null
            : { dateLabel: formatProvenanceDate(run.finishedAt ?? null, language) }
        const html = generateSavingsReportHtml(
            run.resultJson as Record<string, any>,
            run.finishedAt?.toISOString() ?? new Date().toISOString(),
            language,
            undefined,
            decidedGaps.map((g) => ({ slug: g.definition.slug, severity: g.severity })),
            provenance,
            prePlan
        )

        return new Response(html, {
            headers: {
                "Content-Type": "text/html; charset=utf-8",
                "Content-Disposition": `inline; filename="savings-report-${policyId}.html"`,
            },
        })
    }
)
