import { getAuthenticatedUser, emailVerificationRequired } from "@/lib/auth-helpers"
import { redirect } from "next/navigation"

export default async function OnboardingLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { dbUser } = await getAuthenticatedUser()

    // Email-verification hard gate (opt-in via ENFORCE_EMAIL_VERIFICATION):
    // don't let an unverified user onboard before verifying.
    if (emailVerificationRequired(dbUser)) {
        redirect("/auth/signup/confirmation")
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 flex flex-col">
            {children}
        </div>
    )
}
