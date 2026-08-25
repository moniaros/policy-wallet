import { DashboardSkeleton } from "@/components/ui/LoadingSkeleton"

/**
 * «Η προστασία μου» is a multi-await server component (auth, entitlements, the
 * gap-engine snapshot) — without a loading state it flashed blank on a slow load
 * while every sibling data route (dashboard, insights, wallet, renewals…) showed
 * a skeleton. Reuses the policyholder DashboardSkeleton, matching this page's
 * score-card-plus-cards shape and the dashboard's own loading.tsx.
 */
export default function ProtectionLoading() {
    return <DashboardSkeleton />
}
