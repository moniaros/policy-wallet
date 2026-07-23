"use client"

import { RouteError } from "@/components/ui/RouteError"

// Segment-level boundary for the whole /admin section. All 17 admin routes had
// NO error boundary, so an uncaught throw on any of them (they are the most
// query-heavy pages in the app) bubbled to the root and tore down the shell.
// One file at the segment covers every nested route; add a per-route error.tsx
// only where a screen needs bespoke recovery copy.
export default function AdminRouteError(props: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    return <RouteError {...props} homeHref="/admin/dashboard" />
}
