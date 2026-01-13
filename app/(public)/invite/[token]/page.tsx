
import { redeemInvite } from "@/app/auth/actions"
import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"

export default async function InviteRedeemPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params
    const authResult = await getAuthenticatedUserOrNull()

    // 1. Validate Token
    const invite = await db.invite.findUnique({ where: { token } })

    if (!invite || invite.consumedAt || invite.expiresAt < new Date()) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-stone-50">
                <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md">
                    <h1 className="text-xl font-bold text-red-600 mb-2">Invalid or Expired Link</h1>
                    <p className="text-stone-600">This invitation link is invalid or has already been used.</p>
                </div>
            </div>
        )
    }

    // 2. If logged in, redeem and redirect
    if (authResult) {
        await redeemInvite(token, authResult.dbUser.id)
        redirect("/wallet")
    }

    // 3. If not logged in, redirect to Signup
    redirect(`/auth/signup?token=${token}&email=${encodeURIComponent(invite.inviteeEmail)}`)
}
