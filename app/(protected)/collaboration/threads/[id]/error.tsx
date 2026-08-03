"use client"

import { RouteError } from "@/components/ui/RouteError"

// A genuine gap: there is no app/(protected)/collaboration/error.tsx, so a
// failure here fell through to the shared (protected) boundary, which recovers
// to /home — bouncing an advisor out of the conversation they were in. This
// contains it and returns them to /customers.
export default function DeepAgentRouteError(props: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    return <RouteError {...props} homeHref="/customers" />
}
