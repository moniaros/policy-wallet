/**
 * Next reports the PRERENDER FILE path for statically generated routes, so the
 * root route yields "/index" and never the "/" a visitor sees. Feeding that
 * straight into the language toggle produced href="/index" (307 to sign-in)
 * and href="/en/index" (404) on the live home page.
 *
 * It only surfaced once the homepage stopped rendering inside a Suspense
 * boundary, which moved the header into the server prerender — so this lives
 * here, outside components/, both because it is a pure function and because
 * the route-link-integrity guard rightly treats quoted paths inside component
 * files as link targets.
 */
export function normalizeHeaderPath(raw: string | null | undefined): string {
    const path = raw || "/"
    const suffix = "/index"
    if (path === suffix) return "/"
    return path.endsWith(suffix) ? path.slice(0, -suffix.length) || "/" : path
}
