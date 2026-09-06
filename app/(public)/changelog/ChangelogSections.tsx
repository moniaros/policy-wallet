import { PublicHeader } from "@/components/public/PublicHeader"
import { PublicMegaFooter } from "@/components/landing/PublicMegaFooter"
import { CHANGELOG, CHANGELOG_START_DATE } from "@/lib/changelog/entries"
import { formatDate } from "@/lib/i18n/format"

type Locale = "el" | "en"
const t = (locale: Locale, el: string, en: string) => (locale === "el" ? el : en)

/** /changelog — dated entries from the merge history (lib/changelog/entries.ts). */
export function ChangelogSections({ locale }: { locale: Locale }) {
    return (
        <div className="min-h-screen bg-white dark:bg-[#0B1220]">
            <PublicHeader locale={locale} />
            <main id="main-content">
                <section className="mx-auto max-w-form px-4 pt-16 pb-10 text-center sm:pt-24">
                    <p className="text-kicker uppercase tracking-wide text-[#29685B] dark:text-[#A7F3D0]">{t(locale, "Τι άλλαξε", "What changed")}</p>
                    <h1 className="mt-3 text-display font-semibold text-balance text-[#0F172A] dark:text-white">{t(locale, "Ημερολόγιο αλλαγών", "Changelog")}</h1>
                    <p className="mx-auto mt-5 max-w-[560px] text-body-lg leading-relaxed text-[#334155] dark:text-slate-200">{t(locale, "Κάθε καταχώριση αντιστοιχεί σε αλλαγές που μπήκαν στην υπηρεσία, με την ημερομηνία τους. Ξεκινά από τη σημερινή μορφή του προϊόντος.", "Every entry corresponds to changes that reached the service, with their date. It starts where the current product does.")}</p>
                </section>
                <section className="mx-auto max-w-form px-4 pb-16">
                    <p className="text-caption text-[#64748B] dark:text-slate-400">
                        {t(locale, "Από ", "Since ")}
                        <time dateTime={CHANGELOG_START_DATE}>{formatDate(CHANGELOG_START_DATE, locale)}</time>
                    </p>
                    <ol className="mt-6 flex flex-col gap-8">
                        {CHANGELOG.map((entry) => (
                            <li key={entry.date + entry.prs.join("-")} id={`entry-${entry.prs[0]}`}>
                                <p className="text-caption text-[#64748B] dark:text-slate-400">
                                    <time dateTime={entry.date}>{formatDate(entry.date, locale)}</time>
                                    {" · "}
                                    <span>{entry.prs.map((n) => `#${n}`).join(", ")}</span>
                                </p>
                                <h2 className="mt-1 text-h4 font-semibold text-[#0F172A] dark:text-white [overflow-wrap:anywhere]">{t(locale, entry.title.el, entry.title.en)}</h2>
                                <p className="mt-2 text-body-lg leading-relaxed text-[#334155] dark:text-slate-200 [overflow-wrap:anywhere]">{t(locale, entry.body.el, entry.body.en)}</p>
                            </li>
                        ))}
                    </ol>
                </section>
            </main>
            <PublicMegaFooter locale={locale} />
        </div>
    )
}
