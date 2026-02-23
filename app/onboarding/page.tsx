import { getOnboardingState } from "./actions"
import OnboardingFlow from "./flow"
import { redirect } from "next/navigation"

export default async function OnboardingPage() {
    const initialState = await getOnboardingState()
    if (initialState.completed) {
        redirect("/home")
    }

    return (
        <OnboardingFlow initialState={initialState} />
    )
}
