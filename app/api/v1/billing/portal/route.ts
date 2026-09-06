import { createApiError, createApiResponse } from "@/lib/api-utils"
import { withApiGuard } from "@/lib/api-guard"
import { stripe } from "@/lib/stripe"
import { getSiteOrigin } from "@/lib/seo/site"
import { resolveUserLanguage } from "@/lib/i18n/resolve-language"

export const POST = withApiGuard(
    {
        auth: { mode: "user" },
        rateLimit: {
            limit: 10,
            windowMs: 60 * 1000,
            key: ({ auth }) => `billing:portal:${auth?.dbUser.id || "anonymous"}`,
        },
    },
    async ({ auth }) => {
        const dbUser = auth!.dbUser
        const language = resolveUserLanguage(dbUser.preferredLanguage)

        if (!dbUser.stripeCustomerId) {
            return createApiError("NOT_FOUND", "No billing profile found", 404, null, language)
        }

        const session = await stripe.billingPortal.sessions.create({
            customer: dbUser.stripeCustomerId,
            return_url: `${getSiteOrigin()}/account`,
        })

        return createApiResponse(
            {
                portal_url: session.url,
            },
            language
        )
    }
)
