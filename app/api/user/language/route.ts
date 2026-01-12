import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
    try {
        const authResult = await getAuthenticatedUserOrNull()
        if (!authResult) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { language } = await request.json()

        if (language !== 'el' && language !== 'en') {
            return NextResponse.json({ error: "Invalid language" }, { status: 400 })
        }

        await db.user.update({
            where: { id: authResult.dbUser.id },
            data: { preferredLanguage: language },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error updating language:', error)
        return NextResponse.json({ error: "Failed to update language" }, { status: 500 })
    }
}
