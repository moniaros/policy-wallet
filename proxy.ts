import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { rateLimit } from "@/lib/rate-limit"
import { getPostLoginRedirectByRole, getPrimaryRole } from "@/lib/auth/role-routing"

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
        "/auth",
        "/api/auth",
    ]
    const publicExactRoutes = [
        "/",
        "/en",
        "/terms",
        "/privacy",
        "/pricing",
        "/company",
        "/contact",
        "/api/contact",
        "/api/v1/contact",
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

    // Role-based route protection for authenticated users
    if (isLoggedIn && user) {
        const userRole = getPrimaryRole((user.user_metadata?.role as string) || "")

        const agentRoutes = ["/dashboard/agent", "/customers", "/opportunities", "/renewals", "/commissions", "/questionnaires", "/tasks", "/insights", "/team"]
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

    return response
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
}
