import { createClient, type User as SupabaseAuthUser } from '@supabase/supabase-js'

export function createAdminClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    )
}

/**
 * Resolve a Supabase Auth user by email via the service-role admin API.
 *
 * The GoTrue admin API has no direct email filter, so we page through
 * listUsers(). This deliberately PAGINATES — the older private
 * findSupabaseUserIdByEmail copies (app/auth/actions.ts, app/api/auth/reset-password)
 * only read the first page and silently miss users once the project passes
 * ~50 accounts. Returns the full auth user (id + user_metadata) or null.
 *
 * NOTE: pass the Supabase-auth email, not a Prisma User.id — User.id is a cuid,
 * not the auth user's UUID.
 */
export async function getSupabaseAuthUserByEmail(
    email: string
): Promise<SupabaseAuthUser | null> {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return null
    }
    const admin = createAdminClient()
    const target = email.trim().toLowerCase()
    const perPage = 200
    // Safety bound: 50 pages * 200 = 10k users. Stop early on the last page.
    for (let page = 1; page <= 50; page++) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
        if (error || !data?.users?.length) return null
        const match = data.users.find((u) => u.email?.toLowerCase() === target)
        if (match) return match
        if (data.users.length < perPage) return null
    }
    return null
}
