"use client"

import { RouteError } from "@/components/ui/RouteError"

/**
 * App-wide error boundary for the authenticated app. Individual agent routes
 * add their own (more granular, agent-dashboard-anchored) boundaries; this is
 * the fallback for everything else, keeping the shell and offering recovery.
 */
export default function ProtectedError(props: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    return <RouteError {...props} />
}
