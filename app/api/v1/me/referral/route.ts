import { NextResponse } from "next/server"
import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import { db } from "@/lib/db"

export async function GET() {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) {
        return NextResponse.json(
            { error: { code: "UNAUTHORIZED", message: "Unauthorized", status: 401 } },
            { status: 401 }
        )
    }

    try {
        const user = await db.user.findUnique({
            where: { id: authResult.dbUser.id },
            include: {
                referralsMade: {
                    include: { referred: { select: { email: true } } }
                }
            }
        })

        const referralCode = authResult.dbUser.name?.split(" ")[0].toUpperCase() + authResult.dbUser.id.substring(0, 4).toUpperCase()

        return NextResponse.json({
            data: {
                referral_code: referralCode,
                referral_link: `https://policywallet.gr/join/${referralCode}`,
                credits_earned: (user as any)?.referralsMade.reduce((acc: number, curr: any) => acc + curr.creditsEarned, 0) || 0,
                referrals: (user as any)?.referralsMade.map((r: any) => ({
                    id: r.id,
                    referred_email: r.referredEmail,
                    status: r.status,
                    credits_earned: r.creditsEarned,
                    created_at: r.createdAt
                }))
            },
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
