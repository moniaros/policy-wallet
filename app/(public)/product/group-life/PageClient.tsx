import React from "react"
import Link from "next/link"
import { Umbrella, Users, TrendingUp, ArrowRight } from "lucide-react"
import { ProductCategoryExplorer } from "@/components/landing/ProductCategoryExplorer"
import { LobFaq } from "@/components/landing/LobFaq"
import { LoBPageShell } from "@/components/landing/LoBPageShell"
import { localizeHref, authHref } from "@/lib/seo/locale-links"
import { PRIMARY_ACTION, pick, CTA_REASSURANCE_SHORT } from "@/lib/marketing/positioning"

export default function GroupLifeProductPage({ locale }: { locale: "el" | "en" }) {
    const isGreek = locale === "el"
    const t = (el: string, en: string) => (isGreek ? el : en)

    const triad = [
        {
            icon: Umbrella,
            current: true,
            titleEl: "Ομαδική Ζωή",
            titleEn: "Group Life",
            descEl: "Εφάπαξ κεφάλαιο στην οικογένεια του εργαζομένου σε περίπτωση θανάτου ή μόνιμης ανικανότητας. Η παροχή που κανείς δεν θέλει να χρειαστεί — και που μετράει περισσότερο απ' όλες όταν χρειαστεί.",
            descEn: "A lump-sum benefit to an employee's family in case of death or permanent disability. The benefit nobody wants to need — and the one that matters most when it is needed.",
        },
        {
            icon: Users,
            current: false,
            href: "/product/group-health",
            titleEl: "Ομαδική Υγεία",
            titleEn: "Group Health",
            descEl: "Νοσοκομειακή και εξωνοσοκομειακή περίθαλψη για το προσωπικό — η πιο ορατή παροχή στην καθημερινότητα της ομάδας.",
            descEn: "Hospital and outpatient care for staff — the benefit your team feels most in everyday life.",
        },
        {
            icon: TrendingUp,
            current: false,
            href: "/product/group-pension",
            titleEl: "Ομαδική Σύνταξη",
            titleEn: "Group Pension",
            descEl: "Συνταξιοδοτική αποταμίευση με εισφορές εργοδότη ανά εργαζόμενο — δείτε τι έχει χτιστεί για κάθε μέλος της ομάδας.",
            descEn: "Pension savings with employer contributions per employee — see what has been built for each member of the team.",
        },
    ]

    return (
        <LoBPageShell activeNav="product" locale={locale}>

            {/* HERO */}
            <section className="px-6 lg:px-12">
                <div className="mx-auto max-w-form text-center">
                    <span className="inline-flex bg-[#DCEBDA] dark:bg-[#29685B]/30 text-[#166534] dark:text-[#A7F3D0] px-3 py-1 rounded-full text-caption font-semibold tracking-wider uppercase mb-6">
                        {t("Ομαδική ζωή", "Group life")}
                    </span>
                    <h1 className="text-h1 lg:text-display [overflow-wrap:anywhere] leading-[1.05] tracking-[-0.04em] font-semibold text-[#0F172A] dark:text-white mb-8 text-balance">
                        {t("Η παροχή που κανείς δεν διαβάζει. Εμείς τη διαβάζουμε.", "The benefit nobody reads. We read it.")}
                    </h1>
                    <p className="mx-auto max-w-reading text-title leading-[1.5] text-[#475569] dark:text-slate-300 mb-10">
                        {t("Η ομαδική ασφάλιση ζωής δίνει σε κάθε εργαζόμενο κεφάλαιο ζωής και ανικανότητας με έξοδα εργοδότη. Οργανώστε το συμβόλαιο, δείτε ποιος καλύπτεται και με πόσα — χωρίς να ψάχνετε πίνακες σε PDF.", "Group life insurance gives every employee life and disability capital at the employer's expense. Organize the policy and see who is covered and for how much — without digging through PDF tables.")}
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link href={authHref("/auth/signup", locale)} className="pw-primary-button pw-btn-lg w-full sm:w-auto">
                            {pick(PRIMARY_ACTION, locale)}
                        </Link>
                        <Link href={localizeHref("/solutions/agents", locale)} className="pw-secondary-button pw-btn-lg w-full sm:w-auto">
                            {t("Είστε ασφαλιστής ομαδικών;", "Do you broker group plans?")}
                        </Link>
                    </div>
                    <p className="mt-3 text-body-sm text-[#5B6A7A] dark:text-slate-400">
                        {pick(CTA_REASSURANCE_SHORT, locale)}
                    </p>
                </div>
            </section>

            {/* BENEFITS TRIAD */}
            <section className="px-6 lg:px-12 py-24 mt-12 bg-[#F8FAFC] dark:bg-slate-900">
                <div className="mx-auto max-w-page">
                    <div className="max-w-[720px] mb-14">
                        <h2 className="text-h2 font-semibold tracking-[-0.03em] mb-5 leading-[1.1] text-[#0F172A] dark:text-white text-balance">
                            {t("Το ένα τρίτο του πακέτου παροχών που ξεχνιέται.", "The forgotten third of the benefits package.")}
                        </h2>
                        <p className="text-[#475569] dark:text-slate-300 text-lead leading-relaxed">
                            {t("Υγεία, σύνταξη, ζωή: τα ομαδικά προγράμματα συνήθως έρχονται πακέτο, αλλά μόνο τα δύο πρώτα συζητιούνται. Δείτε και τα τρία μαζί, ανά εργαζόμενο.", "Health, pension, life: group plans usually arrive as a package, but only the first two get discussed. See all three together, per employee.")}
                        </p>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-3">
                        {triad.map((pillar) => {
                            const Icon = pillar.icon
                            const card = (
                                <div className={`h-full rounded-2xl border p-7 ${pillar.current ? "border-[#29685B]/30 bg-white dark:bg-slate-900 shadow-[0_20px_40px_rgba(0,0,0,0.04)]" : "border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-900"}`}>
                                    <div className="mb-5 flex items-center justify-between">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#DCEBDA] dark:bg-[#29685B]/30">
                                            <Icon className="h-5 w-5 text-[#0F172A] dark:text-white" />
                                        </div>
                                        {pillar.current ? (
                                            <span className="rounded-full bg-[#F0FDF4] dark:bg-[#29685B]/15 px-2 py-1 text-micro font-semibold uppercase tracking-wider text-[#166534] dark:text-[#A7F3D0]">
                                                {t("Αυτή η σελίδα", "This page")}
                                            </span>
                                        ) : (
                                            <ArrowRight className="h-4 w-4 text-[#5B6A7A] dark:text-slate-400" />
                                        )}
                                    </div>
                                    <h3 className="text-title font-semibold text-[#0F172A] dark:text-white mb-3">{t(pillar.titleEl, pillar.titleEn)}</h3>
                                    <p className="text-body leading-relaxed text-[#475569] dark:text-slate-300">{t(pillar.descEl, pillar.descEn)}</p>
                                </div>
                            )
                            return pillar.href ? (
                                <Link key={pillar.titleEn} href={localizeHref(pillar.href, locale)} className="block h-full">
                                    {card}
                                </Link>
                            ) : (
                                <div key={pillar.titleEn} className="h-full">{card}</div>
                            )
                        })}
                    </div>
                </div>
            </section>

            {/* TWO AUDIENCES */}
            <section className="px-6 lg:px-12 py-24">
                <div className="mx-auto max-w-page grid gap-16 md:grid-cols-2">
                    <div>
                        <h2 className="text-h3 font-semibold tracking-[-0.03em] mb-5 leading-[1.15] text-[#0F172A] dark:text-white">
                            {t("Για HR και ιδιοκτήτες επιχειρήσεων", "For HR and business owners")}
                        </h2>
                        <p className="text-[#475569] dark:text-slate-300 text-lead leading-relaxed">
                            {t("Ανεβάστε το ομαδικό συμβόλαιο και δείτε τις παροχές του χαρτογραφημένες: κεφάλαια ανά εργαζόμενο, συμπληρωματικές καλύψεις, ημερομηνία ανανέωσης. Όταν έρθει η στιγμή της διαπραγμάτευσης, ξέρετε τι ακριβώς πληρώνετε.", "Upload the group policy and see its benefits mapped: capital per employee, supplementary covers, renewal date. When negotiation time comes, you know exactly what you are paying for.")}
                        </p>
                    </div>
                    <div>
                        <h2 className="text-h3 font-semibold tracking-[-0.03em] mb-5 leading-[1.15] text-[#0F172A] dark:text-white">
                            {t("Για εργαζομένους", "For employees")}
                        </h2>
                        <p className="text-[#475569] dark:text-slate-300 text-lead leading-relaxed">
                            {t("Η ομαδική ασφάλεια ζωής της δουλειάς σας μετράει. Αν το ατομικό σας συμβόλαιο την αγνοεί, ίσως πληρώνετε δύο φορές για το ίδιο. Ή ίσως στηρίζεστε σε λιγότερα χρήματα απ' όσα νομίζετε.", "The group life cover from your job counts. If your personal policy ignores it, you may be paying twice for the same thing. Or leaning on less money than you think.")}
                        </p>
                    </div>
                </div>
            </section>

            <LobFaq categoryId="group-life" locale={locale} />

            <ProductCategoryExplorer currentCategoryId="group-life" locale={locale} />

            {/* CTA */}
            <section className="bg-cta-dark text-white py-24 text-center px-6">
                <h2 className="text-h2 lg:text-h1 font-semibold tracking-[-0.03em] leading-[1.1] mb-8 text-white max-w-2xl mx-auto text-balance">
                    {t("Μια παροχή που κανείς δεν διαβάζει αξίζει να τη βλέπουν όλοι.", "A benefit nobody reads deserves to be seen by everyone.")}
                </h2>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link href={authHref("/auth/signup", locale)} className="pw-primary-button-mint pw-btn-lg">
                        {t("Ανεβάστε το ομαδικό σας", "Upload your group policy")}
                    </Link>
                    <Link href={localizeHref("/solutions/agents", locale)} className="pw-secondary-button-inverse pw-btn-lg">
                        {t("Λύσεις για ασφαλιστές", "Solutions for agents")}
                    </Link>
                </div>
            </section>

        </LoBPageShell>
    )
}
