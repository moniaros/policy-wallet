import { NextResponse } from "next/server"
import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { createGoogleWalletLink } from "@/lib/wallet/google"
import { createApplePass } from "@/lib/wallet/apple"

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) {
        return NextResponse.json(
            { error: { code: "UNAUTHORIZED", message: "Unauthorized", status: 401 } },
            { status: 401 }
        )
    }

    const { id } = await params

    try {
        const policy = await db.policy.findFirst({
            where: {
                id,
                ownerUserId: authResult.dbUser.id
            }
        })

        if (!policy) {
            return NextResponse.json(
                { error: { code: "NOT_FOUND", message: "Policy not found", status: 404 } },
                { status: 404 }
            )
        }

        const { searchParams } = new URL(req.url)
        const type = searchParams.get('type') || 'google' // default to google if not specified

        if (type === 'google') {
            try {
                const saveUrl = await createGoogleWalletLink(policy, authResult.dbUser)
                return NextResponse.json({
                    data: {
                        pass_url: saveUrl,
                    },
                    meta: { language: "en" },
                    error: null
                })
            } catch (e: any) {
                console.error("Google Wallet Error:", e)
                return NextResponse.json(
                    { error: { code: "CONFIG_ERROR", message: e.message || "Failed to generate Google Pass" } },
                    { status: 500 }
                )
            }
        }

        if (type === 'apple') {
            try {
                // In production, this returns a Buffer (file content)
                // Since our helper currently throws because of missing certs, catching it here.
                await createApplePass(policy, authResult.dbUser)

                // If it succeeded (we had certs), we would return:
                // return new NextResponse(buffer, { headers: { 'Content-Type': 'application/vnd.apple.pkpass' } })
            } catch (e: any) {
                console.error("Apple Wallet Error:", e)
                return NextResponse.json(
                    { error: { code: "CONFIG_ERROR", message: e.message || "Apple Wallet signing unavailable" } },
                    { status: 500 }
                )
            }
        }

        return NextResponse.json({ error: "Invalid pass type" }, { status: 400 })

    } catch (error) {
        console.error(error)
        return NextResponse.json(
            { error: { code: "INTERNAL_ERROR", message: "Failed to generate pass", status: 500 } },
            { status: 500 }
        )
    }
}
