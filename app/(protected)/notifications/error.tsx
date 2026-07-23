"use client"

import { RouteError } from "@/components/ui/RouteError"

// Scoped boundary for the notifications history — contained and retryable in
// place; recovery returns to the policyholder home.
export default function NotificationsRouteError(props: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    return <RouteError {...props} homeHref="/dashboard" />
}
