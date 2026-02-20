import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiUser } from "@/lib/api-auth"
import { z } from "zod"

const DEFAULT_NOTIFICATION_EVENTS = [
    "policy_expiring",
    "pending_questionnaire",
    "renewal_milestone",
    "policy_reviewed",
] as const

const notificationPreferenceSchema = z.object({
    event_type: z.string().min(1),
    channel: z.enum(["email", "push", "sms"]),
    enabled: z.boolean(),
})

const preferencesUpdateSchema = z.object({
    preferences: z.array(notificationPreferenceSchema),
})

export async function GET() {
    const authCheck = await requireApiUser()
    if ("error" in authCheck) return authCheck.error
    const authResult = authCheck.auth

    try {
        const preferences = await (db as any).notificationPreference.findMany({
            where: { userId: authResult.dbUser.id }
        })

        // Include defaults plus any persisted custom event types.
        const eventTypes = new Set<string>(DEFAULT_NOTIFICATION_EVENTS)
        for (const pref of preferences) {
            if (pref?.eventType) eventTypes.add(pref.eventType)
        }

        const result = Array.from(eventTypes).sort((a, b) => a.localeCompare(b)).map(event => {
            const userPrefs = preferences.filter((p: any) => p.eventType === event)
            return {
                event_type: event,
                channels: {
                    email: userPrefs.find((p: any) => p.channel === "email")?.enabled ?? true,
                    push: userPrefs.find((p: any) => p.channel === "push")?.enabled ?? true,
                    // SMS channel is not currently exposed in UI but is preserved for backward compatibility.
                    sms: userPrefs.find((p: any) => p.channel === "sms")?.enabled ?? false,
                }
            }
        })

        return NextResponse.json({
            data: { preferences: result },
            meta: { request_id: crypto.randomUUID(), language: "el" },
            error: null
        })
    } catch (error) {
        console.error(error)
        return NextResponse.json(
            { error: { code: "INTERNAL_ERROR", message: "Server error", status: 500 } },
            { status: 500 }
        )
    }
}

export async function PATCH(req: Request) {
    const authCheck = await requireApiUser()
    if ("error" in authCheck) return authCheck.error
    const authResult = authCheck.auth

    try {
        const { preferences } = preferencesUpdateSchema.parse(await req.json())

        for (const pref of preferences) {
            await (db as any).notificationPreference.upsert({
                where: {
                    userId_eventType_channel: {
                        userId: authResult.dbUser.id,
                        eventType: pref.event_type,
                        channel: pref.channel
                    }
                },
                update: { enabled: pref.enabled },
                create: {
                    userId: authResult.dbUser.id,
                    eventType: pref.event_type,
                    channel: pref.channel,
                    enabled: pref.enabled
                }
            })
        }

        return NextResponse.json({
            data: { message: "Preferences updated successfully", updated_count: preferences.length },
            meta: { request_id: crypto.randomUUID(), language: "el" },
            error: null
        })
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: { code: "VALIDATION_ERROR", message: "Invalid preferences payload", status: 400, details: error.issues } },
                { status: 400 }
            )
        }
        console.error(error)
        return NextResponse.json(
            { error: { code: "BAD_REQUEST", message: "Update failed", status: 400 } },
            { status: 400 }
        )
    }
}
