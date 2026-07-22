"use client"

import { RouteError } from "@/components/ui/RouteError"

// Scoped boundary for a single policy's detail page. A failure loading one
// policy (gaps, shares, recommendations) is contained and retryable here;
// recovery returns to the wallet list rather than the app-wide home.
export default function PolicyDetailRouteError(props: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    return <RouteError {...props} homeHref="/wallet" />
}
