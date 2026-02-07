import { getOnboardingState } from "./actions"
import OnboardingFlow from "./flow"

export default async function OnboardingPage() {
    const initialState = await getOnboardingState()

    return (
        <OnboardingFlow initialState={initialState} />
    )
}
