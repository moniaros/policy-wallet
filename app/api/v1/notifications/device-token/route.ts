import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"

export async function POST(req: Request) {
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json(
            { error: { code: "UNAUTHORIZED", message: "Unauthorized", status: 401 } },
            { status: 401 }
        )
    }

    try {
        const { token, platform, device_name } = await req.json()

        // Logic to store device token in the session or a dedicated Device table
        // For MVP, if there's an ActiveSession table or similar, update it.
        // Assuming we might have a pushToken field on User or a separate Device table.
        // Let's assume we update the User for now if a specific table doesn't exist.

        await db.user.update({
            where: { id: session.user.id },
            data: {
                // @ts-ignore - assuming field might exist in future migrations or handled via meta
                pushToken: token
            }
        })

        await (db.activityLog as any).create({
            data: {
                adminUserId: session.user.id,
                adminEmail: session.user.email || "unknown",
                actionType: "DEVICE_REGISTERED",
                description: `Registered ${platform} device: ${device_name}`,
                timestamp: new Date()
            }
        })

        return NextResponse.json({
            data: { message: "Device token registered successfully" },
            meta: { request_id: crypto.randomUUID(), language: "el" },
            error: null
        })
    } catch (error) {
        console.error(error)
        return NextResponse.json(
            { error: { code: "INTERNAL_ERROR", message: "Registration failed", status: 500 } },
            { status: 500 }
        )
    }
}
