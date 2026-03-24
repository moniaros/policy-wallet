import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { rateLimit } from "@/lib/rate-limit"

export async function proxy(request: NextRequest) {
    const { nextUrl } = request

    // Rate limit API routes (except stripe webhooks)
    if (nextUrl.pathname.startsWith("/api/") && !nextUrl.pathname.includes("/stripe/webhook")) {
        // @ts-ignore
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
        return NextResponse.redirect(new URL("/wallet", nextUrl))
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
        const userRole = (user.user_metadata?.role as string) || ""

        const policyholderRoutes = ["/home", "/wallet", "/coverage-insights"]
        const agentRoutes = ["/dashboard", "/customers", "/opportunities", "/renewals", "/commissions", "/questionnaires", "/tasks", "/insights", "/team"]

        // /agent path is shared: /agent is policyholder's "My Agent", /agent/settings is agent settings
        const isPolicyholderAgentPage = nextUrl.pathname === "/agent" || nextUrl.pathname === "/agent/"

        // Agent trying to access policyholder-only routes
        if (userRole === "agent") {
            if (policyholderRoutes.some(r => nextUrl.pathname.startsWith(r)) || isPolicyholderAgentPage) {
                return NextResponse.redirect(new URL("/dashboard", nextUrl))
            }
        }

        // Policyholder trying to access agent-only routes
        if (userRole === "policyholder") {
            if (agentRoutes.some(r => nextUrl.pathname.startsWith(r))) {
                return NextResponse.redirect(new URL("/home", nextUrl))
            }
        }

        // Non-admin trying to access admin routes (already handled above for unauthenticated)
        if (nextUrl.pathname.startsWith("/admin") && userRole !== "admin") {
            const redirectTarget = userRole === "agent" ? "/dashboard" : "/home"
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
