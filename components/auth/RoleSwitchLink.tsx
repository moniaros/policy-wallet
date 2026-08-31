import Link from "next/link"
import { authHref } from "@/lib/seo/locale-links"
import type { SignupRole } from "@/lib/auth/social-providers"

/**
 * The role cross-link, BELOW the submit button, phrased as a question (brief
 * §2.5) — it used to sit above the form, interrupting the path to the first
 * field. Localized href via authHref so the pinned language survives.
 */
export function RoleSwitchLink({ locale, target, href }: { locale: "el" | "en"; target: SignupRole; href?: string }) {
    const t = (el: string, en: string) => (locale === "el" ? el : en)
    const question =
        target === "agent"
            ? t("Είστε ασφαλιστικός σύμβουλος;", "Are you an insurance advisor?")
            : t("Είστε ασφαλισμένος;", "Are you a policyholder?")
    const action =
        target === "agent" ? t("Εγγραφή ως ασφαλιστής", "Sign up as an advisor") : t("Εγγραφή ως ασφαλισμένος", "Sign up as a policyholder")
    return (
        <p className="text-center text-g-body-sm text-fg-secondary">
            {question}{" "}
            <Link
                href={href ?? authHref(`/auth/signup/${target}`, locale)}
                className="inline-block min-h-6 py-1 font-semibold text-fg-brand underline decoration-border-strong underline-offset-4 hover:decoration-current focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-border-focus"
            >
                {action}
            </Link>
        </p>
    )
}
