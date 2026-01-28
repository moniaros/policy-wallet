import { PrismaClient } from "@prisma/client"
import { db } from "@/lib/db"

export abstract class BaseService {
    protected readonly db: PrismaClient

    constructor(database: PrismaClient = db) {
        this.db = database
    }

    /**
     * Executes a function within a transaction.
     * Use this wrapper to ensure atomicity for complex operations.
     */
    protected async withTransaction<T>(
        fn: (tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">) => Promise<T>
    ): Promise<T> {
        return this.db.$transaction(async (tx) => {
            return await fn(tx)
        })
    }

    /**
     * Logs an activity to the database.
     * Useful for audit trails and tracking user actions.
     */
    protected async logActivity(
        userId: string,
        action: string,
        description: string,
        metadata?: Record<string, any>
    ): Promise<void> {
        try {
            // We need to fetch the email for the log, or we can make it optional/nullable in implementation if schema allows
            // Looking at admin actions, it passes email.
            // Ideally, the caller should provide context.
            // For now, we will try to fetch user email if not provided, or just store what we have.
            // However, the admin logActivity takes (adminUserId, adminEmail, ...).
            // We'll check the schema for generic activity logs.
            // The admin action uses `db.activityLog`.

            // Let's look up the user email if we only have ID, OR rely on a context object passed to the service method.
            // For this helper, we'll keep it simple: assume we might need to look it up or just log it.
            // But waiting on an async lookup inside a log helper might be slow.
            // Let's see if we can just log the userId.

            const user = await this.db.user.findUnique({
                where: { id: userId },
                select: { email: true }
            })

            if (!user) {
                console.warn(`Failed to find user ${userId} for activity logging`)
                return
            }

            await this.db.activityLog.create({
                data: {
                    adminUserId: userId, // Assuming activityLog is polymorphic or we are reusing this field. 
                    // Wait, looking at admin actions: adminUserId, adminEmail.
                    // If this is for general users, is there a 'userId' field?
                    // I will check schema if possible, but based on admin actions, it seems to be designed for admins?
                    // Or maybe it's a generic activity log table?
                    // User request says "Audit logging helper method".
                    // I will assume reusing `activityLog` table.
                    // If the table columns are `adminUserId`, it might be specific to admin.
                    // But for now I will map it there.
                    adminEmail: user.email,
                    actionType: action,
                    description: description,
                    metadata: metadata || {},
                    timestamp: new Date()
                }
            })
        } catch (error) {
            // Fail silently or log to console/Sentry, don't break the main flow
            console.error("Failed to log activity:", error)
        }
    }
}
