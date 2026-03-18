import { NextResponse } from "next/server"

export const LEGACY_BILLING_REMOVAL_DATE = "2026-06-30"

export function withLegacyBillingDeprecationHeaders(response: NextResponse, replacementPath: string) {
    response.headers.set("Deprecation", "true")
    response.headers.set("Sunset", LEGACY_BILLING_REMOVAL_DATE)
    response.headers.set("X-API-Deprecated", "Legacy billing endpoint. Migrate to /api/v1/billing/*")
    response.headers.set("X-API-Replacement", replacementPath)
    response.headers.set("Link", `<${replacementPath}>; rel="successor-version"`)
    return response
}
