"use client"

import { RouteError } from "@/components/ui/RouteError"

// Scoped boundary for coverage-insights. Its multi-await server render (auth,
// entitlements, gap-engine snapshot) can throw; contain it here — retryable in
// place — instead of the app-wide boundary tearing down the protected shell.
export default function CoverageInsightsRouteError(props: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    return <RouteError {...props} homeHref="/dashboard" />
}
