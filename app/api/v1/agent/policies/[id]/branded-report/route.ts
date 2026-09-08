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
import { readLiveGapRows } from "@/lib/gaps/gap-rows"
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

        // 5. Latest completed analysis for this policy.
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

        // Rule-decided gaps only — see the savings-report route for why the AI
        // prose in resultJson cannot stand in for a detection list.
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
        // Goal 4: checks added after this run — the findings stand, dated; a new analysis would include them.
        const staleness = describeCatalogueStaleness(run.attemptedRules, formatProvenanceDate(run.finishedAt ?? null, language))
        const staleCatalogue = staleness ? { dateLabel: staleness.runDateLabel } : null
        const html = generateSavingsReportHtml(
            run.resultJson as Record<string, any>,
            run.finishedAt?.toISOString() ?? new Date().toISOString(),
            language,
            branding,
            decidedGaps.map((g) => ({ slug: g.definition.slug, severity: g.severity })),
            provenance,
            prePlan,
            staleCatalogue
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
