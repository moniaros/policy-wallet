import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { updateUserProfileSchema } from "@/lib/validations/user"
import { z } from "zod"
import * as Sentry from "@sentry/nextjs"
import { requireApiUser } from "@/lib/api-auth"

export async function GET() {
    const authCheck = await requireApiUser()
    if ("error" in authCheck) return authCheck.error
    const authResult = authCheck.auth

    try {
        const user = await db.user.findUnique({
            where: { id: authResult.dbUser.id },
            include: {
                policyholderProfile: true,
            }
        })

        if (!user) {
            return NextResponse.json(
                {
                    data: null,
                    meta: { language: "el" },
                    error: { code: "NOT_FOUND", message: "User not found", status: 404 }
                },
                { status: 404 }
            )
        }

        return NextResponse.json({
            data: {
                id: user.id,
                email: user.email,
                name: user.name,
                preferredLanguage: user.preferredLanguage,
                roles: user.roles.split(","),
                createdAt: user.createdAt,
                profile: user.policyholderProfile ? {
                    preferences: user.policyholderProfile.preferences
                } : null
            },
            meta: {
                request_id: crypto.randomUUID(),
                language: user.preferredLanguage
            },
            error: null
        })
    } catch (error) {
        Sentry.captureException(error, {
            tags: {
                endpoint: '/api/v1/me',
                method: 'GET',
                userId: authResult.dbUser.id
            }
        })

        console.error(error)
        return NextResponse.json(
            {
                data: null,
                meta: { language: "el" },
                error: { code: "INTERNAL_ERROR", message: "Internal server error", status: 500 }
            },
            { status: 500 }
        )
    }
}

export async function PATCH(req: Request) {
    const authCheck = await requireApiUser()
    if ("error" in authCheck) return authCheck.error
    const authResult = authCheck.auth

    try {
        const body = await req.json()

        // Validate input
        const validatedData = updateUserProfileSchema.parse(body)

        const updatedUser = await db.user.update({
            where: { id: authResult.dbUser.id },
            data: {
                name: validatedData.name,
                preferredLanguage: validatedData.preferredLanguage,
                phoneNumber: validatedData.phone,
                image: validatedData.image,
            }
        })

        return NextResponse.json({
            data: {
                id: updatedUser.id,
                email: updatedUser.email,
                name: updatedUser.name,
                preferredLanguage: updatedUser.preferredLanguage,
                phone: updatedUser.phoneNumber,
                image: updatedUser.image,
                updatedAt: updatedUser.updatedAt
            },
            meta: {
                request_id: crypto.randomUUID(),
                language: updatedUser.preferredLanguage
            },
            error: null
        })
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {
                    data: null,
                    meta: { language: "el" },
                    error: {
                        code: "VALIDATION_ERROR",
                        message: "Invalid input data",
                        status: 400,
                        details: error.issues
                    }
                },
                { status: 400 }
            )
        }

        Sentry.captureException(error, {
            tags: {
                endpoint: '/api/v1/me',
                method: 'PATCH',
                userId: authResult.dbUser.id
            }
        })

        console.error(error)
        return NextResponse.json(
            {
                data: null,
                meta: { language: "el" },
                error: { code: "BAD_REQUEST", message: "Failed to update profile", status: 400 }
            },
            { status: 400 }
        )
    }
}
