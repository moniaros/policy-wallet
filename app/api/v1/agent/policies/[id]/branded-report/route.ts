import { createApiError } from "@/lib/api-utils"
import { db } from "@/lib/db"
import { withApiGuard } from "@/lib/api-guard"
import { z } from "zod"
import { isAgentRole } from "@/lib/auth/require-agent"
import { canAgentUseFeature } from "@/lib/subscription-entitlements"
import { getGrantedPolicyIds, getLiveCustomerUserIds, isPolicyVisibleToAgent } from "@/lib/agent-visibility"
import {
    generateSavingsReportHtml,
    type AgentReportBranding,
} from "@/lib/services/reports/savings-report"
import { attemptedRuleCountOf, describeFindingsProvenance, findingsProvenanceLine, formatProvenanceDate } from "@/lib/gaps/findings-provenance"
import { describeCatalogueStaleness } from "@/lib/gaps/composition"
import { getTranslations } from "@/lib/i18n"
import { buildReportContext } from "@/lib/services/reports/report-context"
import { emit } from "@/lib/notifications/dispatch"
import { displayPersonName } from "@/lib/wallet/policy-identity"
import { logger } from "@/lib/logger"
import { resolveUserLanguage } from "@/lib/i18n/resolve-language"

const paramsSchema = z.object({ id: z.string().min(1) })

/**
 * GET /api/v1/agent/policies/:id/branded-report
 *
 * Agent-facing branded report for a CUSTOMER's policy. Mirrors the B2C
 * savings-report route, but the ownership check is replaced by a per-policy
 * VISIBILITY check: the agent may only report on policies they can already
 * see (uploaded by them, or an active policy-scoped grant) — exactly the same
 * rule `getCustomerProfile` uses to list a customer's policies. A bare
 * CustomerRelationship confers no visibility.
 *
 * Requires the agent role and the `brandedReport` entitlement (Pro+).
 */
export const GET = withApiGuard(
    {
        auth: { mode: "user" },
        validation: { params: paramsSchema },
        rateLimit: {
            limit: 10,
            windowMs: 60 * 1000,
            key: ({ auth, params }) =>
                `agent:branded-report:${auth?.dbUser.id || "anonymous"}:${params.id}`,
        },
    },
    async ({ auth, params }) => {
        const authResult = auth!
        const agentId = authResult.dbUser.id
        const { id: policyId } = params
        const isAdmin = !!authResult.dbUser.roles?.includes("admin")

        // 1. Agent role (admins allowed) — an authenticated policyholder must
        //    not be able to brand-report over someone else's book.
        if (!isAgentRole(authResult.dbUser.roles)) {
            return createApiError("FORBIDDEN", "Agent role required", 403)
        }

        // 2. Entitlement (admins bypass, like the savings-report route).
        const allowed = await canAgentUseFeature(agentId, "brandedReport")
        if (!allowed && !isAdmin) {
            return createApiError(
                "FORBIDDEN",
                "Branded reports are available on Pro plans.",
                403
            )
        }

        // 3. Load the policy (only the fields the visibility check needs).
        const policy = await db.policy.findUnique({
            where: { id: policyId },
            select: { id: true, createdByUserId: true, ownerUserId: true },
        })
        if (!policy) return createApiError("NOT_FOUND", "Policy not found", 404)

        // 4. VISIBILITY (not ownership): the whole ballgame. Same rule as the
        //    customer-profile policy list — createdByUserId OR an active grant.
        const [granted, liveCustomers] = await Promise.all([
            getGrantedPolicyIds(agentId).then((ids) => new Set(ids)),
            getLiveCustomerUserIds(agentId),
        ])
        if (!isPolicyVisibleToAgent(policy, agentId, granted, liveCustomers)) {
            return createApiError("FORBIDDEN", "Not authorized", 403)
        }

        // 5. One context, shared with the customer's own savings report, so the
        //    two documents cannot drift from each other or from the app
        //    (PW-BRIDGE-01 C-03/C-04).
        const language = resolveUserLanguage(authResult.dbUser.preferredLanguage)
        const ctx = await buildReportContext({ policyId, language })
        if (!ctx) {
            return createApiError(
                "NOT_FOUND",
                "No completed analysis found for this policy. Run an analysis first.",
                404
            )
        }

        // 6. Agent branding (from the agent's own profile) + generate.
        const profile = await db.agentProfile.findUnique({
            where: { userId: agentId },
            select: {
                agencyName: true,
                logoUrl: true,
                brandColor: true,
                website: true,
                phone: true,
            },
        })
        const branding: AgentReportBranding | undefined = profile
            ? {
                  agencyName: profile.agencyName,
                  logoUrl: profile.logoUrl,
                  brandColor: profile.brandColor,
                  website: profile.website,
                  phone: profile.phone,
              }
            : undefined

        const html = generateSavingsReportHtml(
            ctx.resultJson as Record<string, any>,
            ctx.finishedAt?.toISOString() ?? new Date().toISOString(),
            language,
            branding,
            ctx.gaps,
            ctx.provenance,
            ctx.prePlan,
            ctx.staleCatalogue,
            ctx.composition,
            ctx.recordStatus
        )

        // A document about this person's cover now exists in someone else's
        // hands — including findings that are still under review — and until now
        // their side held no record that it was ever produced (PW-BRIDGE-01
        // I-17). A read path changes nothing, so this is a trace to look back
        // on rather than an alert: in-app only, and deduped per policy per day
        // so regenerating the same report does not become a stream. Best-effort
        // — the report is already rendered and must still be returned.
        if (policy.ownerUserId && policy.ownerUserId !== agentId) {
            try {
                const day = new Date().toISOString().slice(0, 10)
                const agentName = displayPersonName(authResult.dbUser.name)
                await emit({
                    event: "branded_report_generated",
                    userId: policy.ownerUserId,
                    title: {
                        el: "Δημιουργήθηκε αναφορά για ασφαλιστήριό σας",
                        en: "A report about your policy was produced",
                    },
                    message: {
                        el: `${agentName || "Ο σύμβουλός σας"} δημιούργησε μια αναφορά με βάση τα ευρήματα αυτού του ασφαλιστηρίου.`,
                        en: `${agentName || "Your advisor"} produced a report based on this policy's findings.`,
                    },
                    relatedObjectType: "policy",
                    relatedObjectId: policyId,
                    dedupeKey: `branded_report_generated:${policyId}:${day}`,
                })
            } catch (e) {
                logger("error", "Branded-report notification failed", {
                    policyId,
                    error: e instanceof Error ? e.message : String(e),
                })
            }
        }

        return new Response(html, {
            headers: {
                "Content-Type": "text/html; charset=utf-8",
                "Content-Disposition": `inline; filename="branded-report-${policyId}.html"`,
            },
        })
    }
)
