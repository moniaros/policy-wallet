import { DashboardSkeleton } from "@/components/ui/LoadingSkeleton"

/**
 * «Συστάσεις» awaits auth, entitlements and the gap-engine snapshot; without a
 * loading state it would flash blank while every sibling route shows a
 * skeleton. Same skeleton as /protection and the home.
 */
export default function RecommendationsLoading() {
    return <DashboardSkeleton />
}
