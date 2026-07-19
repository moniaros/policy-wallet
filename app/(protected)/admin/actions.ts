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
import { Prisma } from "@prisma/client"

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

export async function changeUserRole(userId: string, newRole: string) {
    const admin = await verifyAdminRole()

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
            data: { roles: newRole }
        })

        // Log the action
        await logAdminAction(
            admin.id,
            admin.email,
            "CHANGE_USER_ROLE",
            `Changed role for user ${user.email} from ${user.roles} to ${newRole}`,
            { userId, oldRole: user.roles, newRole }
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

        // Soft delete: We'll delete the user but this will cascade to related records
        // In production, you might want to implement a soft delete with a 'deletedAt' field
        await db.user.delete({
            where: { id: userId }
        })

        // Log the action
        await logAdminAction(
            admin.id,
            admin.email,
            "DELETE_USER",
            `Deleted user ${user.email}. Reason: ${reason || "Not specified"}`,
            { userId, userEmail: user.email, reason }
        )

        revalidatePath("/admin/users")
        return { success: true }
    } catch (error) {
        Sentry.captureException(error)
        throw new Error("Failed to delete user")
    }
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

function appendOperatorNote(existingNotes: string | null, note?: string): string | null {
    if (!note || !note.trim()) {
        return existingNotes || null
    }

    const stampedNote = `${new Date().toISOString()} - ${note.trim()}`
    return existingNotes ? `${existingNotes}\n${stampedNote}` : stampedNote
}

function getAnonymizedEmail(userId: string): string {
    return `deleted+${userId}.${Date.now()}@deleted.policywallet.local`
}

async function executeDeletionAnonymization(userId: string) {
    const anonymizedEmail = getAnonymizedEmail(userId)

    return db.$transaction(async (tx) => {
        const [
            deletedPolicies,
            deletedOauthAccounts,
            deletedSessions,
            deletedActiveSessions,
            deletedPasskeys,
            deletedChallenges,
            deletedNotificationPreferences,
            deletedNotificationEvents,
            deletedSecurityEvents,
            deletedAccessGrants,
            deletedInvites,
            cancelledSubscriptions,
            sanitizedPolicyholderProfiles,
            sanitizedAgentProfiles,
        ] = await Promise.all([
            tx.policy.deleteMany({ where: { ownerUserId: userId } }),
            tx.account.deleteMany({ where: { userId } }),
            tx.session.deleteMany({ where: { userId } }),
            tx.activeSession.deleteMany({ where: { userId } }),
            tx.passkeyCredential.deleteMany({ where: { userId } }),
            tx.webAuthnChallenge.deleteMany({ where: { userId } }),
            tx.notificationPreference.deleteMany({ where: { userId } }),
            tx.notificationEvent.deleteMany({ where: { userId } }),
            tx.securityEvent.deleteMany({ where: { userId } }),
            tx.accessGrant.deleteMany({
                where: {
                    OR: [{ granterUserId: userId }, { granteeUserId: userId }],
                },
            }),
            tx.invite.deleteMany({
                where: {
                    OR: [{ inviterUserId: userId }, { inviteeUserId: userId }],
                },
            }),
            tx.subscription.updateMany({
                where: {
                    userId,
                    status: "active",
                },
                data: {
                    status: "cancelled",
                    autoRenew: false,
                },
            }),
            tx.policyholderProfile.updateMany({
                where: { userId },
                data: { preferences: Prisma.JsonNull },
            }),
            tx.agentProfile.updateMany({
                where: { userId },
                data: {
                    agencyName: null,
                    licenseNumber: null,
                    logoUrl: null,
                    website: null,
                    phone: null,
                    documents: Prisma.JsonNull,
                },
            }),
        ])

        await tx.user.update({
            where: { id: userId },
            data: {
                email: anonymizedEmail,
                name: "Deleted User",
                image: null,
                phoneNumber: null,
                pushToken: null,
                password: null,
                stripeCustomerId: null,
                emailVerified: null,
                termsVersionAccepted: null,
                privacyVersionAccepted: null,
                cookieConsentVersion: null,
                consentUpdatedAt: null,
                consentLocale: null,
            },
        })

        return {
            anonymizedEmail,
            deletedPolicies: deletedPolicies.count,
            deletedOauthAccounts: deletedOauthAccounts.count,
            deletedSessions: deletedSessions.count,
            deletedActiveSessions: deletedActiveSessions.count,
            deletedPasskeys: deletedPasskeys.count,
            deletedChallenges: deletedChallenges.count,
            deletedNotificationPreferences: deletedNotificationPreferences.count,
            deletedNotificationEvents: deletedNotificationEvents.count,
            deletedSecurityEvents: deletedSecurityEvents.count,
            deletedAccessGrants: deletedAccessGrants.count,
            deletedInvites: deletedInvites.count,
            cancelledSubscriptions: cancelledSubscriptions.count,
            sanitizedPolicyholderProfiles: sanitizedPolicyholderProfiles.count,
            sanitizedAgentProfiles: sanitizedAgentProfiles.count,
        }
    })
}

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
            userName: request.user.name,
            userEmail: request.user.email,
            userRoles: request.user.roles,
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
            `Executed data export request ${requestId} for ${request.user.email}`,
            {
                requestId,
                userId: request.userId,
                userEmail: request.user.email,
            }
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
            `Failed executing data export request ${requestId} for ${request.user.email}`,
            {
                requestId,
                userId: request.userId,
                userEmail: request.user.email,
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
        `Marked deletion request ${requestId} as in review for ${request.user.email}`,
        {
            requestId,
            userId: request.userId,
            userEmail: request.user.email,
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
        `Approved deletion request ${requestId} for ${request.user.email}`,
        {
            requestId,
            userId: request.userId,
            userEmail: request.user.email,
            note: note || null,
        }
    )

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
        `Rejected deletion request ${requestId} for ${request.user.email}`,
        {
            requestId,
            userId: request.userId,
            userEmail: request.user.email,
            reason: reason.trim(),
        }
    )

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
                },
            },
        },
    })

    if (!request) {
        return { success: false, error: "Deletion request not found" }
    }

    if (request.status !== "approved" && request.status !== "failed") {
        return { success: false, error: "Only approved or failed requests can be executed" }
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
        const summary = await executeDeletionAnonymization(request.userId)
        const completionNote = `Execution completed. Deleted policies: ${summary.deletedPolicies}, cancelled subscriptions: ${summary.cancelledSubscriptions}.`

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
            `Executed deletion request ${requestId} for ${request.user.email}`,
            {
                requestId,
                userId: request.userId,
                userEmail: request.user.email,
                summary,
            }
        )

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
            `Failed to execute deletion request ${requestId} for ${request.user.email}`,
            {
                requestId,
                userId: request.userId,
                userEmail: request.user.email,
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
