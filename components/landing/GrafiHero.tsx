"use client"

/**
 * The Grafí hero: ONE fixed promise as the H1, the storage line demoted to the
 * sub-head, an inline email capture as the primary action, the needs check as
 * secondary, and the product visible immediately in a DeviceFrame. Replaces
 * the rotating-headline carousel — one visitor, one value proposition, and the
 * page's <h1> no longer changes every seven seconds under crawlers and screen
 * readers. (HeroSlides.tsx remains in the tree for its unit baselines; nothing
 * renders it.)
 */
import { useRouter } from "next/navigation"
import Link from "next/link"
import { CATEGORY, CTA_REASSURANCE, HERO_EMAIL_CTA, HERO_SUBHEAD, PRIMARY_ACTION, PROMISE, pick, type MarketingLocale } from "@/lib/marketing/positioning"
import { authHref, localizeHref } from "@/lib/seo/locale-links"
import { EmailCapture, StatusChip, DeviceFrame, ProtectionRing, PolicyStrip } from "@/src/design-system"

export function GrafiHero({ locale }: { locale: MarketingLocale }) {
    const router = useRouter()
    const t = (el: string, en: string) => (locale === "el" ? el : en)

    /** Sample screens — every one stamped as a sample, none implies a real household. */
    const stamp = (
        <p className="absolute bottom-2 inset-x-0 text-center text-g-label uppercase tracking-widest text-fg-secondary">
            {t("Δείγμα — όχι πραγματικό ασφαλιστήριο", "Sample — not a real policy")}
        </p>
    )
    const screens = [
        {
            id: "ring",
            label: t("Σύνοψη προστασίας", "Protection summary"),
            content: (
                <div className="relative flex h-full flex-col items-center justify-center gap-g-3">
                    <p className="text-sm font-semibold text-fg-primary">{t("Η προστασία σας", "Your protection")}</p>
                    <ProtectionRing covered={5} gap={1} review={1} label={t("καλύψεις", "covers")} className="flex-col gap-g-3 [&_svg]:size-28" />
                    {stamp}
                </div>
            ),
        },
        {
            id: "gap",
            label: t("Εντοπισμένο κενό", "A found gap"),
            content: (
                <div className="relative flex h-full flex-col justify-center gap-g-3">
                    <StatusChip state="gap">{t("Σεισμός: εκτός κάλυψης", "Earthquake: not covered")}</StatusChip>
                    <p className="text-sm leading-relaxed text-fg-primary">
                        {t(
                            "Το ασφαλιστήριο κατοικίας δεν περιλαμβάνει σεισμό. Δείτε τις ερωτήσεις για τον ασφαλιστή σας.",
                            "The home policy does not include earthquake. See the questions to ask your insurer."
                        )}
                    </p>
                    <PolicyStrip items={[
                        { name: t("Κατοικία", "Home"), state: "gap" },
                        { name: t("Αυτοκίνητο", "Motor"), state: "covered" },
                        { name: t("Υγεία", "Health"), state: "review" },
                    ]} />
                    {stamp}
                </div>
            ),
        },
        {
            id: "renewal",
            label: t("Υπενθύμιση ανανέωσης", "Renewal reminder"),
            content: (
                <div className="relative flex h-full flex-col justify-center gap-g-3">
                    <p className="text-3xl font-bold text-fg-primary" style={{ fontVariantNumeric: "tabular-nums" }}>18</p>
                    <p className="text-sm leading-relaxed text-fg-primary">
                        {t("ημέρες μέχρι τη λήξη του συμβολαίου αυτοκινήτου.", "days until the motor policy runs out.")}
                    </p>
                    <StatusChip state="review">{t("Ερωτήσεις πριν την ανανέωση", "Questions before renewal")}</StatusChip>
                    {stamp}
                </div>
            ),
        },
    ]

    return (
        <section className="px-g-6 lg:px-g-12 [padding-block:var(--space-section)]">
            <div className="mx-auto grid max-w-[1180px] items-center gap-g-10 lg:grid-cols-[1.15fr_0.85fr]">
                <div>
                   
                    <h1 className="max-w-[15ch] text-balance text-g-display-xl font-extrabold tracking-[-0.024em] text-fg-primary">
                        {pick(PROMISE.lead, locale)}{" "}
                        <span className="text-fg-brand">{pick(PROMISE.accent, locale)}</span>
                    </h1>
                    <p className="mt-g-5 max-w-[56ch] text-g-body-lg text-fg-secondary">
                        {pick(HERO_SUBHEAD, locale)}
                    </p>
                    <div className="mt-g-6">
                        <EmailCapture
                            label={t("Το email σας", "Your email")}
                            cta={pick(HERO_EMAIL_CTA, locale)}
                            formAriaLabel={pick(PRIMARY_ACTION, locale)}
                            onSubmit={(email) =>
                                router.push(authHref(`/auth/signup?role=policyholder&source=landing_hero&email=${encodeURIComponent(email)}`, locale))
                            }
                        />
                        <p className="mt-g-2 text-sm text-fg-secondary">{pick(CTA_REASSURANCE, locale)}</p>
                        <Link
                            href={localizeHref("/needs", locale)}
                            className="mt-g-3 inline-block min-h-11 py-g-2 font-semibold text-fg-brand underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-border-focus"
                        >
                            {t("Ή κάντε τον έλεγχο αναγκών σε 6 βήματα →", "Or take the 6-step needs check →")}
                        </Link>
                    </div>
                </div>
                <DeviceFrame screens={screens} className="justify-self-center" />
            </div>
        </section>
    )
}
