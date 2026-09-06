import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { rateLimit } from "@/lib/rate-limit"
import { getPostLoginRedirectByRole, getPrimaryRole, type AppRole } from "@/lib/auth/role-routing"
import { isIndexableDeployment } from "@/lib/seo/site"
import { redactCredentials } from "@/lib/observability/sentry-scrub"

// ---------------------------------------------------------------------------
// Role ownership of authenticated routes — ONE declared table, matched on
// whole path segments, most specific pattern wins.
//
// This replaced two prefix arrays (`agentRoutes` / `policyholderRoutes`) plus
// hand-written exception guards. A raw `startsWith` cannot say "this child
// belongs to a different role than its parent": /insights/risk-profile (B2C —
// it reads the caller's OWN policyholderProfile) starts with /insights (the
// adviser's book), so every policyholder was bounced to /dashboard and the
// surface was unreachable; /wallet/[id]/review (agent-only extraction review,
// linked from the agent customer-policy page) starts with /wallet, so agents
// were bounced off it to /dashboard/agent. The identical collision had
// already been found for /dashboard vs /dashboard/agent and patched with a
// special case — the flaw was the RULE, so the rule changed instead of a
// third exception growing beside the first two.
//
// Semantics:
//   - A pattern matches when each of its segments equals the corresponding
//     leading segment of the request path: "/insights" matches /insights and
//     /insights/book, never /insightsfoo. "*" matches exactly one segment of
//     any value.
//   - The most specific match decides the owner: most segments wins, and on
//     equal length the one with fewer wildcards. A child's row therefore
//     overrides its parent's — that is the whole mechanism.
//   - No match means the proxy imposes no role gate and the surface gates
//     itself underneath (defense in depth — layouts, requireApiUser,
//     getPolicyAccess). "shared" declares that explicitly for a child inside
//     an owned tree, should one ever need carving out.
//   - Admins are never bounced (unchanged): agent/policyholder hitting an
//     "admin"-owned tree go to their own home.
//
// Ownership follows docs/transformation/SURFACES.md, and
// tests/unit/route-ownership-surfaces.test.ts enumerates that document to
// assert every route stays reachable by the role that owns it — the next
// parent/child collision fails CI instead of stranding a surface in
// production.

export type RouteOwner = "policyholder" | "agent" | "admin"

export const ROUTE_OWNERSHIP: ReadonlyArray<readonly [pattern: string, owner: RouteOwner | "shared"]> = [
    ["/dashboard", "policyholder"],
    ["/dashboard/agent", "agent"],
    // Legacy redirect to /dashboard (handled before the role gate runs, so an
    // agent takes two hops: /home → /dashboard → /dashboard/agent).
    ["/home", "policyholder"],
    ["/wallet", "policyholder"],
    // Agent-only extraction review under the policyholder's wallet tree.
    ["/wallet/*/review", "agent"],
    // §4.2: «Η προστασία μου» — absorbed /branches, /insights/risk-profile
    // and /coverage-insights (all removed by V2-P2-03).
    ["/protection", "policyholder"],
    // Shared /agent tree: the exact page is the customer's "My Agent" view;
    // the children are the agent's own tools.
    ["/agent", "policyholder"],
    ["/agent/settings", "agent"],
    ["/agent/pricing", "agent"],
    ["/customers", "agent"],
    ["/opportunities", "agent"],
    ["/renewals", "agent"],
    ["/commissions", "agent"],
    ["/questionnaires", "agent"],
    ["/tasks", "agent"],
    // The adviser's book. (/insights/risk-profile, the customer's own child
    // route that once carved an exception here, was removed by V2-P2-03 —
    // its content lives at /protection?lens=risk.)
    ["/insights", "agent"],
    ["/team", "agent"],
    ["/admin", "admin"],
]

/**
 * Owner of the most specific ROUTE_OWNERSHIP pattern matching `pathname`, or
 * null when nothing matches. "shared" also resolves to null — both mean the
 * proxy imposes no role gate here.
 */
export function resolveRouteOwner(pathname: string): RouteOwner | null {
    const segments = pathname.split("/").filter(Boolean)
    let bestOwner: RouteOwner | "shared" | null = null
    let bestLength = -1
    let bestWildcards = Number.MAX_SAFE_INTEGER
    for (const [pattern, owner] of ROUTE_OWNERSHIP) {
        const patternSegments = pattern.split("/").filter(Boolean)
        if (patternSegments.length > segments.length) continue
        let wildcards = 0
        let matches = true
        for (let i = 0; i < patternSegments.length; i++) {
            if (patternSegments[i] === "*") {
                wildcards += 1
            } else if (patternSegments[i] !== segments[i]) {
                matches = false
                break
            }
        }
        if (!matches) continue
        if (
            patternSegments.length > bestLength ||
            (patternSegments.length === bestLength && wildcards < bestWildcards)
        ) {
            bestOwner = owner
            bestLength = patternSegments.length
            bestWildcards = wildcards
        }
    }
    return bestOwner === "shared" ? null : bestOwner
}

/**
 * The role-gate decision for an authenticated request: the path to bounce to,
 * or null to let the request through. Pure — the route-ownership guard test
 * drives this directly, and proxy() below does nothing but obey it.
 */
export function decideRoleRedirect(pathname: string, role: AppRole): "/dashboard" | "/dashboard/agent" | null {
    // Admins pass everywhere, including their own /admin tree (unchanged from
    // the old guards).
    if (role === "admin") return null
    const owner = resolveRouteOwner(pathname)
    if (owner === null || owner === role) return null
    return role === "agent" ? "/dashboard/agent" : "/dashboard"
}

export async function proxy(request: NextRequest) {
    const { nextUrl } = request

    // Rate limit API routes (except stripe webhooks)
    if (nextUrl.pathname.startsWith("/api/") && !nextUrl.pathname.includes("/stripe/webhook")) {
        // @ts-expect-error request.ip can be undefined depending on runtime adapter.
        const ip = request.ip || request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "127.0.0.1"
        const limitCheck = await rateLimit(ip, 60, 60000)
        if (!limitCheck.success) {
            return new NextResponse(
                JSON.stringify({ error: { code: "TOO_MANY_REQUESTS", message: "Global rate limit exceeded. Please try again later." } }),
                { status: 429, headers: { "Content-Type": "application/json" } }
            )
        }
    }

    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            // ONE cookie adapter shape, the same one `lib/supabase/server.ts`
            // uses. This was the legacy per-name `get`/`set`/`remove` trio, and
            // it was broken in two independent ways that compounded:
            //
            //   1. Supabase CHUNKS an auth cookie past ~3.2KB into
            //      `sb-<ref>-auth-token.0`, `.1`, … A `get(name)` reads the one
            //      cookie it was asked for and can never reassemble the chunks,
            //      so the library received a truncated value. That is the
            //      production `TypeError: Cannot create property 'user' on
            //      string '{"access_token":…'` — `_recoverAndRefresh` got a raw
            //      string where a parsed session belonged.
            //   2. `set` rebuilt `response` from scratch on EVERY call, so
            //      writing a chunked session discarded the cookie written by the
            //      previous call and only the last chunk survived onto the
            //      response — which persisted the broken state for the next
            //      request to trip over.
            //
            // Only an account whose serialised session clears the chunking
            // threshold hits it, which is why it read as one user's problem
            // rather than a middleware bug. Rebuild the response ONCE, after
            // the whole batch.
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    response = NextResponse.next({ request })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // SEC-01. `getUser()` can THROW, and its throw is the leak.
    //
    // `_recoverAndRefresh` interpolates the entire session into the error
    // message, so an escaping throw hands the platform's log sink a live access
    // token and a live refresh token. That happened eight times before this
    // catch existed: the message went to the Vercel runtime log verbatim,
    // where it is neither redactable nor deletable.
    //
    // Nothing here is a place to be clever about the error. Anonymous is the
    // correct and safe interpretation of "we could not establish a session" —
    // the caller gets the signin redirect the rest of this function already
    // knows how to produce, and the reason is recorded WITHOUT its payload.
    let user: Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"] = null
    try {
        const result = await supabase.auth.getUser()
        user = result.data.user
    } catch (error) {
        console.error(
            "[proxy] session could not be resolved; treating request as anonymous:",
            redactCredentials(error instanceof Error ? error.message : String(error))
        )
    }
    const isLoggedIn = Boolean(user)

    const isApiAuthRoute = nextUrl.pathname.startsWith("/api/auth")

    const publicPrefixes = [
        // Vercel's own injected assets (/_vercel/insights/script.js,
        // /_vercel/speed-insights/…). Unallowlisted they 307 to signin and
        // analytics silently never loads — same failure shape as the cron
        // 307 trap, only visible in a real browser against production.
        "/_vercel",
        "/product",
        "/solutions",
        "/guides",
        // Insurance glossary hub + term pages (/lexiko, /lexiko/<term>) — public
        // AEO content; without this the proxy 307s crawlers to signin.
        "/lexiko",
        // The public needs check. The whole point of the page is that a
        // stranger can use it before deciding anything, so a signin redirect
        // here would remove the only ungated thing on the site.
        "/needs",
        "/auth",
        "/api/auth",
        // English marketing-page variants (/en/product, /en/pricing, …)
        "/en/",
        // Cookie consent from anonymous visitors — POST /api/v1/consents and
        // GET /api/v1/consents/current, hence a PREFIX rather than an exact
        // entry. Same class as the cron trap: the route inventory declares
        // both `auth: public` with a rate limit, CI enforces that, and the
        // proxy still 307'd them to signin, so the banner's POST died as a 405
        // on every page of the site. The visitor's CHOICE was never lost (the
        // banner writes the cookie and emits the change before the fetch) —
        // what was missing is the server-side record GDPR Art. 7(1) wants.
        // Both routes rate-limit and zod-validate themselves.
        "/api/v1/consents",
        // Invite redemption: anonymous recipients must reach the token page,
        // which itself redirects them to signup with the invite pre-filled.
        // Blocking this here bounced every agent→client invite to signin.
        "/invite/",
        // Scheduled jobs (Vercel Cron) + QStash workers. Cron requests carry no
        // Supabase session, so without this the proxy 307-redirected every
        // firing to /auth/signin — a redirect Vercel counts as a "successful"
        // ping — silently killing the renewal ladder and all lifecycle emails.
        // Each route self-authenticates (CRON_SECRET / QStash signature / admin
        // role), same defense-in-depth as the Stripe webhooks below.
        "/api/v1/jobs/",
    ]
    const publicExactRoutes = [
        // Declared auth:"public" in the route-policy inventory, but it was never
        // allowlisted here — so an uptime probe got a 307 to /auth/signin, which
        // a load balancer reads as either "up" (it followed the redirect) or
        // "down". A health check behind a login wall checks nothing.
        "/api/health",
        "/",
        "/en",
        "/terms",
        "/privacy",
        // Legal set: cookie policy + subprocessors list must be reachable
        // anonymously (linked from the privacy policy and the public footer).
        "/cookies",
        "/subprocessors",
        "/pricing",
        // Honest comparison against the alternatives a Greek household
        // actually has. Linked from the homepage and the footer, so it must be
        // reachable anonymously or every visitor hits a login wall.
        "/compare",
        "/trust",
        // PW-CONTENT-01 Goal 7: the public trust pages (Greek and their /en pairs).
        "/methodology",
        "/changelog",
        "/status",
        "/en/methodology",
        "/en/changelog",
        "/en/status",
        "/platform",
        "/company",
        "/contact",
        "/for-agents",
        // Partner-benefits marketing page (404s until the first live partner).
        "/perks",
        "/landing",
    // Grafí living styleguide — the page itself 404s in production builds.
    "/styleguide",
        "/api/contact",
        "/api/v1/contact",
        // Anonymous newsletter capture from the public footer — without this entry
        // the proxy 307s the POST to signin and every lead is dropped. (Replaces the
        // old /api/v1/landing/waitlist HubSpot route, which is gone.) The route
        // rate-limits + zod-validates itself.
        "/api/v1/newsletter/subscribe",
        // Stripe webhooks: anonymous POSTs from Stripe's servers — a signin
        // redirect here silently kills event delivery. The routes verify the
        // Stripe-Signature header themselves (defense in depth).
        "/api/v1/billing/webhook",
        "/api/stripe/webhook",
        // Crawl infrastructure + link previews: redirecting these to the
        // sign-in page hides the whole site from search and AI crawlers
        // (SEO audit, critical finding #1).
        "/robots.txt",
        "/sitemap.xml",
        "/opengraph-image",
        // The English link-preview card. A separate stable route because Next
        // hashes NESTED metadata routes per build, so /en/opengraph-image
        // could never be referenced from metadata. Without this entry the
        // proxy fails closed and every English share loses its preview.
        "/opengraph-image-en",
        "/twitter-image",
        // PWA service worker + Sentry browser tunnel for anonymous visitors
        "/sw.js",
        "/monitoring",
    ]
    const isPublicRoute =
        publicExactRoutes.includes(nextUrl.pathname) ||
        publicPrefixes.some((prefix) => nextUrl.pathname.startsWith(prefix))

    const isAuthRoute = nextUrl.pathname.startsWith("/auth")

    if (isApiAuthRoute) {
        return response
    }

    if (
        isAuthRoute &&
        isLoggedIn &&
        !nextUrl.pathname.startsWith("/auth/verify-email") &&
        !nextUrl.pathname.startsWith("/auth/signup/confirmation")
    ) {
        const roleRoute = getPostLoginRedirectByRole(String(user?.user_metadata?.role || ""))
        return NextResponse.redirect(new URL(roleRoute, nextUrl))
    }

    if (nextUrl.pathname.startsWith("/admin") && !isLoggedIn) {
        const encodedCallbackUrl = encodeURIComponent(nextUrl.pathname + nextUrl.search)
        return NextResponse.redirect(new URL(`/auth/signin?callbackUrl=${encodedCallbackUrl}`, nextUrl))
    }

    if (!isLoggedIn && !isPublicRoute) {
        let callbackUrl = nextUrl.pathname
        if (nextUrl.search) {
            callbackUrl += nextUrl.search
        }

        const encodedCallbackUrl = encodeURIComponent(callbackUrl)
        return NextResponse.redirect(new URL(`/auth/signin?callbackUrl=${encodedCallbackUrl}`, nextUrl))
    }

    // Canonical dashboard URL. /home and /dashboard rendered the SAME policyholder
    // dashboard, splitting analytics and breaking nav active-state (the sidebar
    // links to /dashboard, so /home visitors saw nothing highlighted). The page
    // component now lives at dashboard/PolicyholderHome.tsx. Doing this here
    // rather than with redirect() in the page gives a real 307 before any render
    // — a page-level redirect streams inside the RSC payload as a 200.
    if (nextUrl.pathname === "/home" || nextUrl.pathname === "/home/") {
        return NextResponse.redirect(new URL(`/dashboard${nextUrl.search}`, nextUrl))
    }

    // §4.2: /coverage → «Η προστασία μου». Here, not in the page, for the reason
    // the comment above gives — and this one is the proof of it. The page
    // `app/(protected)/coverage/page.tsx` calls redirect("/protection") and has
    // been answering **200** with `NEXT_REDIRECT` serialised into the body: the
    // customer got the app shell with an empty content area instead of arriving.
    // /home looked healthy only because the proxy already owned that path, which
    // hid the defect for the one legacy redirect that did not.
    if (nextUrl.pathname === "/coverage" || nextUrl.pathname === "/coverage/") {
        return NextResponse.redirect(new URL(`/protection${nextUrl.search}`, nextUrl))
    }

    // Role-based route protection for authenticated users — the decision is
    // decideRoleRedirect's alone (see above); this block only executes it.
    if (isLoggedIn && user) {
        const userRole = getPrimaryRole((user.user_metadata?.role as string) || "")
        const bounceTo = decideRoleRedirect(nextUrl.pathname, userRole)
        if (bounceTo) {
            return NextResponse.redirect(new URL(bounceTo, nextUrl))
        }
    }

    // Preview/branch deploys must never be indexed — belt (this header) and
    // braces (the robots meta tag from app/layout.tsx + robots.txt disallow).
    if (!isIndexableDeployment()) {
        response.headers.set("X-Robots-Tag", "noindex, nofollow")
    }

    return response
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
}
