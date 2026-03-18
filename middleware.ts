import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'

// Define which routes to rate limit
export const config = {
    matcher: ['/api/:path*'],
}

export async function middleware(request: NextRequest) {
    if (request.nextUrl.pathname.startsWith('/api/')) {
        // Skip rate-limiting for stripe webhooks or anything explicitly excluded if necessary
        if (request.nextUrl.pathname.includes('/stripe/webhook')) {
            return NextResponse.next()
        }

        // @ts-ignore
        const ip = request.ip || request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1'
        const limitCheck = await rateLimit(ip, 60, 60000) // 60 requests per minute per IP globally
        
        if (!limitCheck.success) {
            return new NextResponse(
                JSON.stringify({ error: { code: "TOO_MANY_REQUESTS", message: "Global rate limit exceeded. Please try again later." } }),
                { 
                    status: 429, 
                    headers: { 'Content-Type': 'application/json' } 
                }
            )
        }
    }
    
    return NextResponse.next()
}
