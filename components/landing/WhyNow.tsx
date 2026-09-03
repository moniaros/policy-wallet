import { AppScreen, DashboardScreen, SampleStamp, StaticPhone } from "@/components/landing/real-screens/RealScreens"
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
            /* Tinted, because this now sits directly under the hero. With the
               section order changed, hero → why-it-matters → what-you-get were
               three white bands in a row and the page read as one long column
               with no joints. The site's rhythm is white/tint alternating, and
               this is the band that restores it. */
            className="scroll-mt-28 border-y border-neutral-200 bg-neutral-50 px-6 py-20 lg:scroll-mt-36 lg:px-12 lg:py-28 dark:border-slate-800 dark:bg-slate-900"
        >
            {/* Two columns from lg: the argument on the left, the result of it
                on the right. The product shot used to sit in a band of its own
                further down, where it was a picture between two pieces of
                argument and belonged to neither. Here it is the evidence for
                the sentence beside it. */}
            <div className="mx-auto grid max-w-page items-start gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
                <div>
                <div className="mb-10 max-w-[640px]">
                    <h2
                        id="why-now-heading"
                        className="text-h2 font-semibold leading-[1.1] tracking-[-0.03em] text-neutral-900 lg:text-h1 dark:text-white"
                    >
                        {t("Το πρόβλημα δεν είναι να μην έχετε ασφάλεια.", "The problem is not having no insurance.")}
                        <br className="hidden sm:block" />{" "}
                        <span className="text-primary dark:text-[#A7F3D0]">
                            {t("Είναι να νομίζετε ότι έχετε.", "It is thinking you have it.")}
                        </span>
                    </h2>
                </div>

                <ol className="divide-y divide-neutral-200 dark:divide-slate-800">
                    {WHY_NOW.map((item, index) => (
                        <li
                            key={item.title.en}
                            className="flex gap-4 py-6 first:pt-0"
                        >
                            <span
                                aria-hidden
                                className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-status-success-tint text-body font-bold text-primary dark:text-[#A7F3D0]"
                            >
                                {index + 1}
                            </span>
                            <div>
                            <h3 className="mb-1.5 text-lead font-semibold leading-snug tracking-tight text-neutral-900 dark:text-white">
                                {pick(item.title, locale)}
                            </h3>
                            <p className="text-body-lg leading-relaxed text-neutral-600 dark:text-slate-300">
                                {pick(item.body, locale)}
                            </p>
                            </div>
                        </li>
                    ))}
                </ol>
                </div>

                {/* Desktop only. On a phone this would be a full screen of
                    picture wedged between the argument and the next section —
                    the same reason it was hidden in the hero. */}
                <div className="hidden lg:block">
                    {/* The REAL dashboard, as the app renders it on a phone. */}
                    <StaticPhone
                        label={
                            locale === "el"
                                ? "Παράδειγμα: η αρχική οθόνη της εφαρμογής — τρία ασφαλιστήρια, ένα λήγει σύντομα, δύο ευρήματα προς έλεγχο."
                                : "Example: the app's home screen — three policies, one expiring soon, two findings to review."
                        }
                    >
                        <AppScreen locale={locale} tab="home" defaultScale={302 / 390}>
                            <DashboardScreen locale={locale} />
                        </AppScreen>
                    </StaticPhone>
                    <SampleStamp locale={locale} className="mt-g-3" />
                </div>
            </div>
        </section>
    )
}
