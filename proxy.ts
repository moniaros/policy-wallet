import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { rateLimit } from "@/lib/rate-limit"
import { getPostLoginRedirectByRole, getPrimaryRole } from "@/lib/auth/role-routing"
import { isIndexableDeployment } from "@/lib/seo/site"

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
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value
                },
                set(name: string, value: string, options: any) {
                    request.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                },
                remove(name: string, options: any) {
                    request.cookies.set({
                        name,
                        value: "",
                        ...options,
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({
                        name,
                        value: "",
                        ...options,
                    })
                },
            },
        }
    )

    const {
        data: { user },
    } = await supabase.auth.getUser()
    const isLoggedIn = Boolean(user)

    const isApiAuthRoute = nextUrl.pathname.startsWith("/api/auth")

    const publicPrefixes = [
        "/product",
        "/solutions",
        "/guides",
        // Insurance glossary hub + term pages (/lexiko, /lexiko/<term>) — public
        // AEO content; without this the proxy 307s crawlers to signin.
        "/lexiko",
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
        // PWA service-worker chunks (workbox-<hash>.js at the root)
        "/workbox-",
    ]
    const publicExactRoutes = [
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
        "/company",
        "/contact",
        "/for-agents",
        // Partner-benefits marketing page (404s until the first live partner).
        "/perks",
        "/landing",
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

    // Role-based route protection for authenticated users
    if (isLoggedIn && user) {
        const userRole = getPrimaryRole((user.user_metadata?.role as string) || "")

        const agentRoutes = ["/dashboard/agent", "/customers", "/opportunities", "/renewals", "/commissions", "/questionnaires", "/tasks", "/insights", "/team"]
        // "/home" stays listed: it still exists as a redirect to /dashboard, and an
        // agent landing on it must be bounced to their own home first. "/dashboard"
        // is deliberately NOT in this array — `startsWith` would also match
        // "/dashboard/agent" and bounce agents off their own home in a loop; it is
        // handled by the explicit guard below.
        const policyholderRoutes = ["/home", "/wallet", "/coverage-insights"]

        // /agent path is shared: /agent is policyholder's "My Agent", /agent/settings is agent settings
        const isPolicyholderAgentPage = nextUrl.pathname === "/agent" || nextUrl.pathname === "/agent/"

        const isAgentRoute = agentRoutes.some(r => nextUrl.pathname.startsWith(r))
        // "/dashboard" without "/dashboard/agent" prefix = policyholder dashboard
        const isPolicyholderRoute =
            policyholderRoutes.some(r => nextUrl.pathname.startsWith(r)) ||
            (nextUrl.pathname.startsWith("/dashboard") && !nextUrl.pathname.startsWith("/dashboard/agent"))

        // Agent trying to access policyholder-only routes
        if (userRole === "agent") {
            if (isPolicyholderRoute || isPolicyholderAgentPage) {
                return NextResponse.redirect(new URL("/dashboard/agent", nextUrl))
            }
        }

        // Policyholder trying to access agent-only routes
        if (userRole === "policyholder") {
            if (isAgentRoute) {
                return NextResponse.redirect(new URL("/dashboard", nextUrl))
            }
        }

        // Non-admin trying to access admin routes (already handled above for unauthenticated)
        if (nextUrl.pathname.startsWith("/admin") && userRole !== "admin") {
            const redirectTarget = userRole === "agent" ? "/dashboard/agent" : "/dashboard"
            return NextResponse.redirect(new URL(redirectTarget, nextUrl))
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
