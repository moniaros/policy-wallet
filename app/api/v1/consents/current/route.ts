import { createApiResponse } from "@/lib/api-utils"
import { withApiGuard } from "@/lib/api-guard"
import { db } from "@/lib/db"
import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import { LEGAL_POLICY_VERSIONS, parseConsentCookie, type ConsentType } from "@/lib/compliance/consent"
import { resolveUserLanguage } from "@/lib/i18n/resolve-language"

export const GET = withApiGuard(
    {
        auth: { mode: "public" },
        rateLimit: {
            limit: 60,
            windowMs: 60 * 1000,
            key: ({ ip }) => `consents:current:${ip}`,
        },
    },
    async ({ req }) => {
        const cookieConsent = parseConsentCookie(req.headers.get("cookie"))
        const authUser = await getAuthenticatedUserOrNull()

        let latestConsents: Partial<Record<ConsentType, {
            policyVersion: string
            locale: string
            acceptedAt: string
            source: string
        }>> = {}

        let accountConsentState: Record<string, unknown> | null = null
        let responseLanguage: "el" | "en" = cookieConsent?.locale || "el"

        if (authUser) {
            responseLanguage = resolveUserLanguage(authUser.dbUser.preferredLanguage)

            const userConsentRows = await db.consentAudit.findMany({
                where: { userId: authUser.dbUser.id },
                orderBy: { acceptedAt: "desc" },
                take: 50,
            })

            for (const row of userConsentRows) {
                const key = row.consentType as ConsentType
                if (latestConsents[key]) continue
                latestConsents[key] = {
                    policyVersion: row.policyVersion,
                    locale: row.locale,
                    acceptedAt: row.acceptedAt.toISOString(),
                    source: row.source,
                }
            }

            accountConsentState = {
                termsVersionAccepted: authUser.dbUser.termsVersionAccepted,
                privacyVersionAccepted: authUser.dbUser.privacyVersionAccepted,
                cookieConsentVersion: authUser.dbUser.cookieConsentVersion,
                consentLocale: authUser.dbUser.consentLocale,
                consentUpdatedAt: authUser.dbUser.consentUpdatedAt?.toISOString() || null,
            }
        }

        return createApiResponse(
            {
                current_versions: LEGAL_POLICY_VERSIONS,
                cookie_consent: cookieConsent,
                latest_consents: latestConsents,
                account_consent_state: accountConsentState,
            },
            responseLanguage
        )
    }
)
