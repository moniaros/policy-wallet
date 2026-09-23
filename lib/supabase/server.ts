import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function createClient() {
    const cookieStore = await cookies()

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            // Spec v2 §19.1 step 4: the cookie lives 30 days. The refresh
            // token's own lifetime is a Supabase dashboard setting the owner keeps
            // in step with this; the cookie is the client-side half of «no
            // re-authentication within 30 days of inactivity».
            cookieOptions: { maxAge: 60 * 60 * 24 * 30 },
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        // No change yetAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    )
}
