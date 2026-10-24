import { PlanFactsProvider } from "@/components/monetization/PlanFactsProvider"
import { getClientPlanFacts } from "@/lib/pricing/plan-catalog"

/**
 * The sign-up confirmation page states the Family trial with its length and price
 * (PW-C02-D10). Outside `app/(protected)` no provider carries the live plan rows, so
 * `usePlanFacts` silently fell back to the code constants and an /admin/plans edit left
 * this sentence stale (review pass 10, I3). This layout mounts the same provider the
 * signed-in app uses, fed by the same catalogue read.
 */
export default async function SignupConfirmationLayout({ children }: { children: React.ReactNode }) {
    const planFacts = await getClientPlanFacts()
    return <PlanFactsProvider facts={planFacts}>{children}</PlanFactsProvider>
}
