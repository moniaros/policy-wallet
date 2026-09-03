import { redirect } from "next/navigation"
import { getTranslations } from "@/lib/i18n"
import { getProtectionOnboardingState } from "./protection-profile-actions"
import { ProtectionProfileFlow } from "./ProtectionProfileFlow"

/**
 * The first stage: the Personal Protection Profile. A finished stage lands on
 * the dashboard directly (the old `/home` hop was a 307 to the same place).
 */
export default async function OnboardingPage() {
    const state = await getProtectionOnboardingState()
    if (state.finished) redirect("/dashboard")
    const labels = getTranslations(state.language).onboarding.protectionProfile
    return <ProtectionProfileFlow initialState={state} labels={labels} language={state.language} />
}
