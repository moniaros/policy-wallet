import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"

export async function GET() {
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json(
            { error: { code: "UNAUTHORIZED", message: "Unauthorized", status: 401 } },
            { status: 401 }
        )
    }

    try {
        const preferences = await (db as any).notificationPreference.findMany({
            where: { userId: session.user.id }
        })

        // Default categories if nothing set
        const defaultEvents = ["policy_expiring", "gap_detected", "questionnaire_received"]

        const result = defaultEvents.map(event => {
            const userPrefs = preferences.filter((p: any) => p.eventType === event)
            return {
                event_type: event,
                channels: {
                    email: userPrefs.find((p: any) => p.channel === "email")?.enabled ?? true,
                    push: userPrefs.find((p: any) => p.channel === "push")?.enabled ?? true,
                    sms: userPrefs.find((p: any) => p.channel === "sms")?.enabled ?? false
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
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json(
            { error: { code: "UNAUTHORIZED", message: "Unauthorized", status: 401 } },
            { status: 401 }
        )
    }

    try {
        const { preferences } = await req.json()

        for (const pref of preferences) {
            await (db as any).notificationPreference.upsert({
                where: {
                    userId_eventType_channel: {
                        userId: session.user.id,
                        eventType: pref.event_type,
                        channel: pref.channel
                    }
                },
                update: { enabled: pref.enabled },
                create: {
                    userId: session.user.id,
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
        console.error(error)
        return NextResponse.json(
            { error: { code: "BAD_REQUEST", message: "Update failed", status: 400 } },
            { status: 400 }
        )
    }
}
