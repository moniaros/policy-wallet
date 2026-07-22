"use client"

import { RouteError } from "@/components/ui/RouteError"

// Scoped boundary for a single help article — recovery returns to the Help
// Center rather than the app-wide home.
export default function HelpArticleRouteError(props: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    return <RouteError {...props} homeHref="/help" />
}
