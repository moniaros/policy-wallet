"use server"

/**
 * Server actions behind the `askAgent` buttons on the policy detail page.
 *
 * Until now those rendered as plain links to /agent — the user arrived at an
 * inbox with no idea what they had just asked for, and the advisor got nothing.
 * `startBranchActionThread` turns the click into a real collaboration thread
 * carrying the question the label promised.
 */

import { revalidatePath } from "next/cache"

import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { resolvePolicyAdvisors } from "@/lib/agent-visibility"
import { getAgentRequest } from "@/lib/insurance/content/agent-requests"
import { collaborationService } from "@/lib/services/collaboration.service"
import { resolveUserEntitlements } from "@/lib/subscription-entitlements"
import { displayPersonName } from "@/lib/wallet/policy-identity"

type StartThreadResult =
    | { success: true; threadId: string }
    | { error: "Unauthorized" | "Policy not found" | "UPGRADE_REQUIRED" | "NO_AGENT" | "THREAD_FAILED" }

/**
 * Open (or reuse) the advisor thread for one branch action.
 *
 * The error strings are deliberately identical to `notifyAgentAboutGap`'s so
 * the client can share a single handler — notably `UPGRADE_REQUIRED`, which
 * the page turns into the UpgradeModal rather than a dead end.
 *
 * @param policyId the policy the action was clicked from
 * @param actionId a `BranchAction.id` with `ctaType: 'askAgent'`
 */
export async function startBranchActionThread(policyId: string, actionId: string): Promise<StartThreadResult> {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { error: "Unauthorized" }

    // Ownership, or an explicit active grant on this specific policy.
    const policy = await db.policy.findUnique({ where: { id: policyId } })
    if (!policy) return { error: "Policy not found" }
    if (policy.ownerUserId !== authResult.dbUser.id) {
        const hasAccess = await db.accessGrant.findFirst({
            where: {
                granterUserId: policy.ownerUserId,
                granteeUserId: authResult.dbUser.id,
                scope: `policy:${policy.id}`,
                status: "active",
            },
        })
        if (!hasAccess) return { error: "Unauthorized" }
    }

    // Agent collaboration is a paid-plan feature. Admins are exempt — and note
    // that `resolveUserEntitlements` resolves *B2C* tiers, so this must stay a
    // roles-aware check (the D3 trap: a naive gate locks staff out).
    const entitlements = await resolveUserEntitlements(authResult.dbUser.id)
    if (!entitlements.limits.agentCollaboration && !authResult.dbUser.roles.includes("admin")) {
        return { error: "UPGRADE_REQUIRED" }
    }

    // The advisors who can already SEE this policy, in the owner's book. The
    // old lookup was `findFirst({ policyholderUserId: caller, status: "active" })`,
    // which picked an arbitrary advisor for a customer with more than one, shut
    // out an advisor whose relationship the customer had not yet accepted, and
    // — on the grant-holder branch above — resolved the CALLER's own agent
    // rather than the policy owner's (PW-BRIDGE-01 D-03/D-04).
    const advisors = await resolvePolicyAdvisors(policy)
    const relationship =
        advisors.find((candidate) => candidate.agentUserId === authResult.dbUser.id) ?? advisors[0]
    if (!relationship) return { error: "NO_AGENT" }

    const spec = getAgentRequest(actionId)
    const askerName = displayPersonName(authResult.dbUser.name) || "Policyholder"

    // Greek, not the clicker's UI language: this text is read by the ADVISOR,
    // whose locale we do not know here and who is Greek-market by definition.
    // Picking the customer's language would hand a Greek broker English copy
    // whenever the customer happened to have the EN toggle on.

    // `ensureAutomationThread` creates the thread AND its first message, and —
    // the reason we call it rather than POSTing to the collaboration API — it
    // reuses any OPEN thread in the same category. Someone mashing the button
    // gets one thread, not one per click, so the advisor's inbox survives.
    let thread
    try {
        thread = await collaborationService.ensureAutomationThread(authResult.dbUser.id, {
            relationshipId: relationship.relationshipId,
            policyId,
            subject: spec.subject.el,
            category: spec.category,
            priority: spec.priority,
            initialMessage: `${askerName}: ${spec.message.el}`,
        })
    } catch (error) {
        console.error("[startBranchActionThread] failed to open thread", { policyId, actionId, error })
        return { error: "THREAD_FAILED" }
    }

    // null = the acceptance gate skipped thread creation. This flow is
    // policyholder-initiated so the gate never applies to it, but the type
    // is honest about the possibility.
    if (!thread) {
        return { error: "THREAD_FAILED" }
    }

    revalidatePath("/wallet")
    revalidatePath(`/wallet/${policyId}`)
    return { success: true, threadId: thread.id }
}
