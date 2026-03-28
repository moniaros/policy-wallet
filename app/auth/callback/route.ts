import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from "@/lib/db"
import { cookies, headers } from "next/headers"
import { createBrevoContact } from "@/lib/brevo"
import { getPostLoginRedirectByRole } from "@/lib/auth/role-routing"

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    // If "next" is provided and safe, preserve it; otherwise use role-based default.
    const requestedNext = searchParams.get('next')

    if (code) {
        const supabase = await createClient()
        const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error && user) {
            // --- Email Verification Sync ---
            // Ensure local database is synced with Supabase email verification status
            try {
                const dbUser = await db.user.findUnique({ where: { id: user.id } })

                if (dbUser) {
                    // If Supabase shows email is confirmed but local DB doesn't, sync it
                    if (user.email_confirmed_at && !dbUser.emailVerified) {
                        await db.user.update({
                            where: { id: user.id },
                            data: { emailVerified: new Date(user.email_confirmed_at) }
                        })
                        console.log(`✅ Synced email verification for user ${user.email}`)
                    }

                    // Clean up any pending verification tokens for this user
                    if (user.email && user.email_confirmed_at) {
                        await db.verificationToken.deleteMany({
                            where: { identifier: user.email }
                        }).catch(() => { }) // Ignore errors if no tokens exist
                    }
                }
            } catch (syncError) {
                console.error("Email verification sync error:", syncError)
                // Don't block the callback if sync fails
            }

            // --- Post-Login Logic ---
            try {
                const headersList = await headers()
                const ip = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "127.0.0.1"
                const ua = headersList.get("user-agent") || "unknown"

                // 1. Log Security Event
                await db.securityEvent.create({
                    data: {
                        userId: user.id,
                        eventType: "login_success",
                        ipAddress: ip,
                        userAgent: ua,
                    }
                })

                // 2. Log Activity
                await (db.activityLog as any).create({
                    data: {
                        adminUserId: user.id,
                        adminEmail: user.email || "unknown",
                        actionType: "USER_LOGIN",
                        description: `User logged in from ${ip}`,
                    }
                })

                // 3. Handle Referrals & New User Logic
                // Check if user exists in public.User (synced from auth.users via trigger usually, 
                // but if manual sync is needed, we do it here checks)
                // For now assuming public.User exists.

                const cookieStore = await cookies()
                const referrerId = cookieStore.get("pw_referrer")?.value

                // If we have a referrer and haven't processed it yet
                if (referrerId) {
                    const existingReferral = await db.referral.findFirst({
                        where: { referredUserId: user.id }
                    })

                    if (!existingReferral) {
                        const referrer = await db.user.findUnique({
                            where: { id: referrerId }
                        })

                        if (referrer) {
                            await db.referral.create({
                                data: {
                                    referrerUserId: referrerId,
                                    referredUserId: user.id,
                                    referredEmail: user.email || "",
                                    status: "pending",
                                    creditsEarned: 0
                                }
                            })
                        }
                    }
                }

                // 4. Sync with Brevo CRM
                if (user.email) {
                    // Check role from metadata or DB
                    const dbUser = await db.user.findUnique({ where: { id: user.id } })
                    const role = dbUser?.roles || "user"

                    const listId = role === "agent"
                        ? Number(process.env.BREVO_LIST_ID_AGENTS)
                        : Number(process.env.BREVO_LIST_ID_USERS)

                    // Only sync if API Key is present to avoid errors
                    if (process.env.BREVO_API_KEY) {
                        await createBrevoContact({
                            email: user.email,
                            listIds: !isNaN(listId) && listId > 0 ? [listId] : [],
                            attributes: {
                                ROLE: role.toUpperCase(),
                                // SIGNUP_DATE: new Date().toISOString() // Only sent on creation ideally
                            }
                        }).catch(err => console.error("Brevo sync failed", err))
                    }
                }

            } catch (postLoginError) {
                console.error("Post-login logic error:", postLoginError)
                // Don't block login if logging fails
            }

            const dbUser = await db.user.findUnique({
                where: { id: user.id },
                select: { roles: true },
            })
            const roleRoute = getPostLoginRedirectByRole(dbUser?.roles || String(user.user_metadata?.role || ""))
            const safeNext = requestedNext && requestedNext.startsWith("/") ? requestedNext : null

            return NextResponse.redirect(`${origin}${safeNext || roleRoute}`)
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
