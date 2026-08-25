"use client"

import { RouteError } from "@/components/ui/RouteError"

// Scoped boundary for /benefits: a partner-catalog read that throws is
// contained and retryable in place, instead of tearing down the shell.
export default function BenefitsRouteError(props: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    return <RouteError {...props} homeHref="/dashboard" />
}
