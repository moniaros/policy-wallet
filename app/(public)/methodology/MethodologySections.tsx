import Link from "next/link"
import { PublicHeader } from "@/components/public/PublicHeader"
import { PublicMegaFooter } from "@/components/landing/PublicMegaFooter"
import { localizeHref } from "@/lib/seo/locale-links"
import { methodologySections } from "@/lib/trust/methodology-content"

type Locale = "el" | "en"
const t = (locale: Locale, el: string, en: string) => (locale === "el" ? el : en)

/** /methodology — every sentence backed by code; every number read from the catalogue (lib/trust/methodology-content.ts). */
export function MethodologySections({ locale }: { locale: Locale }) {
    const sections = methodologySections(locale)
    const l = (href: string) => localizeHref(href, locale)
    return (
        <div className="min-h-screen bg-white dark:bg-[#0B1220]">
            <PublicHeader locale={locale} />
            <main id="main-content">
                <section className="mx-auto max-w-form px-4 pt-16 pb-10 text-center sm:pt-24">
                    <p className="text-kicker uppercase tracking-wide text-[#29685B] dark:text-[#A7F3D0]">{t(locale, "Μεθοδολογία", "Methodology")}</p>
                    <h1 className="mt-3 text-display font-semibold text-balance text-[#0F172A] dark:text-white">{t(locale, "Πώς αποφασίζεται ένα εύρημα", "How a finding is decided")}</h1>
                    <p className="mx-auto mt-5 max-w-[560px] text-body-lg leading-relaxed text-[#334155] dark:text-slate-200">{t(locale, "Κανόνες αποφασίζουν, η τεχνητή νοημοσύνη διαβάζει και εξηγεί. Κάθε πρόταση εδώ περιγράφει τι κάνει ο κώδικας σήμερα, και κάθε αριθμός διαβάζεται από τον κατάλογο.", "Rules decide; the AI reads and explains. Every sentence here describes what the code does today, and every number is read from the catalogue.")}</p>
                </section>
                <section className="mx-auto max-w-form px-4 pb-16">
                    <div className="flex flex-col gap-10">
                        {sections.map((section) => (
                            <div key={section.id} id={section.id}>
                                <h2 className="text-h3 font-semibold text-[#0F172A] dark:text-white">{t(locale, section.title.el, section.title.en)}</h2>
                                <div className="mt-3 flex flex-col gap-3">
                                    {section.body.map((paragraph) => (
                                        <p key={paragraph.en} className="text-body-lg leading-relaxed text-[#334155] dark:text-slate-200 [overflow-wrap:anywhere]">{t(locale, paragraph.el, paragraph.en)}</p>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                    <p className="mt-12 text-body text-[#334155] dark:text-slate-200">
                        {t(locale, "Τι γίνεται με τα δεδομένα σας: ", "What happens to your data: ")}
                        <Link href={l("/trust")} className="underline underline-offset-4">{t(locale, "Εμπιστοσύνη", "Trust")}</Link>
                        {" · "}
                        <Link href={l("/changelog")} className="underline underline-offset-4">{t(locale, "Τι άλλαξε", "What changed")}</Link>
                    </p>
                </section>
            </main>
            <PublicMegaFooter locale={locale} />
        </div>
    )
}
