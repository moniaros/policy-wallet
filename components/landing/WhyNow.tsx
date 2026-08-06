import { WHY_NOW, pick, type MarketingLocale } from "@/lib/marketing/positioning"

/**
 * The "why now" answer — the fourth question a visitor asks and the one the
 * homepage never answered.
 *
 * Deliberately NOT a countdown or a fake scarcity banner. Each item is a plain
 * fact about how insurance works, which is a far more durable reason to act
 * today than a discount that expires.
 *
 * Server component: static markup, no JS shipped.
 */
export function WhyNow({ locale }: { locale: MarketingLocale }) {
    const t = (el: string, en: string) => (locale === "el" ? el : en)

    return (
        <section
            id="why-now"
            aria-labelledby="why-now-heading"
            className="scroll-mt-28 px-6 py-20 lg:scroll-mt-36 lg:px-12 lg:py-28"
        >
            <div className="mx-auto max-w-page">
                <div className="mb-12 max-w-[640px]">
                    <p className="mb-3 text-caption font-semibold uppercase tracking-widest text-[#29685B] dark:text-[#A7F3D0]">
                        {t("Γιατί τώρα", "Why now")}
                    </p>
                    <h2
                        id="why-now-heading"
                        className="text-h2 font-semibold leading-[1.1] tracking-[-0.03em] text-[#0F172A] lg:text-h1 dark:text-white"
                    >
                        {t("Το πρόβλημα δεν είναι να μην έχετε ασφάλεια.", "The problem is not having no insurance.")}
                        <br className="hidden sm:block" />{" "}
                        <span className="text-[#29685B] dark:text-[#A7F3D0]">
                            {t("Είναι να νομίζετε ότι έχετε.", "It is thinking you have it.")}
                        </span>
                    </h2>
                </div>

                <ol className="grid gap-5 md:grid-cols-3">
                    {WHY_NOW.map((item, index) => (
                        <li
                            key={item.title.en}
                            className="flex flex-col rounded-2xl border border-[#E2E8F0] bg-white p-7 dark:border-slate-800 dark:bg-slate-900"
                        >
                            <span
                                aria-hidden
                                className="mb-5 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#ECFDF5] text-body font-bold text-[#29685B] dark:bg-[#29685B]/20 dark:text-[#A7F3D0]"
                            >
                                {index + 1}
                            </span>
                            <h3 className="mb-2 text-lead font-semibold leading-snug tracking-tight text-[#0F172A] dark:text-white">
                                {pick(item.title, locale)}
                            </h3>
                            <p className="text-body-lg leading-relaxed text-[#475569] dark:text-slate-300">
                                {pick(item.body, locale)}
                            </p>
                        </li>
                    ))}
                </ol>
            </div>
        </section>
    )
}
