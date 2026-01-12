import { NextResponse } from "next/server"
import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import { db } from "@/lib/db"

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

        // Stub payload for Wallet Pass
        return NextResponse.json({
            data: {
                pass_type: "apple_wallet",
                pass_url: `https://api.policywallet.gr/v1/passes/${policy.id}.pkpass`,
                expires_at: new Date(Date.now() + 3600000), // 1 hour link
                fields: {
                    label: "Policy Wallet",
                    insurer: policy.insurerName,
                    policy_id: policy.policyNumber,
                    holder: authResult.dbUser.name || "Policy Holder",
                    expiration: policy.endDate.toISOString().split('T')[0]
                }
            },
            meta: { request_id: crypto.randomUUID(), language: "el" },
            error: null
        })
    } catch (error) {
        console.error(error)
        return NextResponse.json(
            { error: { code: "INTERNAL_ERROR", message: "Failed to generate pass", status: 500 } },
            { status: 500 }
        )
    }
}
