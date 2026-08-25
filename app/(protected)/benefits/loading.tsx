import { DashboardSkeleton } from "@/components/ui/LoadingSkeleton"

/**
 * /benefits joined the settings map in V2-P2-03 (§4.2: its entry lives inside
 * Ρυθμίσεις, live-offers-gated), and every settings section ships its own
 * loading state. Card-grid shape, so the dashboard skeleton fits.
 */
export default function BenefitsLoading() {
    return <DashboardSkeleton />
}
