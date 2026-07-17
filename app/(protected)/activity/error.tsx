"use client"

import { RouteError } from "@/components/ui/RouteError"

// Scoped agent-route boundary: a failure here is contained to this screen and
// retryable in place, and recovery returns to the agent dashboard (the app-wide
// boundary sends everyone to /home).
export default function AgentRouteError(props: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    return <RouteError {...props} homeHref="/dashboard/agent" />
}
