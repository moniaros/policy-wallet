import Link from "next/link"
import { PublicHeader } from "@/components/public/PublicHeader"
import { PublicMegaFooter } from "@/components/landing/PublicMegaFooter"
import { localizeHref } from "@/lib/seo/locale-links"
import { STATUS_SECTIONS } from "@/lib/trust/status-content"

type Locale = "el" | "en"
const t = (locale: Locale, el: string, en: string) => (locale === "el" ? el : en)

/** /status — no uptime figure, no monitor; where the providers publish status and where incidents are written down. */
export function StatusSections({ locale }: { locale: Locale }) {
    const l = (href: string) => (href.startsWith("http") ? href : localizeHref(href, locale))
    return (
        <div className="min-h-screen bg-white dark:bg-[#0B1220]">
            <PublicHeader locale={locale} />
            <main id="main-content">
                <section className="mx-auto max-w-form px-4 pt-16 pb-10 text-center sm:pt-24">
                    <p className="text-kicker uppercase tracking-wide text-[#29685B] dark:text-[#A7F3D0]">{t(locale, "Κατάσταση", "Status")}</p>
                    <h1 className="mt-3 text-display font-semibold text-balance text-[#0F172A] dark:text-white">{t(locale, "Κατάσταση υπηρεσίας", "Service status")}</h1>
                    <p className="mx-auto mt-5 max-w-[560px] text-body-lg leading-relaxed text-[#334155] dark:text-slate-200">{t(locale, "Χωρίς ποσοστά που δεν μετράμε. Πού τρέχει η υπηρεσία, πού δημοσιεύεται η κατάσταση των παρόχων της, και πού καταγράφονται τα περιστατικά.", "No percentages we do not measure. Where the service runs, where its providers publish their status, and where incidents are recorded.")}</p>
                </section>
                <section className="mx-auto max-w-form px-4 pb-16">
                    <div className="flex flex-col gap-10">
                        {STATUS_SECTIONS.map((section) => (
                            <div key={section.id} id={section.id}>
                                <h2 className="text-h3 font-semibold text-[#0F172A] dark:text-white">{t(locale, section.title.el, section.title.en)}</h2>
                                <div className="mt-3 flex flex-col gap-3">
                                    {section.body.map((paragraph) => (
                                        <p key={paragraph.en} className="text-body-lg leading-relaxed text-[#334155] dark:text-slate-200 [overflow-wrap:anywhere]">{t(locale, paragraph.el, paragraph.en)}</p>
                                    ))}
                                </div>
                                {section.links && (
                                    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                                        {section.links.map((link) => (
                                            <li key={link.href}>
                                                {link.href.startsWith("http") ? (
                                                    <a href={link.href} rel="noopener noreferrer" target="_blank" className="inline-flex min-h-11 items-center underline underline-offset-4">{t(locale, link.label.el, link.label.en)}</a>
                                                ) : (
                                                    <Link href={l(link.href)} className="inline-flex min-h-11 items-center underline underline-offset-4">{t(locale, link.label.el, link.label.en)}</Link>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            </main>
            <PublicMegaFooter locale={locale} />
        </div>
    )
}
