"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import { buildUserDataExportPayload } from "@/lib/services/compliance.service"
import { getBillingReconciliationSnapshot } from "@/lib/services/billing/reconciliation.service"
import { getLaunchReadinessSnapshot } from "@/lib/services/ops/launch-readiness.service"
import * as Sentry from "@sentry/nextjs"
import { eraseUserData, isAnonymizedEmail } from "@/lib/services/gdpr-erasure.service"
import {
    getDeletionApprovedEmail,
    getDeletionRejectedEmail,
    getDeletionCompletedEmail,
    getDataExportReadyEmail,
} from "@/lib/email/templates/dsr-emails"
import { getSiteOrigin } from "@/lib/seo/site"

const EXPORT_DOWNLOAD_TTL_MS = 7 * 24 * 60 * 60 * 1000
const OPEN_DELETION_STATUSES = ["requested", "in_review", "approved", "processing"] as const

// verifyAdminRole + logAdminAction moved to lib/admin/admin-guard.ts (shared
// with the /admin/plans and /admin/partners action files).
import { logAdminAction, verifyAdminRole } from "@/lib/admin/admin-guard"

/**
 * DASHBOARD METRICS
 */
export async function getDashboardMetrics() {
    const admin = await verifyAdminRole()

    try {
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const [
            totalUsers,
            policyholderCount,
            agentCount,
            adminCount,
            totalPolicies,
            activePolicies,
            pendingAgents,
            activeSubscriptions,
            subscriptions,
            newUsersLast30Days,
            newPoliciesLast30Days,
            totalGaps,
            openGaps,
            pendingDataExports,
            openDeletionRequests,
            approvedDeletionRequests,
        ] = await Promise.all([
            db.user.count(),
            db.user.count({ where: { roles: { contains: "policyholder" } } }),
            db.user.count({ where: { roles: { contains: "agent" } } }),
            db.user.count({ where: { roles: { contains: "admin" } } }),
            db.policy.count(),
            db.policy.count({ where: { status: "active" } }),
            db.agentProfile.count({ where: { verificationStatus: "pending" } }),
            db.subscription.count({ where: { status: "active" } }),
            db.subscription.findMany({
                where: { status: "active" },
                include: { plan: true }
            }),
            db.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
            db.policy.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
            db.gapInstance.count(),
            db.gapInstance.count({ where: { status: "open" } }),
            db.dataExportRequest.count({ where: { status: { in: ["requested", "processing", "failed"] } } }),
            db.deletionRequest.count({ where: { status: { in: [...OPEN_DELETION_STATUSES] } } }),
            db.deletionRequest.count({ where: { status: "approved" } }),
        ])

        const mrr = subscriptions.reduce((total, sub) => {
            const planPrice = Number(sub.plan.price)
            return total + (sub.plan.billingPeriod === "monthly" ? planPrice : planPrice / 12)
        }, 0)

        // Conversion funnel (30d) from the server-side conv_* event mirror —
        // measurable even with client analytics blocked.
        const [
            activatedNewUsers,
            trialUsedLast30Days,
            limitHitsLast30Days,
            checkoutStartedEvents,
            checkoutCompletedLast30Days,
            checkoutAbandonedLast30Days,
        ] = await Promise.all([
            db.user.count({
                where: { createdAt: { gte: thirtyDaysAgo }, policiesOwned: { some: {} } },
            }),
            db.user.count({ where: { trialAnalysisUsedAt: { gte: thirtyDaysAgo } } }),
            db.notificationEvent.count({
                where: { eventType: "conv_limit_hit", createdAt: { gte: thirtyDaysAgo } },
            }),
            db.notificationEvent.findMany({
                where: { eventType: "conv_checkout_started", createdAt: { gte: thirtyDaysAgo } },
                select: { relatedObjectType: true },
            }),
            db.notificationEvent.count({
                where: { eventType: "conv_checkout_completed", createdAt: { gte: thirtyDaysAgo } },
            }),
            // Stripe expires abandoned sessions (~24h) — the drop-off step.
            db.notificationEvent.count({
                where: { eventType: "conv_checkout_cancelled", createdAt: { gte: thirtyDaysAgo } },
            }),
        ])

        const triggerSourceBreakdown: Record<string, number> = {}
        for (const event of checkoutStartedEvents) {
            const source = event.relatedObjectType || "unknown"
            triggerSourceBreakdown[source] = (triggerSourceBreakdown[source] || 0) + 1
        }

        const paidActiveSubscriptions = subscriptions.filter(
            (sub) => Number(sub.plan.price) > 0
        ).length

        return {
            users: {
                total: totalUsers,
                policyholders: policyholderCount,
                agents: agentCount,
                admins: adminCount,
                newLast30Days: newUsersLast30Days
            },
            policies: {
                total: totalPolicies,
                active: activePolicies,
                newLast30Days: newPoliciesLast30Days
            },
            agents: {
                total: agentCount,
                pendingVerification: pendingAgents
            },
            subscriptions: {
                active: activeSubscriptions,
                mrr: mrr
            },
            gaps: {
                total: totalGaps,
                open: openGaps
            },
            dsr: {
                pendingDataExports,
                openDeletionRequests,
                approvedDeletionRequests,
                totalOpen: pendingDataExports + openDeletionRequests
            },
            funnel: {
                signups: newUsersLast30Days,
                activated: activatedNewUsers,
                trialUsed: trialUsedLast30Days,
                limitHits: limitHitsLast30Days,
                checkoutStarted: checkoutStartedEvents.length,
                checkoutCompleted: checkoutCompletedLast30Days,
                checkoutAbandoned: checkoutAbandonedLast30Days,
                paidActive: paidActiveSubscriptions,
                triggerSources: triggerSourceBreakdown,
            }
        }
    } catch (error) {
        Sentry.captureException(error)
        throw new Error("Failed to fetch dashboard metrics")
    }
}

/**
 * ACTIVITY LOGS
 */
export async function getActivityLogs(page: number = 1, limit: number = 20) {
    const admin = await verifyAdminRole()

    try {
        const skip = (page - 1) * limit

        const [logs, total] = await Promise.all([
            db.activityLog.findMany({
                orderBy: { timestamp: "desc" },
                skip,
                take: limit
            }),
            db.activityLog.count()
        ])

        return {
            logs,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        }
    } catch (error) {
        Sentry.captureException(error)
        throw new Error("Failed to fetch activity logs")
    }
}

/**
 * USER MANAGEMENT
 */
export async function getUsers(
    page: number = 1,
    limit: number = 20,
    search?: string,
    roleFilter?: string,
    statusFilter?: string
) {
    const admin = await verifyAdminRole()

    try {
        const skip = (page - 1) * limit

        // Build where clause
        const where: any = {}

        if (search) {
            where.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } }
            ]
        }

        if (roleFilter && roleFilter !== "all") {
            where.roles = { contains: roleFilter }
        }

        // Filter by Agent Verification Status
        if (statusFilter === 'pending_agents') {
            where.agentProfile = {
                verificationStatus: 'pending'
            }
            // Implicitly enforce agent role if not already
            if (!where.roles) {
                where.roles = { contains: 'agent' }
            }
        }

        const [users, total] = await Promise.all([
            db.user.findMany({
                where,
                select: {
                    id: true,
                    name: true,
                    email: true,
                    roles: true,
                    createdAt: true,
                    emailVerified: true,
                    phoneNumber: true,
                    _count: {
                        select: {
                            policiesOwned: true,
                            customerRelationshipsAsAgent: true
                        }
                    },
                    agentProfile: {
                        select: {
                            id: true,
                            verificationStatus: true,
                            agencyName: true
                        }
                    }
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit
            }),
            db.user.count({ where })
        ])

        return {
            users,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        }
    } catch (error) {
        Sentry.captureException(error)
        throw new Error("Failed to fetch users")
    }
}

export async function getUserDetails(userId: string) {
    const admin = await verifyAdminRole()

    try {
        const user = await db.user.findUnique({
            where: { id: userId },
            include: {
                policiesOwned: {
                    select: {
                        id: true,
                        policyNumber: true,
                        insurerName: true,
                        lineOfBusiness: true,
                        status: true,
                        createdAt: true
                    },
                    take: 10,
                    orderBy: { createdAt: "desc" }
                },
                agentProfile: true,
                policyholderProfile: true,
                adminProfile: true,
                subscriptions: {
                    include: { plan: true },
                    orderBy: { createdAt: "desc" },
                    take: 5
                },
                securityEvents: {
                    orderBy: { createdAt: "desc" },
                    take: 10
                },
                activeSessions: {
                    orderBy: { lastActiveAt: "desc" },
                    take: 5
                }
            }
        })

        if (!user) {
            throw new Error("User not found")
        }

        return user
    } catch (error) {
        Sentry.captureException(error)
        throw new Error("Failed to fetch user details")
    }
}

const VALID_ROLES = new Set(["policyholder", "agent", "admin"])

export async function changeUserRole(userId: string, newRole: string) {
    const admin = await verifyAdminRole()

    // The roles column is a comma-separated string checked all over the
    // codebase — an arbitrary value here (typo, junk, embedded substring)
    // would silently corrupt every downstream role check.
    const normalizedRoles = newRole
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean)
    if (
        normalizedRoles.length === 0 ||
        normalizedRoles.some((r) => !VALID_ROLES.has(r))
    ) {
        throw new Error(`Invalid role value. Allowed: ${[...VALID_ROLES].join(", ")}`)
    }
    const validatedRoles = [...new Set(normalizedRoles)].join(",")

    try {
        const user = await db.user.findUnique({
            where: { id: userId },
            select: { email: true, roles: true }
        })

        if (!user) {
            throw new Error("User not found")
        }

        // Update user role
        const updatedUser = await db.user.update({
            where: { id: userId },
            data: { roles: validatedRoles }
        })

        // Log the action
        await logAdminAction(
            admin.id,
            admin.email,
            "CHANGE_USER_ROLE",
            `Changed role for user ${user.email} from ${user.roles} to ${validatedRoles}`,
            { userId, oldRole: user.roles, newRole: validatedRoles }
        )

        revalidatePath("/admin/users")
        return { success: true, user: updatedUser }
    } catch (error) {
        Sentry.captureException(error)
        throw new Error("Failed to change user role")
    }
}

export async function deleteUser(userId: string, reason?: string) {
    const admin = await verifyAdminRole()

    let request: { id: string } | null = null
    try {
        const user = await db.user.findUnique({
            where: { id: userId },
            select: { email: true, roles: true }
        })

        if (!user) {
            throw new Error("User not found")
        }

        // Prevent deleting other admins
        if (user.roles.includes("admin")) {
            throw new Error("Cannot delete admin users")
        }

        // The old direct db.user.delete() FK-failed for any user with policies /
        // subscriptions / relationships (Restrict relations) and skipped auth,
        // storage and Stripe entirely. Admin deletion now runs through the same
        // DSR machinery as self-service requests: one eraser, one audit trail.
        const openRequest = await db.deletionRequest.findFirst({
            where: { userId, status: { in: [...OPEN_DELETION_STATUSES] } },
        })

        request = openRequest
            ? await db.deletionRequest.update({
                  where: { id: openRequest.id },
                  data: {
                      status: "approved",
                      reviewedAt: new Date(),
                      operatorNotes: appendOperatorNote(
                          null,
                          `Admin-initiated deletion. Reason: ${reason || "Not specified"}`
                      ),
                  },
              })
            : await db.deletionRequest.create({
                  data: {
                      userId,
                      status: "approved",
                      reviewedAt: new Date(),
                      legalBasis: "ADMIN_INITIATED",
                      operatorNotes: appendOperatorNote(
                          null,
                          `Admin-initiated deletion. Reason: ${reason || "Not specified"}`
                      ),
                  },
              })

        await logAdminAction(
            admin.id,
            admin.email,
            "DELETE_USER",
            `Admin-initiated deletion for user ${userId} (request ${request.id}). Reason: ${reason || "Not specified"}`,
            { userId, requestId: request.id, reason }
        )
    } catch (error) {
        Sentry.captureException(error)
        throw new Error("Failed to delete user")
    }

    if (!request) {
        throw new Error("Failed to delete user")
    }

    const result = await executeDeletionRequest(request.id)
    if (!result.success) {
        throw new Error(result.error || "Failed to delete user")
    }

    revalidatePath("/admin/users")
    return { success: true }
}

/**
 * AGENT VERIFICATION
 */
export async function getPendingAgents() {
    const admin = await verifyAdminRole()

    try {
        const pendingAgents = await db.agentProfile.findMany({
            where: { verificationStatus: "pending" },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phoneNumber: true,
                        createdAt: true
                    }
                }
            },
            orderBy: { submittedAt: "asc" }
        })

        return pendingAgents
    } catch (error) {
        Sentry.captureException(error)
        throw new Error("Failed to fetch pending agents")
    }
}

export async function approveAgent(agentProfileId: string, notes?: string) {
    const admin = await verifyAdminRole()

    try {
        const agentProfile = await db.agentProfile.findUnique({
            where: { id: agentProfileId },
            include: { user: true }
        })

        if (!agentProfile) {
            throw new Error("Agent profile not found")
        }

        // Update verification status
        await db.agentProfile.update({
            where: { id: agentProfileId },
            data: {
                verificationStatus: "approved",
                updatedAt: new Date()
            }
        })

        // Log the action
        await logAdminAction(
            admin.id,
            admin.email,
            "APPROVE_AGENT",
            `Approved agent ${agentProfile.user.email}. Notes: ${notes || "None"}`,
            { agentProfileId, agentEmail: agentProfile.user.email, notes }
        )

        // Send approval email
        try {
            const { sendEmail } = await import("@/lib/email/email-service")
            const { getAgentApprovalEmail } = await import("@/lib/email/templates/agent-emails")

            const emailTemplate = getAgentApprovalEmail({
                agentName: agentProfile.user.name || "Agent",
                agentEmail: agentProfile.user.email,
                agencyName: agentProfile.agencyName || undefined
            })

            await sendEmail({
                to: agentProfile.user.email,
                subject: emailTemplate.subject,
                html: emailTemplate.html,
                text: emailTemplate.text
            })

            console.log(`✅ Approval email sent to ${agentProfile.user.email}`)
        } catch (emailError) {
            // Don't fail the approval if email fails
            console.error("Failed to send approval email:", emailError)
            Sentry.captureException(emailError, {
                tags: { context: "agent_approval_email" }
            })
        }

        revalidatePath("/admin/users")
        revalidatePath("/admin/dashboard")
        return { success: true }
    } catch (error) {
        Sentry.captureException(error)
        throw new Error("Failed to approve agent")
    }
}

export async function rejectAgent(agentProfileId: string, reason: string) {
    const admin = await verifyAdminRole()

    try {
        const agentProfile = await db.agentProfile.findUnique({
            where: { id: agentProfileId },
            include: { user: true }
        })

        if (!agentProfile) {
            throw new Error("Agent profile not found")
        }

        // Update verification status
        await db.agentProfile.update({
            where: { id: agentProfileId },
            data: {
                verificationStatus: "rejected",
                updatedAt: new Date()
            }
        })

        // Log the action
        await logAdminAction(
            admin.id,
            admin.email,
            "REJECT_AGENT",
            `Rejected agent ${agentProfile.user.email}. Reason: ${reason}`,
            { agentProfileId, agentEmail: agentProfile.user.email, reason }
        )

        // Send rejection email
        try {
            const { sendEmail } = await import("@/lib/email/email-service")
            const { getAgentRejectionEmail } = await import("@/lib/email/templates/agent-emails")

            const emailTemplate = getAgentRejectionEmail({
                agentName: agentProfile.user.name || "Agent",
                reason: reason
            })

            await sendEmail({
                to: agentProfile.user.email,
                subject: emailTemplate.subject,
                html: emailTemplate.html,
                text: emailTemplate.text
            })

            console.log(`✅ Rejection email sent to ${agentProfile.user.email}`)
        } catch (emailError) {
            // Don't fail the rejection if email fails
            console.error("Failed to send rejection email:", emailError)
            Sentry.captureException(emailError, {
                tags: { context: "agent_rejection_email" }
            })
        }

        revalidatePath("/admin/users")
        revalidatePath("/admin/dashboard")
        return { success: true }
    } catch (error) {
        Sentry.captureException(error)
        throw new Error("Failed to reject agent")
    }
}

type DataExportStatusFilter = "all" | "requested" | "processing" | "completed" | "failed" | "expired"
type DeletionStatusFilter =
    | "all"
    | "requested"
    | "in_review"
    | "approved"
    | "processing"
    | "completed"
    | "rejected"
    | "failed"

function toErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message
    }

    return String(error)
}

/**
 * Art. 12(4): the data subject is informed of the outcome of their request.
 * Failures never block the DSR action itself (log-and-continue, like the
 * agent approval emails); the completion email goes to the address captured
 * BEFORE erasure, and an already-anonymized address means a retry of an
 * earlier partial run — nothing left to notify.
 */
async function sendDsrLifecycleEmail(
    recipient: { email: string; preferredLanguage?: string | null } | null,
    build: (language: "el" | "en") => { subject: string; html: string; text: string }
) {
    try {
        if (!recipient || !recipient.email || isAnonymizedEmail(recipient.email)) return
        const language: "el" | "en" = recipient.preferredLanguage === "en" ? "en" : "el"
        const template = build(language)
        const { sendEmail } = await import("@/lib/email/email-service")
        await sendEmail({
            to: recipient.email,
            subject: template.subject,
            html: template.html,
            text: template.text,
        })
    } catch (error) {
        Sentry.captureException(error, { tags: { context: "dsr_lifecycle_email" } })
    }
}

function appendOperatorNote(existingNotes: string | null, note?: string): string | null {
    if (!note || !note.trim()) {
        return existingNotes || null
    }

    const stampedNote = `${new Date().toISOString()} - ${note.trim()}`
    return existingNotes ? `${existingNotes}\n${stampedNote}` : stampedNote
}

// Erasure itself lives in lib/services/gdpr-erasure.service.ts — the single
// engine shared by the DSR execute path and the admin user delete below.

/**
 * DSR WORKFLOW
 */
export async function getDsrQueue(options?: {
    dataExportStatus?: DataExportStatusFilter
    deletionStatus?: DeletionStatusFilter
    limit?: number
}) {
    await verifyAdminRole()

    const safeLimit = Math.min(Math.max(options?.limit ?? 50, 1), 200)
    const dataExportStatus = options?.dataExportStatus || "all"
    const deletionStatus = options?.deletionStatus || "all"

    const dataExportWhere =
        dataExportStatus === "all"
            ? {}
            : {
                status: dataExportStatus,
            }

    const deletionWhere =
        deletionStatus === "all"
            ? {}
            : {
                status: deletionStatus,
            }

    const [dataExports, deletionRequests, pendingDataExports, openDeletionRequests, approvedDeletionRequests] =
        await Promise.all([
            db.dataExportRequest.findMany({
                where: dataExportWhere,
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
                orderBy: { requestedAt: "asc" },
                take: safeLimit,
            }),
            db.deletionRequest.findMany({
                where: deletionWhere,
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            roles: true,
                        },
                    },
                },
                orderBy: { requestedAt: "asc" },
                take: safeLimit,
            }),
            db.dataExportRequest.count({
                where: {
                    status: {
                        in: ["requested", "processing", "failed"],
                    },
                },
            }),
            db.deletionRequest.count({
                where: {
                    status: {
                        in: [...OPEN_DELETION_STATUSES],
                    },
                },
            }),
            db.deletionRequest.count({
                where: {
                    status: "approved",
                },
            }),
        ])

    return {
        dataExports: dataExports.map((request) => ({
            id: request.id,
            userId: request.userId,
            userName: request.user.name,
            userEmail: request.user.email,
            status: request.status,
            requestSource: request.requestSource,
            requestedAt: request.requestedAt.toISOString(),
            startedAt: request.startedAt?.toISOString() || null,
            completedAt: request.completedAt?.toISOString() || null,
            expiresAt: request.expiresAt?.toISOString() || null,
            errorMessage: request.errorMessage,
        })),
        deletionRequests: deletionRequests.map((request) => ({
            id: request.id,
            userId: request.userId,
            userName: request.user?.name ?? null,
            userEmail: request.user?.email ?? "(erased)",
            userRoles: request.user?.roles ?? "",
            status: request.status,
            legalBasis: request.legalBasis,
            retentionNotes: request.retentionNotes,
            operatorNotes: request.operatorNotes,
            requestedAt: request.requestedAt.toISOString(),
            reviewedAt: request.reviewedAt?.toISOString() || null,
            completedAt: request.completedAt?.toISOString() || null,
            errorMessage: request.errorMessage,
        })),
        summary: {
            pendingDataExports,
            openDeletionRequests,
            approvedDeletionRequests,
            totalOpen: pendingDataExports + openDeletionRequests,
        },
    }
}

export async function executeDataExportRequestAsAdmin(requestId: string) {
    const admin = await verifyAdminRole()

    if (!requestId?.trim()) {
        return { success: false, error: "Missing request id" }
    }

    const request = await db.dataExportRequest.findUnique({
        where: { id: requestId },
        include: {
            user: {
                select: {
                    id: true,
                    email: true,
                    preferredLanguage: true,
                },
            },
        },
    })

    if (!request) {
        return { success: false, error: "Data export request not found" }
    }

    if (request.status === "processing") {
        return { success: false, error: "Data export request is already processing" }
    }

    try {
        await db.dataExportRequest.update({
            where: { id: requestId },
            data: {
                status: "processing",
                startedAt: new Date(),
                errorMessage: null,
            },
        })

        const payload = await buildUserDataExportPayload(request.userId)
        const completedAt = new Date()
        const expiresAt = new Date(completedAt.getTime() + EXPORT_DOWNLOAD_TTL_MS)
        const downloadToken = crypto.randomUUID().replace(/-/g, "")

        await db.dataExportRequest.update({
            where: { id: requestId },
            data: {
                status: "completed",
                payloadJson: payload as any,
                completedAt,
                expiresAt,
                downloadToken,
                errorMessage: null,
            },
        })

        await logAdminAction(
            admin.id,
            admin.email,
            "EXECUTE_DATA_EXPORT_REQUEST",
            `Executed data export request ${requestId} for user ${request.userId}`,
            {
                requestId,
                userId: request.userId,
            }
        )

        await sendDsrLifecycleEmail(request.user, (language) =>
            getDataExportReadyEmail(language, `${getSiteOrigin()}/account`)
        )

        revalidatePath("/admin/dsr")
        revalidatePath("/admin/dashboard")
        return { success: true }
    } catch (error) {
        const errorMessage = toErrorMessage(error)
        Sentry.captureException(error)

        await db.dataExportRequest.update({
            where: { id: requestId },
            data: {
                status: "failed",
                errorMessage,
            },
        })

        await logAdminAction(
            admin.id,
            admin.email,
            "EXECUTE_DATA_EXPORT_REQUEST_FAILED",
            `Failed executing data export request ${requestId} for user ${request.userId}`,
            {
                requestId,
                userId: request.userId,
                errorMessage,
            }
        )

        revalidatePath("/admin/dsr")
        revalidatePath("/admin/dashboard")
        return { success: false, error: "Failed to execute data export request" }
    }
}

export async function markDeletionRequestInReview(requestId: string, note?: string) {
    const admin = await verifyAdminRole()

    const request = await db.deletionRequest.findUnique({
        where: { id: requestId },
        include: {
            user: {
                select: {
                    email: true,
                    preferredLanguage: true,
                },
            },
        },
    })

    if (!request) {
        return { success: false, error: "Deletion request not found" }
    }

    if (request.status !== "requested" && request.status !== "failed") {
        return { success: false, error: "Only requested or failed requests can move to in review" }
    }

    await db.deletionRequest.update({
        where: { id: requestId },
        data: {
            status: "in_review",
            reviewedAt: new Date(),
            operatorNotes: appendOperatorNote(request.operatorNotes, note),
            errorMessage: null,
        },
    })

    await logAdminAction(
        admin.id,
        admin.email,
        "DELETION_REQUEST_IN_REVIEW",
        `Marked deletion request ${requestId} as in review for user ${request.userId}`,
        {
            requestId,
            userId: request.userId,
            note: note || null,
        }
    )

    revalidatePath("/admin/dsr")
    revalidatePath("/admin/dashboard")
    return { success: true }
}

export async function approveDeletionRequest(requestId: string, note?: string) {
    const admin = await verifyAdminRole()

    const request = await db.deletionRequest.findUnique({
        where: { id: requestId },
        include: {
            user: {
                select: {
                    email: true,
                    preferredLanguage: true,
                },
            },
        },
    })

    if (!request) {
        return { success: false, error: "Deletion request not found" }
    }

    if (request.status !== "requested" && request.status !== "in_review") {
        return { success: false, error: "Only requested or in-review requests can be approved" }
    }

    await db.deletionRequest.update({
        where: { id: requestId },
        data: {
            status: "approved",
            reviewedAt: new Date(),
            operatorNotes: appendOperatorNote(request.operatorNotes, note),
            errorMessage: null,
        },
    })

    await logAdminAction(
        admin.id,
        admin.email,
        "APPROVE_DELETION_REQUEST",
        `Approved deletion request ${requestId} for user ${request.userId}`,
        {
            requestId,
            userId: request.userId,
            note: note || null,
        }
    )

    await sendDsrLifecycleEmail(request.user, (language) => getDeletionApprovedEmail(language))

    revalidatePath("/admin/dsr")
    revalidatePath("/admin/dashboard")
    return { success: true }
}

export async function rejectDeletionRequest(requestId: string, reason: string) {
    const admin = await verifyAdminRole()

    if (!reason?.trim()) {
        return { success: false, error: "Rejection reason is required" }
    }

    const request = await db.deletionRequest.findUnique({
        where: { id: requestId },
        include: {
            user: {
                select: {
                    email: true,
                    preferredLanguage: true,
                },
            },
        },
    })

    if (!request) {
        return { success: false, error: "Deletion request not found" }
    }

    if (request.status === "completed" || request.status === "rejected") {
        return { success: false, error: "This deletion request is already finalized" }
    }

    await db.deletionRequest.update({
        where: { id: requestId },
        data: {
            status: "rejected",
            reviewedAt: new Date(),
            operatorNotes: appendOperatorNote(request.operatorNotes, `Rejected: ${reason.trim()}`),
            errorMessage: null,
        },
    })

    await logAdminAction(
        admin.id,
        admin.email,
        "REJECT_DELETION_REQUEST",
        `Rejected deletion request ${requestId} for user ${request.userId}`,
        {
            requestId,
            userId: request.userId,
            reason: reason.trim(),
        }
    )

    await sendDsrLifecycleEmail(request.user, (language) => getDeletionRejectedEmail(language, reason.trim()))

    revalidatePath("/admin/dsr")
    revalidatePath("/admin/dashboard")
    return { success: true }
}

export async function executeDeletionRequest(requestId: string) {
    const admin = await verifyAdminRole()

    const request = await db.deletionRequest.findUnique({
        where: { id: requestId },
        include: {
            user: {
                select: {
                    email: true,
                    preferredLanguage: true,
                },
            },
        },
    })

    if (!request) {
        return { success: false, error: "Deletion request not found" }
    }

    // "processing" is accepted so a request stranded by a crash between the
    // erasure and the completed-write below stays recoverable (the erasure
    // engine is idempotent end to end).
    if (request.status !== "approved" && request.status !== "failed" && request.status !== "processing") {
        return { success: false, error: "Only approved, processing or failed requests can be executed" }
    }

    // userId is nullable since the SetNull hardening — a request whose user row
    // is gone has nothing left to erase.
    if (!request.userId) {
        return { success: false, error: "Deletion request has no associated user" }
    }

    await db.deletionRequest.update({
        where: { id: requestId },
        data: {
            status: "processing",
            reviewedAt: request.reviewedAt || new Date(),
            completedAt: null,
            errorMessage: null,
        },
    })

    try {
        const summary = await eraseUserData(request.userId)
        const completionNote =
            `Execution completed. Deleted policies: ${summary.deletedPolicies}, ` +
            `storage files: ${summary.storageFilesDeleted}, ` +
            `Stripe subscriptions cancelled: ${summary.stripeSubscriptionsCancelled}, ` +
            `auth identity deleted: ${summary.authUserDeleted ? "yes" : "already absent"}.`

        await db.deletionRequest.update({
            where: { id: requestId },
            data: {
                status: "completed",
                completedAt: new Date(),
                errorMessage: null,
                operatorNotes: appendOperatorNote(request.operatorNotes, completionNote),
            },
        })

        await logAdminAction(
            admin.id,
            admin.email,
            "EXECUTE_DELETION_REQUEST",
            `Executed deletion request ${requestId} for user ${request.userId}`,
            {
                requestId,
                userId: request.userId,
                summary,
            }
        )

        // `request.user.email` was loaded before the erasure ran — the last
        // moment the original address exists anywhere in our systems.
        await sendDsrLifecycleEmail(request.user, (language) => getDeletionCompletedEmail(language))

        revalidatePath("/admin/dsr")
        revalidatePath("/admin/dashboard")
        return { success: true }
    } catch (error) {
        const errorMessage = toErrorMessage(error)
        Sentry.captureException(error)

        await db.deletionRequest.update({
            where: { id: requestId },
            data: {
                status: "failed",
                errorMessage,
            },
        })

        await logAdminAction(
            admin.id,
            admin.email,
            "EXECUTE_DELETION_REQUEST_FAILED",
            `Failed to execute deletion request ${requestId} for user ${request.userId}`,
            {
                requestId,
                userId: request.userId,
                errorMessage,
            }
        )

        revalidatePath("/admin/dsr")
        revalidatePath("/admin/dashboard")
        return { success: false, error: "Failed to execute deletion request" }
    }
}

export async function getBillingReconciliation(windowHours: number = 24) {
    await verifyAdminRole()

    try {
        return await getBillingReconciliationSnapshot({ windowHours })
    } catch (error) {
        Sentry.captureException(error)
        throw new Error("Failed to fetch billing reconciliation snapshot")
    }
}

export async function getLaunchReadiness(windowHours: number = 24) {
    await verifyAdminRole()

    try {
        return await getLaunchReadinessSnapshot({ windowHours })
    } catch (error) {
        Sentry.captureException(error)
        throw new Error("Failed to fetch launch readiness snapshot")
    }
}

/**
 * MASTER DATA MANAGEMENT (existing functions)
 */
export async function createInsurer(formData: FormData) {
    const admin = await verifyAdminRole()

    const name = formData.get("name") as string
    if (!name) return

    await db.insurer.create({
        data: { name }
    })

    await logAdminAction(
        admin.id,
        admin.email,
        "CREATE_INSURER",
        `Created insurer: ${name}`,
        { insurerName: name }
    )

    revalidatePath("/admin/insurers")
}

export async function createInsuranceType(formData: FormData) {
    const admin = await verifyAdminRole()

    const name = formData.get("name") as string
    const slug = formData.get("slug") as string
    if (!name || !slug) return

    await db.insuranceType.create({
        data: { name, slug }
    })

    await logAdminAction(
        admin.id,
        admin.email,
        "CREATE_INSURANCE_TYPE",
        `Created insurance type: ${name} (${slug})`,
        { typeName: name, typeSlug: slug }
    )

    revalidatePath("/admin/types")
}

/**
 * L4: Update a gap definition with automatic version increment.
 * Records changedAt and changedBy (admin user id) on every write.
 */
export async function updateGapDefinition(
    gapDefinitionId: string,
    data: {
        name?: string
        title?: string
        description?: string
        severity?: string
        isActive?: boolean
        detectionLogic?: Record<string, unknown>
    }
) {
    const admin = await verifyAdminRole()

    const existing = await db.gapDefinition.findUnique({
        where: { id: gapDefinitionId },
        select: { slug: true, version: true },
    })
    if (!existing) throw new Error("Gap definition not found")

    const updated = await (db.gapDefinition.update as any)({
        where: { id: gapDefinitionId },
        data: {
            ...data,
            version: { increment: 1 },
            changedAt: new Date(),
            changedBy: admin.id,
            updatedAt: new Date(),
        },
    })

    await logAdminAction(
        admin.id,
        admin.email,
        "UPDATE_GAP_DEFINITION",
        `Updated gap definition ${existing.slug} (v${existing.version} → v${(existing.version ?? 0) + 1})`,
        { gapDefinitionId, slug: existing.slug, changes: Object.keys(data) }
    )

    revalidatePath("/admin/gaps")
    return updated
}

// ── Extraction flag triage ───────────────────────────────────────────
// Users flag incorrect AI extractions from the upload review screen;
// flags are stored as notificationEvents (eventType 'extraction_flagged').
// This queue lets admins triage them: see the reason, the policy's current
// review state (a re-analysis or user confirm self-heals the flag), and
// mark the report handled.

export interface ExtractionFlagQueueItem {
    id: string
    userName: string | null
    userEmail: string
    reason: string
    flaggedAt: string
    handled: boolean
    handledAt: string | null
    policyId: string | null
    policyNumber: string | null
    insurerName: string | null
    lineOfBusiness: string | null
    /** Current review state on the policy — 'flagged' means still unresolved;
     *  'unconfirmed'/'confirmed' means a re-analysis or user confirm superseded it. */
    currentReviewState: string | null
    currentConfidence: number | null
    provider: string | null
}

export async function getExtractionFlagQueue(options?: { limit?: number }) {
    await verifyAdminRole()

    const safeLimit = Math.min(Math.max(options?.limit ?? 100, 1), 200)

    const events = await db.notificationEvent.findMany({
        where: { eventType: "extraction_flagged" },
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        take: safeLimit,
    })

    const policyIds = [...new Set(events.map((e) => e.relatedObjectId).filter(Boolean))] as string[]
    const policies = policyIds.length
        ? await db.policy.findMany({
              where: { id: { in: policyIds } },
              select: {
                  id: true,
                  policyNumber: true,
                  insurerName: true,
                  lineOfBusiness: true,
                  acordData: true,
              },
          })
        : []
    const policyById = new Map(policies.map((p) => [p.id, p]))

    const items: ExtractionFlagQueueItem[] = events.map((event) => {
        const policy = event.relatedObjectId ? policyById.get(event.relatedObjectId) : undefined
        const extraction = (policy?.acordData as any)?.extraction || null
        return {
            id: event.id,
            userName: event.user?.name ?? null,
            userEmail: event.user?.email ?? "unknown",
            reason: event.message,
            flaggedAt: event.createdAt.toISOString(),
            handled: event.status === "read",
            handledAt: event.readAt?.toISOString() ?? null,
            policyId: policy?.id ?? null,
            policyNumber: policy?.policyNumber ?? null,
            insurerName: policy?.insurerName ?? null,
            lineOfBusiness: policy?.lineOfBusiness ?? null,
            currentReviewState: typeof extraction?.reviewState === "string" ? extraction.reviewState : null,
            currentConfidence:
                typeof extraction?.confidence?.overall === "number" ? extraction.confidence.overall : null,
            provider: typeof extraction?.source === "string" ? extraction.source : null,
        }
    })

    return {
        items,
        summary: {
            open: items.filter((i) => !i.handled).length,
            selfHealed: items.filter(
                (i) => !i.handled && i.currentReviewState !== null && i.currentReviewState !== "flagged"
            ).length,
            total: items.length,
        },
    }
}

export async function resolveExtractionFlag(eventId: string) {
    const admin = await verifyAdminRole()

    const result = await db.notificationEvent.updateMany({
        where: { id: eventId, eventType: "extraction_flagged", status: { not: "read" } },
        data: { status: "read", readAt: new Date() },
    })
    if (result.count === 0) {
        return { error: "Flag not found or already handled" }
    }

    await logAdminAction(
        admin.id,
        admin.email,
        "EXTRACTION_FLAG_RESOLVED",
        `Marked extraction flag ${eventId} as handled`,
        { eventId }
    )

    revalidatePath("/admin/extraction-flags")
    return { success: true }
}
