import Link from "next/link"
import { ArrowRight, BadgeEuro, HandCoins, Lock } from "lucide-react"
import { localizeHref } from "@/lib/seo/locale-links"
import { DIFFERENTIATORS, pick, type MarketingLocale } from "@/lib/marketing/positioning"

/**
 * The neutrality story — the single strongest thing PolicyWallet can say, and
 * the answer to "why should I use this instead of just asking my agent?".
 *
 * It used to live in the third paragraph of /company, where almost nobody
 * reads it. It now runs directly under the homepage hero.
 *
 * Server component: static markup, no JS shipped.
 */

const ICONS = [BadgeEuro, HandCoins, Lock] as const

export function WhyDifferent({ locale }: { locale: MarketingLocale }) {
    const t = (el: string, en: string) => (locale === "el" ? el : en)

    return (
        <section
            id="difference"
            aria-labelledby="difference-heading"
            className="scroll-mt-28 border-y border-[#E2E8F0] bg-[#F8FAFC] px-6 py-20 lg:scroll-mt-36 lg:px-12 lg:py-28 dark:border-slate-800 dark:bg-slate-900"
        >
            <div className="mx-auto max-w-page">
                <div className="mb-12 max-w-[640px]">
                    <p className="mb-3 text-caption font-semibold uppercase tracking-widest text-[#29685B] dark:text-[#A7F3D0]">
                        {t("Η διαφορά μας", "What makes us different")}
                    </p>
                    <h2
                        id="difference-heading"
                        className="mb-4 text-h2 font-semibold leading-[1.1] tracking-[-0.03em] text-[#0F172A] lg:text-h1 dark:text-white"
                    >
                        {t(
                            "Κανείς δεν μας πληρώνει για να σας πούμε κάτι συγκεκριμένο.",
                            "Nobody pays us to tell you a particular thing.",
                        )}
                    </h2>
                    <p className="text-lead leading-relaxed text-[#475569] dark:text-slate-300">
                        {t(
                            "Γι' αυτό η απάντηση που παίρνετε είναι απλώς η αλήθεια για την κάλυψή σας.",
                            "That is why the answer you get is simply the truth about your cover.",
                        )}
                    </p>
                </div>

                <ul className="grid gap-5 md:grid-cols-3">
                    {DIFFERENTIATORS.map((item, index) => {
                        const Icon = ICONS[index] ?? Lock
                        return (
                            <li
                                key={item.title.en}
                                className="flex flex-col rounded-2xl border border-[#E2E8F0] bg-white p-7 dark:border-slate-800 dark:bg-slate-950"
                            >
                                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#ECFDF5] dark:bg-[#29685B]/20">
                                    <Icon aria-hidden className="h-5 w-5 text-[#29685B] dark:text-[#A7F3D0]" />
                                </div>
                                <h3 className="mb-2 text-title font-semibold tracking-tight text-[#0F172A] dark:text-white">
                                    {pick(item.title, locale)}
                                </h3>
                                <p className="text-body-lg leading-relaxed text-[#475569] dark:text-slate-300">
                                    {pick(item.body, locale)}
                                </p>
                            </li>
                        )
                    })}
                </ul>

                <div className="mt-8">
                    <Link
                        href={localizeHref("/compare", locale)}
                        className="inline-flex min-h-11 items-center gap-1.5 text-body-lg font-semibold text-[#0F172A] underline-offset-4 hover:underline dark:text-white"
                    >
                        {t("Δείτε τη σύγκριση με τις άλλες επιλογές", "See how this compares with the alternatives")}
                        <ArrowRight aria-hidden className="h-4 w-4" />
                    </Link>
                </div>
            </div>
        </section>
    )
}
