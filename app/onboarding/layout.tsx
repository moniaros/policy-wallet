import { getAuthenticatedUser, emailVerificationRequired } from "@/lib/auth-helpers"
import { redirect } from "next/navigation"
import { TranslationsProvider } from "@/contexts/TranslationsProvider"
import { AppProviders } from "@/components/providers/AppProviders"

export default async function OnboardingLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { dbUser } = await getAuthenticatedUser()

    // Email-verification hard gate (opt-in via the auth.enforce_email_verification
    // feature flag): don't let an unverified user onboard before verifying.
    if (await emailVerificationRequired(dbUser)) {
        redirect("/auth/signup/confirmation")
    }

    return (
        // AiConsentModal (shared with the protected tree) reads `t`.
        <AppProviders>
        <TranslationsProvider>
            {/* A landmark, not a plain div: onboarding is the first screen a
                new user meets, and it had no skip-link destination. */}
            <main className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 flex flex-col">
                {children}
            </main>
        </TranslationsProvider>
        </AppProviders>
    )
}
