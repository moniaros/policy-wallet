"use client"

import { RouteError } from "@/components/ui/RouteError"

// NOT filling a missing boundary: app/(protected)/customers/error.tsx already
// cascades to this nested segment. This one exists to make recovery CONTEXTUAL
// — the parent sends the advisor to /dashboard/agent, which drops them out of
// the client list they were working in; this returns them to /customers.
export default function DeepAgentRouteError(props: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    return <RouteError {...props} homeHref="/customers" />
}
