import { DashboardSkeleton } from "@/components/ui/LoadingSkeleton"

/**
 * The agent's landing page had an error boundary but no loading state, so the
 * busiest B2B screen showed nothing at all while its data resolved — every other
 * agent route (customers, renewals, opportunities, commissions, team,
 * questionnaires, insights) already had one.
 */
export default function AgentDashboardLoading() {
    return <DashboardSkeleton />
}
