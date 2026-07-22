"use client"

import { RouteError } from "@/components/ui/RouteError"

// Scoped boundary for the policies list. A failure here (e.g. the self-healing
// stale-run query, or a widget throwing) is contained to this screen and
// retryable in place, rather than tearing down the whole protected shell.
// Recovery returns to the policyholder home.
export default function WalletRouteError(props: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    return <RouteError {...props} homeHref="/home" />
}
