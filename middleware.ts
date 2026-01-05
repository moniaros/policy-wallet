import { auth } from "@/auth"

export default auth((req) => {
    const isLoggedIn = !!req.auth
    const { nextUrl } = req

    const isApiAuthRoute = nextUrl.pathname.startsWith("/api/auth")
    const isPublicRoute = ["/", "/auth/signin", "/auth/signup"].includes(nextUrl.pathname)
    const isAuthRoute = nextUrl.pathname.startsWith("/auth")

    if (isApiAuthRoute) {
        return
    }

    if (isAuthRoute) {
        if (isLoggedIn) {
            return Response.redirect(new URL("/wallet", nextUrl)) // Default to wallet
        }
        return
    }

    if (!isLoggedIn && !isPublicRoute) {
        let callbackUrl = nextUrl.pathname
        if (nextUrl.search) {
            callbackUrl += nextUrl.search
        }

        // Redirect unauthenticated users to signin
        const encodedCallbackUrl = encodeURIComponent(callbackUrl)
        return Response.redirect(new URL(`/auth/signin?callbackUrl=${encodedCallbackUrl}`, nextUrl))
    }

    return
})

// Optionally, don't invoke Middleware on some paths
export const config = {
    matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
}
