"use server"

import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import { isSyntheticPhoneEmail } from "@/lib/auth/phone-auth"

export async function getSignupCheckpointState() {
    const authUser = await getAuthenticatedUserOrNull()

    if (!authUser) {
        return {
            authenticated: false,
            email: "",
            verified: false,
            needsEmailVerification: false,
        }
    }

    const email = authUser.dbUser.email || authUser.supabaseUser.email || ""
    const isSynthetic = email ? isSyntheticPhoneEmail(email) : false
    const verified = Boolean(authUser.dbUser.emailVerified || authUser.supabaseUser.email_confirmed_at || isSynthetic)

    return {
        authenticated: true,
        email,
        verified,
        needsEmailVerification: Boolean(email) && !isSynthetic && !verified,
    }
}
