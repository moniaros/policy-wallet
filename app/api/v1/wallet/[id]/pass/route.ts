import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { createApiError } from "@/lib/api-utils"

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return createApiError("UNAUTHORIZED", "Unauthorized", 401)

    const { id: policyId } = await params

    try {
        const policy = await db.policy.findUnique({
            where: { id: policyId },
            include: { owner: true }
        })

        if (!policy || policy.ownerUserId !== authResult.dbUser.id) {
            return createApiError("NOT_FOUND", "Policy not found", 404)
        }

        // In a production environment:
        // 1. Generate PassKit JSON (pass.json)
        // 2. Add images (logo, icon)
        // 3. Sign with Apple Developer Certificate
        // 4. Bundle into a .zip named .pkpass

        // For MVP/Mock:
        // We return a mock buffer with the correct Apple Wallet Mime Type
        // This allows mobile developers to test the "Add to Apple Wallet" flow.

        const mockPassContent = `MOCK_PASS_CONTENT_FOR_POLICY_${policy.policyNumber}`
        const buffer = Buffer.from(mockPassContent)

        return new Response(buffer, {
            headers: {
                'Content-Type': 'application/vnd.apple.pkpass',
                'Content-Disposition': `attachment; filename="policy_${policy.policyNumber}.pkpass"`,
                'Cache-Control': 'no-cache'
            }
        })

    } catch (error) {
        console.error("Pass Generation Error:", error)
        return createApiError("INTERNAL_ERROR", "Failed to generate wallet pass", 500)
    }
}
