/**
 * Open-redirect guard for `returnTo`-style parameters.
 *
 * Only same-origin app paths pass: must start with a single "/", and must
 * not contain a backslash — the WHATWG URL parser treats "\" as "/" in
 * http(s) URLs, so "/\evil.com" would resolve to "//evil.com" (protocol-
 * relative, attacker host) when handed to router.push / redirect.
 *
 * Single source of truth — lib/billing.ts and the wallet edit/review pages
 * all route through this.
 */
export function sanitizeReturnPath(returnTo: string | null | undefined): string | null {
    if (!returnTo) return null
    if (!returnTo.startsWith("/")) return null
    if (returnTo.startsWith("//")) return null
    if (returnTo.includes("\\")) return null
    return returnTo
}
