import { getApiDocs } from '@/lib/swagger'
import { NextResponse } from 'next/server'
import { requireApiUser } from '@/lib/api-auth'

// The generated OpenAPI spec enumerates every route, parameter, and schema —
// a reconnaissance map. Dev keeps it open for local tooling; production
// requires an admin session.
export async function GET() {
    if (process.env.NODE_ENV === 'production') {
        const authCheck = await requireApiUser({ roles: ['admin'] })
        if ('error' in authCheck) return authCheck.error
    }
    const spec = await getApiDocs()
    return NextResponse.json(spec)
}
