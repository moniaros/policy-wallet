import { withApiGuard } from "@/lib/api-guard"
import { createApiError } from "@/lib/api-utils"
import { db } from "@/lib/db"
import { getTranslations } from "@/lib/i18n"
import { resolveUserLanguage } from "@/lib/i18n/resolve-language"
import { NON_LIVE_POLICY_STATUSES } from "@/lib/policy-status"
import { generatePortfolioReportHtml } from "@/lib/services/reports/portfolio-report"
import { canUserUseFeature } from "@/lib/subscription-limits"

/**
 * GET /api/v1/me/portfolio-report — spec v2 §15. Printable HTML of the
 * viewer's OWN in-force policies (the browser prints it to PDF, as the
 * savings report does). Gated on the same report-export entitlement.
 */
export const GET = withApiGuard(
    {
        auth: { mode: "user" },
        rateLimit: { limit: 10, windowMs: 60 * 1000, key: ({ auth }) => `me:portfolio-report:${auth?.dbUser.id}` },
    },
    async ({ auth }) => {
        const user = auth!.dbUser
        const allowed = await canUserUseFeature(user.id, "savingsReportExport")
        if (!allowed && !user.roles?.includes("admin")) return createApiError("FORBIDDEN", "Portfolio export is available on Pro plans.", 403)
        const language = resolveUserLanguage(user.preferredLanguage)
        const copy = getTranslations(language).wallet.portfolioReport
        const policies = await db.policy.findMany({
            where: { ownerUserId: user.id, status: { notIn: [...NON_LIVE_POLICY_STATUSES] } },
            select: { id: true, insurerName: true, policyNumber: true, lineOfBusiness: true, status: true, endDate: true, premiumAmount: true, premiumCurrency: true, nickname: true, acordData: true },
            orderBy: { endDate: "asc" },
        })
        const html = generatePortfolioReportHtml(policies, language, new Date(), copy)
        return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store" } })
    }
)
