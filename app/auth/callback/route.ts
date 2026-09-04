import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from "@/lib/db"
import { cookies, headers } from "next/headers"
import { createBrevoContact } from "@/lib/brevo"
import { getPostLoginRedirectByRole } from "@/lib/auth/role-routing"
import { consumeOAuthIntent, type OAuthIntent } from "@/lib/auth/oauth-intent"
import { LEGAL_POLICY_VERSIONS } from "@/lib/compliance/consent"
import { normalizeEmail } from "@/lib/identity/normalize-email"

/**
 * The one exchange endpoint — magic links AND social login land here.
 *
 * What the auth rebuild added (docs/auth-audit.md §11): until social login
 * existed, every DB row was created by registerUser, so this route could
 * assume the row existed. An OAuth round trip arrives with a Supabase session
 * and possibly NO row — this route is now the second and last place a User
 * row is born. The rules it enforces:
 *
 *  - ROLE comes from the signed intent cookie written by startSocialAuth,
 *    never from a query parameter (brief §2.3). No intent → policyholder.
 *  - NO EMAIL, NO ACCOUNT: a provider that returns no email (possible on
 *    Facebook) gets no row and no session — the account would be unverifiable
 *    and unrecoverable, the exact defect A2 removed.
 *  - LINKING: an existing account with the same email is the same account
 *    (Supabase links verified-email identities). Its ROLE IS NEVER CHANGED
 *    from an OAuth round trip — a mismatch redirects to the account's own
 *    home with a notice instead of silently re-roling it.
 *  - Terms acceptance shown under the social buttons is RECORDED here, with
 *    the version and locale the signed intent carried (brief §2.3).
 *
 * NOTE the DB join key is EMAIL, not the Supabase user id: registerUser
 * creates rows with their own cuid. The pre-rebuild version of this file
 * looked rows up by id — every sync below silently no-opped.
 */
export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const requestedNext = searchParams.get('next')

    if (!code) {
        return NextResponse.redirect(`${origin}/auth/auth-code-error`)
    }

    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code)
    if (error || !user) {
        return NextResponse.redirect(`${origin}/auth/auth-code-error`)
    }

    const intent: OAuthIntent | null = await consumeOAuthIntent()
    const email = normalizeEmail(user.email) || null

    if (!email) {
        // Brief §2.3: never create an account without a verifiable email. The
        // collect-and-verify flow ships with the Facebook phase; until then
        // the safe end state is no session and no row.
        await supabase.auth.signOut()
        return NextResponse.redirect(`${origin}/auth/auth-code-error`)
    }

    const headersList = await headers()
    const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || headersList.get("x-real-ip") || "127.0.0.1"
    const ua = headersList.get("user-agent") || "unknown"

    let dbUser = await db.user.findUnique({ where: { email } })
    let isNewAccount = false
    let roleMismatch = false

    try {
        if (!dbUser) {
            // ── First OAuth arrival: the row is born here ──
            isNewAccount = true
            const role = intent?.role ?? (user.user_metadata?.role === "agent" ? "agent" : "policyholder")
            const locale: "el" | "en" = intent?.locale === "en" ? "en" : "el"
            const displayName =
                (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()) ||
                (typeof user.user_metadata?.name === "string" && user.user_metadata.name.trim()) ||
                email.split("@")[0]

            dbUser = await db.user.create({
                data: {
                    name: displayName,
                    email,
                    roles: role,
                    preferredLanguage: locale,
                    // Google/LinkedIn emails arrive verified by the provider;
                    // Supabase reflects that in email_confirmed_at.
                    emailVerified: user.email_confirmed_at ? new Date(user.email_confirmed_at) : null,
                },
            })

            if (role === "agent") {
                await db.agentProfile.upsert({
                    where: { userId: dbUser.id },
                    update: {},
                    create: { userId: dbUser.id, licenseNumber: "", agencyName: "", verificationStatus: "pending" },
                })
            }

            // The «Με τη συνέχεια αποδέχεστε…» line becomes a record, same
            // shape as the email path (source distinguishes them).
            const termsVersion = intent?.termsVersion || LEGAL_POLICY_VERSIONS.terms
            const acceptedAt = new Date()
            await db.consentAudit.createMany({
                data: (["terms", "privacy"] as const).map((consentType) => ({
                    userId: dbUser!.id,
                    consentType,
                    policyVersion: consentType === "terms" ? termsVersion : LEGAL_POLICY_VERSIONS.privacy,
                    locale,
                    source: "oauth_signup",
                    accepted: true,
                    acceptedAt,
                    ipAddress: ip,
                    userAgent: ua,
                })),
            })
            await db.user.update({
                where: { id: dbUser.id },
                data: {
                    termsVersionAccepted: termsVersion,
                    privacyVersionAccepted: LEGAL_POLICY_VERSIONS.privacy,
                    consentLocale: locale,
                    consentUpdatedAt: acceptedAt,
                },
            })

            // Routing (proxy, signin) reads user_metadata.role — stamp it for
            // identities born without one.
            if (!user.user_metadata?.role) {
                await supabase.auth.updateUser({ data: { role, language: locale } }).catch(() => null)
            }
        } else {
            // ── Existing account ──
            // Verified-at-provider email confirms a pending verification.
            if (user.email_confirmed_at && !dbUser.emailVerified) {
                await db.user.update({
                    where: { id: dbUser.id },
                    data: { emailVerified: new Date(user.email_confirmed_at) },
                })
            }
            if (user.email_confirmed_at) {
                await db.verificationToken.deleteMany({ where: { identifier: email } }).catch(() => null)
            }

            // Agent-created phantom rows may carry agent-attested AI consent;
            // first real login means the customer decides first-hand.
            const { isAgentAttestedConsent } = await import("@/lib/ai-consent")
            if (isAgentAttestedConsent(dbUser.aiProcessingConsentVersion)) {
                await db.user.update({
                    where: { id: dbUser.id },
                    data: { aiProcessingConsentVersion: null },
                })
            }

            // A different-role intent NEVER re-roles the account (brief §2.3).
            if (intent && !dbUser.roles.split(",").map((r) => r.trim()).includes(intent.role)) {
                roleMismatch = true
            }
        }
    } catch (accountError) {
        console.error("OAUTH_CALLBACK_ACCOUNT_ERROR:", accountError)
        // A session for an account this route could not materialise is a
        // session to nowhere — fail closed.
        if (isNewAccount) {
            await supabase.auth.signOut()
            return NextResponse.redirect(`${origin}/auth/auth-code-error`)
        }
    }

    // ── Post-login side effects (best-effort, never block the redirect) ──
    // NOTE the id namespace: these tables FK onto public.users (cuid), NOT the
    // Supabase auth id. The pre-rebuild code wrote user.id here and every OAuth
    // login logged a swallowed P2003 (seen live 2026-09-01, dpl_7UhXSaWPAw…).
    try {
        if (dbUser) {
            await db.securityEvent.create({
                data: { userId: dbUser.id, eventType: "login_success", ipAddress: ip, userAgent: ua },
            })
        }
        await (db.activityLog as any).create({
            data: {
                adminUserId: dbUser?.id ?? user.id,
                adminEmail: email,
                actionType: "USER_LOGIN",
                description: `User logged in from ${ip}`,
            },
        })

        const cookieStore = await cookies()
        const referrerId = cookieStore.get("pw_referrer")?.value
        if (referrerId && dbUser) {
            const existingReferral = await db.referral.findFirst({ where: { referredUserId: dbUser.id } })
            if (!existingReferral) {
                const referrer = await db.user.findUnique({ where: { id: referrerId } })
                if (referrer) {
                    await db.referral.create({
                        data: {
                            referrerUserId: referrerId,
                            referredUserId: dbUser.id,
                            referredEmail: email,
                            status: "pending",
                            creditsEarned: 0,
                        },
                    })
                }
            }
        }

        if (process.env.BREVO_API_KEY && dbUser) {
            const role = dbUser.roles || "policyholder"
            const listId = role.includes("agent")
                ? Number(process.env.BREVO_LIST_ID_AGENTS)
                : Number(process.env.BREVO_LIST_ID_USERS)
            await createBrevoContact({
                email,
                listIds: !isNaN(listId) && listId > 0 ? [listId] : [],
                attributes: { ROLE: role.toUpperCase() },
            }).catch((err) => console.error("Brevo sync failed", err))
        }
    } catch (postLoginError) {
        console.error("Post-login logic error:", postLoginError)
    }

    const roleRoute = getPostLoginRedirectByRole(dbUser?.roles || String(user.user_metadata?.role || ""))
    if (roleMismatch) {
        // Explain without re-roling: the account keeps its own home.
        return NextResponse.redirect(`${origin}${roleRoute}?notice=oauth_role_mismatch`)
    }
    const safeNext = requestedNext && requestedNext.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : null
    return NextResponse.redirect(`${origin}${safeNext || roleRoute}`)
}
