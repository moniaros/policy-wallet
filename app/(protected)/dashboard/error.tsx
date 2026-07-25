"use client"

import { RouteError } from "@/components/ui/RouteError"

// Scoped boundary for the policyholder home. A failure in its multi-await server
// render (policies, entitlements, cached score, recommendations) is contained to
// this screen and retryable in place, rather than falling through to the app-wide
// boundary and tearing down the whole protected shell. Recovery returns home.
export default function DashboardRouteError(props: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    return <RouteError {...props} homeHref="/dashboard" />
}
