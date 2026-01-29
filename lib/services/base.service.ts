import { PrismaClient } from "@prisma/client"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"

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
     * Log an activity to the activity log
     * 
     * @param userId - ID of the user performing the action
     * @param actionType - Type of action being performed
     * @param description - Human-readable description
     * @param metadata - Additional metadata (optional)
     * 
     * @example
     * ```typescript
     * await this.logActivity(
     *   userId,
     *   'POLICY_CREATED',
     *   'Created motor insurance policy',
     *   { policyId: policy.id, insurerName: 'Test Insurance' }
     * )
     * ```
     */
    protected async logActivity(
        userId: string,
        actionType: string,
        description: string,
        metadata?: Record<string, unknown>
    ): Promise<void> {
        try {
            const user = await this.db.user.findUnique({
                where: { id: userId },
                select: { email: true }
            })

            await this.db.activityLog.create({
                data: {
                    adminUserId: userId,
                    adminEmail: user?.email || 'unknown',
                    actionType,
                    description,
                    metadata: (metadata || {}) as any // Prisma JSON type
                }
            })
        } catch (error) {
            // Don't fail the operation if logging fails
            // Use logger if available, otherwise console
            if (typeof logger === 'function') {
                logger('error', 'Failed to log activity', {
                    userId,
                    actionType,
                    error: error instanceof Error ? error.message : String(error)
                })
            } else {
                console.error('Failed to log activity:', error)
            }
        }
    }

    /**
     * Get user email by ID (helper method)
     * 
     * @param userId - User ID
     * @returns User email or 'unknown'
     */
    protected async getUserEmail(userId: string): Promise<string> {
        try {
            const user = await this.db.user.findUnique({
                where: { id: userId },
                select: { email: true }
            })
            return user?.email || 'unknown'
        } catch {
            return 'unknown'
        }
    }
}
