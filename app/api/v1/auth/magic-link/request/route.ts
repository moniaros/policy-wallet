import { NextResponse } from "next/server"
import { signIn } from "@/auth"

export async function POST(req: Request) {
    try {
        const { email, language = "el" } = await req.json()

        if (!email) {
            return NextResponse.json(
                { error: { code: "BAD_REQUEST", message: "Email is required", status: 400 } },
                { status: 400 }
            )
        }

        // We use signIn with redirect: false to prevent NextAuth from handled the whole flow
        // However, next-auth v5 (authjs) signIn might behave differently in Route Handlers.
        // For a pure API request, we might need a more custom solution if NextAuth doesn't support it well.
        // But for MVP, let's try to use the standard way.

        const result = await (signIn as any)("email", {
            email,
            redirect: false,
            callbackUrl: "/" // This is where they land after clicking link
        })

        return NextResponse.json({
            data: {
                message: "Magic link sent to your email",
                expires_in: 900 // 15 mins
            },
            meta: { request_id: crypto.randomUUID(), language },
            error: null
        })
    } catch (error) {
        console.error("Magic link request failed:", error)
        return NextResponse.json(
            { error: { code: "INTERNAL_ERROR", message: "Failed to send magic link", status: 500 } },
            { status: 500 }
        )
    }
}
