import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
    const { nextUrl } = request

    // Create a Supabase client configured to use cookies
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
                        value: '',
                        ...options,
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({
                        name,
                        value: '',
                        ...options,
                    })
                },
            },
        }
    )

    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    const isLoggedIn = !!user

    const isApiAuthRoute = nextUrl.pathname.startsWith("/api/auth")

    // Public routes — exact matches OR prefix matches for sub-pages
    const publicPrefixes = [
        "/product",    // /product, /product/motor, /product/property, etc.
        "/auth",       // all auth sub-routes
        "/api/auth",   // auth API routes
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

    // Allow API routes
    if (isApiAuthRoute) {
        return response
    }

    // If logged in and trying to access auth pages, redirect to wallet.
    // Keep verification + signup confirmation accessible to complete first-login flow.
    if (
        isAuthRoute &&
        isLoggedIn &&
        !nextUrl.pathname.startsWith('/auth/verify-email') &&
        !nextUrl.pathname.startsWith('/auth/signup/confirmation')
    ) {
        return NextResponse.redirect(new URL("/wallet", nextUrl))
    }

    // Role-Based Access Control (RBAC)
    // Note: detailed role checks (e.g. admin vs agent) are handled in Layouts/Server Components
    // because role data resides in the application database (Prisma), not the auth session.

    // Explicitly protect admin routes
    if (nextUrl.pathname.startsWith('/admin') && !isLoggedIn) {
        const encodedCallbackUrl = encodeURIComponent(nextUrl.pathname + nextUrl.search)
        return NextResponse.redirect(new URL(`/auth/signin?callbackUrl=${encodedCallbackUrl}`, nextUrl))
    }

    // If not logged in and trying to access protected routes, redirect to signin
    if (!isLoggedIn && !isPublicRoute) {
        let callbackUrl = nextUrl.pathname
        if (nextUrl.search) {
            callbackUrl += nextUrl.search
        }

        const encodedCallbackUrl = encodeURIComponent(callbackUrl)
        return NextResponse.redirect(new URL(`/auth/signin?callbackUrl=${encodedCallbackUrl}`, nextUrl))
    }

    return response
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder
         */
        '/((?!_next/static|_next/image|favicon.ico|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
