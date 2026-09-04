"use client"

import { RouteError } from "@/components/ui/RouteError"

// Scoped boundary for one area of attention: a failed read is contained and
// retryable here, with the way back to «Η προστασία μου» — not the shell.
export default function ProtectionAreaRouteError(props: { error: Error & { digest?: string }; reset: () => void }) {
    return <RouteError {...props} homeHref="/protection?lens=risk" />
}
