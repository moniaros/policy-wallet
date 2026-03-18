import { z } from "zod"
import { createApiResponse } from "@/lib/api-utils"
import { withApiGuard } from "@/lib/api-guard"
import { db } from "@/lib/db"
import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import {
    CONSENT_COOKIE_NAME,
    DEFAULT_CATEGORIES,
    DEFAULT_COOKIE_MAX_AGE_SECONDS,
    LEGAL_POLICY_VERSIONS,
    type ConsentType,
    serializeConsentCookie,
} from "@/lib/compliance/consent"

const consentBodySchema = z.object({
    consentType: z.enum(["cookie", "terms", "privacy"]),
    policyVersion: z.string().min(1).max(64).optional(),
    locale: z.enum(["el", "en"]).default("el"),
    source: z.string().min(1).max(64).default("web"),
    categories: z
        .object({
            necessary: z.boolean().default(true),
            analytics: z.boolean().default(false),
            marketing: z.boolean().default(false),
        })
        .optional(),
})

export const POST = withApiGuard(
    {
        auth: { mode: "public" },
        validation: { body: consentBodySchema },
        rateLimit: {
            limit: 30,
            windowMs: 60 * 1000,
            key: ({ ip }) => `consents:post:${ip}`,
        },
    },
    async ({ body, ip, req }) => {
        const payload = body!
        const consentType = payload.consentType as ConsentType
        const locale = payload.locale
        const categories = payload.categories || DEFAULT_CATEGORIES
        const policyVersion = payload.policyVersion || LEGAL_POLICY_VERSIONS[consentType]
        const source = payload.source
        const userAgent = req.headers.get("user-agent") || null

        const authUser = await getAuthenticatedUserOrNull()
        const userId = authUser?.dbUser.id || null

        await db.consentAudit.create({
            data: {
                userId,
                consentType,
                policyVersion,
                locale,
                source,
                categories,
                ipAddress: ip,
                userAgent,
                accepted: true,
                acceptedAt: new Date(),
            },
        })

        if (userId) {
            const baseUpdate: Record<string, unknown> = {
                consentLocale: locale,
                consentUpdatedAt: new Date(),
            }

            if (consentType === "cookie") {
                baseUpdate.cookieConsentVersion = policyVersion
            } else if (consentType === "terms") {
                baseUpdate.termsVersionAccepted = policyVersion
            } else if (consentType === "privacy") {
                baseUpdate.privacyVersionAccepted = policyVersion
            }

            await db.user.update({
                where: { id: userId },
                data: baseUpdate,
            })
        }

        const response = createApiResponse(
            {
                recorded: true,
                consent_type: consentType,
                policy_version: policyVersion,
                locale,
                source,
            },
            locale
        )

        if (consentType === "cookie") {
            response.cookies.set(CONSENT_COOKIE_NAME, serializeConsentCookie({
                consentType,
                policyVersion,
                locale,
                categories,
                acceptedAt: new Date().toISOString(),
            }), {
                path: "/",
                httpOnly: false,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                maxAge: DEFAULT_COOKIE_MAX_AGE_SECONDS,
            })
        }

        return response
    }
)
