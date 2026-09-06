export const runtime = "nodejs"

import Link from "next/link"
import { notFound } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { CollaborationTimeline } from "@/components/collaboration/CollaborationTimeline"
import { ThreadActionPanel } from "@/components/collaboration/ThreadActionPanel"
import { collaborationService } from "@/lib/services/collaboration.service"
import type { DocumentRequestData, ProposalData } from "@/components/collaboration/types"

import { getTranslations } from "@/lib/i18n"
import { displayPersonName } from "@/lib/wallet/policy-identity"
import { AiDisclaimer } from "@/components/ui/AiDisclaimer"
import { resolveUserLanguage } from "@/lib/i18n/resolve-language"
export default async function CollaborationThreadPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const { dbUser } = await getAuthenticatedUser()

    const thread = await collaborationService.getThreadDetail(dbUser.id, dbUser.roles, id)
    const t =getTranslations(resolveUserLanguage(dbUser.preferredLanguage))
    if (!thread) notFound()

    const viewerRole =
        thread.relationship.agentUserId === dbUser.id
            ? "agent"
            : thread.relationship.policyholderUserId === dbUser.id
                ? "policyholder"
                : "agent"

    // The doc-request/proposal notifications deep-link here; render the actionable
    // card so the customer can upload/accept without hunting for the My-Agent tabs.
    const [docReq, prop, agent] = await Promise.all([
        db.documentRequest.findFirst({ where: { threadId: id } }),
        db.proposal.findFirst({ where: { threadId: id } }),
        db.user.findUnique({
            where: { id: thread.relationship.agentUserId },
            select: { name: true, email: true, agentProfile: { select: { licenseNumber: true } } },
        }),
    ])

    const documentRequest: DocumentRequestData | null = docReq
        ? {
            id: docReq.id,
            threadId: docReq.threadId,
            relationshipId: docReq.relationshipId,
            requestedByUserId: docReq.requestedByUserId,
            documentType: docReq.documentType,
            instruction: docReq.instruction,
            urgency: docReq.urgency as DocumentRequestData["urgency"],
            status: docReq.status as DocumentRequestData["status"],
            dueDate: docReq.dueDate?.toISOString() ?? null,
            completedAt: docReq.completedAt?.toISOString() ?? null,
            uploadedDocumentUrl: docReq.uploadedDocumentUrl,
            createdAt: docReq.createdAt.toISOString(),
        }
        : null

    const proposal: ProposalData | null = prop
        ? {
            id: prop.id,
            threadId: prop.threadId,
            relationshipId: prop.relationshipId,
            createdByUserId: prop.createdByUserId,
            proposalType: prop.proposalType as ProposalData["proposalType"],
            insurerName: prop.insurerName,
            lineOfBusiness: prop.lineOfBusiness,
            premiumAmount: Number(prop.premiumAmount),
            premiumCurrency: prop.premiumCurrency,
            coverageSummary: prop.coverageSummary,
            comparisonData: (prop.comparisonData as Record<string, unknown> | null) ?? null,
            plainLanguageSummary: prop.plainLanguageSummary,
            status: prop.status as ProposalData["status"],
            clientResponseAt: prop.clientResponseAt?.toISOString() ?? null,
            eSignatureUrl: prop.eSignatureUrl,
            createdAt: prop.createdAt.toISOString(),
        }
        : null

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* H-006/H-007: Proposal threads carry AI-written explanation text alongside a human adviser's own words. Which is which matters more here than anywhere. */}
        <AiDisclaimer variant="inline" />
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                        Collaboration
                    </p>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                        {thread.subject}
                    </h1>
                </div>
                <Link
                    href="/notifications"
                    className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                    {t.notifications.backToNotifications}
                </Link>
            </div>

            <ThreadActionPanel
                documentRequest={documentRequest}
                proposal={proposal}
                viewerRole={viewerRole}
                agentName={displayPersonName(agent?.name) || agent?.email || ""}
                licenseNumber={agent?.agentProfile?.licenseNumber}
            />

            <CollaborationTimeline
                policyId={thread.policyId || undefined}
                relationshipId={thread.relationshipId}
                viewerRole={viewerRole}
                initialThreadId={thread.id}
            />
        </div>
    )
}
