import NextAuth from "next-auth"
import authConfig from "./auth.config"
import { NextResponse } from "next/server"

const { auth } = NextAuth(authConfig)

export default auth((req) => {
    const isLoggedIn = !!req.auth
    const { nextUrl } = req

    const isApiAuthRoute = nextUrl.pathname.startsWith("/api/auth")
    const isPublicRoute = ["/", "/auth/signin", "/auth/signup"].includes(nextUrl.pathname)
    const isAuthRoute = nextUrl.pathname.startsWith("/auth")

    const ref = nextUrl.searchParams.get("ref")

    if (isApiAuthRoute) {
        return
    }

    if (isAuthRoute) {
        if (isLoggedIn) {
            return NextResponse.redirect(new URL("/wallet", nextUrl))
        }
        return
    }

    if (!isLoggedIn && !isPublicRoute) {
        let callbackUrl = nextUrl.pathname
        if (nextUrl.search) {
            callbackUrl += nextUrl.search
        }

        const encodedCallbackUrl = encodeURIComponent(callbackUrl)
        return NextResponse.redirect(new URL(`/auth/signin?callbackUrl=${encodedCallbackUrl}`, nextUrl))
    }

    // Set referral cookie if present
    if (ref) {
        const response = NextResponse.next()
        response.cookies.set("pw_referrer", ref, {
            path: "/",
            maxAge: 30 * 24 * 60 * 60, // 30 days
            httpOnly: true,
            sameSite: "lax"
        })
        return response
    }

    return NextResponse.next()
})

// Optionally, don't invoke Middleware on some paths
export const config = {
    matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
}
