"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import * as Sentry from "@sentry/nextjs"

/**
 * ROLE VERIFICATION HELPER
 */
async function verifyAdminRole() {
    const auth = await getAuthenticatedUserOrNull()

    if (!auth) {
        throw new Error("Unauthorized: Not authenticated")
    }

    const { dbUser } = auth

    // Check if user has admin role
    if (!dbUser.roles.includes("admin")) {
        Sentry.captureMessage(`Unauthorized admin access attempt by user ${dbUser.id}`, "warning")
        throw new Error("Unauthorized: Admin role required")
    }

    return dbUser
}

/**
 * LOG ADMIN ACTION
 */
async function logAdminAction(
    adminUserId: string,
    adminEmail: string,
    actionType: string,
    description: string,
    metadata?: any
) {
    try {
        await db.activityLog.create({
            data: {
                adminUserId,
                adminEmail,
                actionType,
                description,
                metadata: metadata || {},
                timestamp: new Date()
            }
        })
    } catch (error) {
        Sentry.captureException(error)
        console.error("Failed to log admin action:", error)
    }
}

/**
 * DASHBOARD METRICS
 */
export async function getDashboardMetrics() {
    const admin = await verifyAdminRole()

    try {
        // Get user counts by role
        const totalUsers = await db.user.count()
        const policyholderCount = await db.user.count({
            where: { roles: { contains: "policyholder" } }
        })
        const agentCount = await db.user.count({
            where: { roles: { contains: "agent" } }
        })
        const adminCount = await db.user.count({
            where: { roles: { contains: "admin" } }
        })

        // Get policy statistics
        const totalPolicies = await db.policy.count()
        const activePolicies = await db.policy.count({
            where: { status: "active" }
        })

        // Get agent verification queue
        const pendingAgents = await db.agentProfile.count({
            where: { verificationStatus: "pending" }
        })

        // Get subscription statistics (if applicable)
        const activeSubscriptions = await db.subscription.count({
            where: { status: "active" }
        })

        // Calculate MRR (Monthly Recurring Revenue)
        const subscriptions = await db.subscription.findMany({
            where: { status: "active" },
            include: { plan: true }
        })

        const mrr = subscriptions.reduce((total, sub) => {
            const planPrice = Number(sub.plan.price)
            return total + (sub.plan.billingPeriod === "monthly" ? planPrice : planPrice / 12)
        }, 0)

        // Get recent activity (last 30 days)
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const newUsersLast30Days = await db.user.count({
            where: { createdAt: { gte: thirtyDaysAgo } }
        })

        const newPoliciesLast30Days = await db.policy.count({
            where: { createdAt: { gte: thirtyDaysAgo } }
        })

        // Get gap statistics
        const totalGaps = await db.gapInstance.count()
        const openGaps = await db.gapInstance.count({
            where: { status: "open" }
        })

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
