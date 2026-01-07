import { db } from "./db"
import { NextResponse } from "next/server"

/**
 * Ensures that the authenticated user owns the specified resource.
 * @param model - The Prisma model to check (e.g., db.policy)
 * @param resourceId - The ID of the resource
 * @param userId - The ID of the user from the session
 * @param ownerField - The field name for the owner ID (defaults to 'ownerUserId')
 */
export async function ensureOwnership<T extends { id: string }>(
    model: any,
    resourceId: string,
    userId: string,
    ownerField: string = "ownerUserId"
): Promise<{ success: boolean; data?: T; error?: NextResponse }> {
    try {
        const resource = await model.findUnique({
            where: { id: resourceId }
        })

        if (!resource) {
            return {
                success: false,
                error: NextResponse.json(
                    { error: { code: "NOT_FOUND", message: "Resource not found", status: 404 } },
                    { status: 404 }
                )
            }
        }

        if (resource[ownerField] !== userId) {
            return {
                success: false,
                error: NextResponse.json(
                    { error: { code: "FORBIDDEN", message: "Ownership verification failed", status: 403 } },
                    { status: 403 }
                )
            }
        }

        return { success: true, data: resource }
    } catch (error) {
        return {
            success: false,
            error: NextResponse.json(
                { error: { code: "INTERNAL_ERROR", message: "Security check failed", status: 500 } },
                { status: 500 }
            )
        }
    }
}
