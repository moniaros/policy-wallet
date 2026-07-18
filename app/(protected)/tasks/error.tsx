"use client"

import { RouteError } from "@/components/ui/RouteError"

// Scoped boundary for the (role-shared) action center: a failure here is
// contained to this screen and retryable in place. Recovery returns to /home —
// the universal landing that routes by role — since /tasks is reached by
// policyholders too, and sending them to the agent dashboard would 403.
export default function TasksRouteError(props: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    return <RouteError {...props} homeHref="/home" />
}
