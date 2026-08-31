"use client"

import { useState } from "react"
import Link from "next/link"
import { liveProvidersFor, type SignupRole } from "@/lib/auth/social-providers"
import { startSocialAuth } from "@/app/auth/social/actions"
import { SocialButton } from "@/components/auth/SocialButton"
import { FormError } from "@/components/auth/FormError"
import { localizeHref } from "@/lib/seo/locale-links"

/**
 * The social row (brief §2.3): live providers only — an unshipped provider is
 * not rendered, not ghosted. One registry decides; a config flip plus
 * credentials adds a provider with no code change. Buttons stack full-width
 * on mobile, sit in a row on desktop. Label is «Συνέχεια με …» because the
 * same button serves signup and sign-in.
 *
 * On the signup pages the terms line replaces the checkbox for this path; the
 * acceptance itself is recorded SERVER-SIDE on the callback, with the version
 * carried in the signed intent cookie.
 */
export function SocialAuthRow({
    role,
    locale,
    next,
    showTermsNote = false,
}: {
    role: SignupRole
    locale: "el" | "en"
    /** In-app path after the round trip, e.g. "/onboarding". */
    next: string
    showTermsNote?: boolean
}) {
    const t = (el: string, en: string) => (locale === "el" ? el : en)
    const providers = liveProvidersFor(role)
    const [pendingId, setPendingId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    if (providers.length === 0) return null

    const begin = async (providerId: string) => {
        setError(null)
        setPendingId(providerId)
        try {
            const result = await startSocialAuth({ providerId, role, locale, next })
            if (result.url) {
                window.location.assign(result.url)
                return
            }
            setError(result.error ?? t("Κάτι πήγε στραβά. Δοκιμάστε ξανά.", "Something went wrong. Please try again."))
        } catch {
            setError(t("Κάτι πήγε στραβά. Δοκιμάστε ξανά.", "Something went wrong. Please try again."))
        }
        setPendingId(null)
    }

    const linkClass =
        "font-semibold text-fg-brand underline decoration-border-strong underline-offset-4 hover:decoration-current"

    return (
        <div>
            <div className="flex flex-col gap-g-3 lg:flex-row">
                {providers.map((p) => (
                    <SocialButton
                        key={p.id}
                        provider={p}
                        label={t(`Συνέχεια με ${p.name}`, `Continue with ${p.name}`)}
                        pending={pendingId === p.id}
                        onClick={() => begin(p.id)}
                    />
                ))}
            </div>
            {showTermsNote && (
                <p className="mt-g-3 text-g-caption text-fg-secondary">
                    {t("Με τη συνέχεια αποδέχεστε τους ", "By continuing you accept the ")}
                    <Link href={localizeHref("/terms", locale)} className={linkClass} target="_blank" rel="noopener">
                        {t("Όρους", "Terms")}
                    </Link>
                    {t(" και το ", " and the ")}
                    <Link href={localizeHref("/privacy", locale)} className={linkClass} target="_blank" rel="noopener">
                        {t("Απόρρητο", "Privacy Policy")}
                    </Link>
                    .
                </p>
            )}
            <FormError id="social-auth-error">{error}</FormError>
        </div>
    )
}
