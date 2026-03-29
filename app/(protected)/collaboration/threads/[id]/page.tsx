export const runtime = "nodejs"

import Link from "next/link"
import { notFound } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { CollaborationTimeline } from "@/components/collaboration/CollaborationTimeline"
import { collaborationService } from "@/lib/services/collaboration.service"

export default async function CollaborationThreadPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const { dbUser } = await getAuthenticatedUser()

    const thread = await collaborationService.getThreadDetail(dbUser.id, dbUser.roles, id)
    if (!thread) notFound()

    const viewerRole =
        thread.relationship.agentUserId === dbUser.id
            ? "agent"
            : thread.relationship.policyholderUserId === dbUser.id
                ? "policyholder"
                : "agent"

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
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
                    Back to notifications
                </Link>
            </div>

            <CollaborationTimeline
                policyId={thread.policyId || undefined}
                relationshipId={thread.relationshipId}
                viewerRole={viewerRole}
                initialThreadId={thread.id}
            />
        </div>
    )
}
