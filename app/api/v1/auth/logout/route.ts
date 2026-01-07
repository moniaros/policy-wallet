import { NextResponse } from "next/server"
import { signOut } from "@/auth"

export async function POST() {
    try {
        await signOut({ redirect: false })

        return NextResponse.json({
            data: { message: "Logged out successfully" },
            meta: { request_id: crypto.randomUUID(), language: "el" },
            error: null
        })
    } catch (error) {
        console.error("Logout failed:", error)
        return NextResponse.json(
            { error: { code: "INTERNAL_ERROR", message: "Logout failed", status: 500 } },
            { status: 500 }
        )
    }
}
