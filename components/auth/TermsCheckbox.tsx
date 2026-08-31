"use client"

import Link from "next/link"
import type { InputHTMLAttributes } from "react"
import { localizeHref } from "@/lib/seo/locale-links"
import { FormError } from "@/components/auth/FormError"

/**
 * The terms checkbox on the EMAIL path — a real checkbox, unchecked by default
 * (brief §3; the social path shows the «Με τη συνέχεια αποδέχεστε…» line
 * instead, recorded server-side either way).
 *
 * Accessibility contract (guarded by tests/unit/auth-form-validation-wiring):
 * id="signup-terms", aria-describedby → "signup-terms-error", aria-invalid
 * while the error shows, and the error paragraph carries that exact id — a
 * screen-reader user who tabs back to the checkbox hears WHY the form refused.
 */
export function TermsCheckbox({
    locale,
    error,
    inputProps,
}: {
    locale: "el" | "en"
    error?: string | null
    inputProps: InputHTMLAttributes<HTMLInputElement>
}) {
    const t = (el: string, en: string) => (locale === "el" ? el : en)
    const linkClass =
        "font-semibold text-fg-brand underline decoration-border-strong underline-offset-4 hover:decoration-current"
    return (
        <div>
            <label className="flex min-h-11 cursor-pointer items-start gap-g-3 text-g-body-sm text-fg-primary">
                <input
                    id="signup-terms"
                    type="checkbox"
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? "signup-terms-error" : undefined}
                    className="mt-1 size-5 shrink-0 accent-[var(--action-primary-bg)] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-border-focus"
                    {...inputProps}
                />
                <span>
                    {t("Αποδέχομαι τους ", "I accept the ")}
                    <Link href={localizeHref("/terms", locale)} className={linkClass} target="_blank" rel="noopener">
                        {t("Όρους", "Terms")}
                    </Link>
                    {t(" και το ", " and the ")}
                    <Link href={localizeHref("/privacy", locale)} className={linkClass} target="_blank" rel="noopener">
                        {t("Απόρρητο", "Privacy Policy")}
                    </Link>
                    .
                </span>
            </label>
            <FormError id="signup-terms-error">{error ?? null}</FormError>
        </div>
    )
}
