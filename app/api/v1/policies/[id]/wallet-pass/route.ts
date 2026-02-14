import { db } from "@/lib/db"
import { createGoogleWalletLink } from "@/lib/wallet/google"
import { createApplePass } from "@/lib/wallet/apple"
import { requireApiUser } from "@/lib/api-auth"
import { z } from "zod"
import { createApiResponse, createApiError } from "@/lib/api-utils"

const walletPassQuerySchema = z.object({
    type: z.enum(["google", "apple"]).default("google"),
})

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const authCheck = await requireApiUser()
    if ("error" in authCheck) return authCheck.error
    const authResult = authCheck.auth

    const { id } = await params

    try {
        const policy = await db.policy.findFirst({
            where: {
                id,
                ownerUserId: authResult.dbUser.id
            }
        })

        if (!policy) {
            return createApiError("NOT_FOUND", "Policy not found", 404)
        }

        const { searchParams } = new URL(req.url)
        const queryParse = walletPassQuerySchema.safeParse({
            type: searchParams.get("type") ?? undefined,
        })
        if (!queryParse.success) {
            return createApiError("VALIDATION_ERROR", "Invalid pass type", 400, queryParse.error.issues)
        }
        const { type } = queryParse.data

        if (type === 'google') {
            try {
                const saveUrl = await createGoogleWalletLink(policy, authResult.dbUser)
                return createApiResponse({ pass_url: saveUrl }, "en")
            } catch (e: any) {
                console.error("Google Wallet Error:", e)
                return createApiError("CONFIG_ERROR", e.message || "Failed to generate Google Pass", 500)
            }
        }

        if (type === 'apple') {
            try {
                // In production, this returns a Buffer (file content)
                // Since our helper currently throws because of missing certs, catching it here.
                await createApplePass(policy, authResult.dbUser)

                // If it succeeded (we had certs), we would return:
                // return new NextResponse(buffer, { headers: { 'Content-Type': 'application/vnd.apple.pkpass' } })
                return createApiResponse({ message: "Apple Wallet pass generated" })
            } catch (e: any) {
                console.error("Apple Wallet Error:", e)
                return createApiError("CONFIG_ERROR", e.message || "Apple Wallet signing unavailable", 500)
            }
        }

        return createApiError("BAD_REQUEST", "Invalid pass type", 400)

    } catch (error) {
        console.error(error)
        return createApiError("INTERNAL_ERROR", "Failed to generate pass", 500)
    }
}
