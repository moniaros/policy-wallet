import { getAuthenticatedUser, emailVerificationRequired } from "@/lib/auth-helpers"
import { redirect } from "next/navigation"
import { TranslationsProvider } from "@/contexts/TranslationsProvider"

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
        // AiConsentModal (shared with the protected tree) reads `t`.
        <TranslationsProvider>
            {/* A landmark, not a plain div: onboarding is the first screen a
                new user meets, and it had no skip-link destination. */}
            <main className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 flex flex-col">
                {children}
            </main>
        </TranslationsProvider>
    )
}
