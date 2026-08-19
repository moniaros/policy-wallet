import { createApiError } from "@/lib/api-utils"
import { db } from "@/lib/db"
import { withApiGuard } from "@/lib/api-guard"
import { z } from "zod"
import { canUserUseFeature } from "@/lib/subscription-limits"
import { getPolicyAccess } from "@/lib/policy-access"
import { generateSavingsReportHtml } from "@/lib/services/reports/savings-report"

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
            select: { resultJson: true, finishedAt: true },
        })

        if (!run?.resultJson) {
            return createApiError(
                "NOT_FOUND",
                "No completed analysis found for this policy. Run an analysis first.",
                404
            )
        }

        const html = generateSavingsReportHtml(
            run.resultJson as Record<string, any>,
            run.finishedAt?.toISOString() ?? new Date().toISOString(),
            (authResult.dbUser.preferredLanguage as "en" | "el") || "en"
        )

        return new Response(html, {
            headers: {
                "Content-Type": "text/html; charset=utf-8",
                "Content-Disposition": `inline; filename="savings-report-${policyId}.html"`,
            },
        })
    }
)
