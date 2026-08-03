"use client"

import { RouteError } from "@/components/ui/RouteError"

// Scoped boundary for a deep advisor route. Without one, a failure here hit the
// shared (protected) boundary, which sends the user to /home — bouncing an
// advisor out of the client they were working on rather than letting them retry
// in place.
export default function DeepAgentRouteError(props: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    return <RouteError {...props} homeHref="/customers" />
}
