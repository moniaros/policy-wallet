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
    // Finished means the WHOLE stage — profile complete and the tail walked. A
    // legacy account carries the finished flag from the old intake with no
    // profile at all; it must still be able to come in and say what matters.
    if (state.finished && state.status === "completed") redirect("/dashboard")
    const labels = getTranslations(state.language).onboarding.protectionProfile
    return <ProtectionProfileFlow initialState={state} labels={labels} language={state.language} />
}
