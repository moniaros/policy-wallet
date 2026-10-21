"use client"

import Link from "next/link"
import { CheckCircle2, Globe, Shield, Users } from "lucide-react"
import { LoBPageShell } from "@/components/landing/LoBPageShell"
import { useLanguage } from "@/contexts/LanguageContext"
import { CATEGORY_NAME } from "@/lib/marketing/positioning"
import { siteConfig } from "@/lib/seo/site"
import { teamMembers } from "@/lib/seo/team"

export default function CompanyPage() {
    const { language } = useLanguage()
    const isGreek = language === "el"
    const t = (el: string, en: string) => (isGreek ? el : en)
    const lang = isGreek ? "el" : "en"

    return (
        <LoBPageShell activeNav="company" locale={language}>
            {/* A div, not a <main>: LoBPageShell already renders the page's one
                <main id={SKIP_LINK_TARGET_ID}>. Nesting a second one here made
                /company the only public page with two main landmarks — the skip
                link and every "jump to main content" shortcut then had two
                candidates. */}
            <div className="pb-24">
                <section className="mx-auto mb-16 max-w-4xl px-6 text-center lg:px-12">
                    {/* Category kicker — the company page opens by naming the
                        category we created; the H1 is its human decode. */}
                    <h1 className="mb-6 text-h1 font-semibold leading-[1.05] tracking-tight md:text-display">
                        {t("Οι ασφάλειές σας, με απλά λόγια.", "Your insurance, in plain language.")}
                    </h1>
                    <p className="mx-auto max-w-2xl text-lead leading-relaxed text-[#475569] dark:text-slate-300 md:text-title">
                        {t(
                            "Φτιάξαμε το PolicyWallet για να βρίσκετε εύκολα τι γράφουν τα ασφαλιστήριά σας και τι χρειάζεται να ρωτήσετε.",
                            "We built PolicyWallet to help you find what your policies say and what you need to ask."
                        )}
                    </p>
                </section>

                {/* Definitional block — the "PolicyWallet is..." sentence answer
                    engines extract, followed by concrete company facts. */}
                <section className="mx-auto mb-20 max-w-4xl px-6 lg:px-12">
                    <div className="rounded-2xl border border-[#DCEBDA] dark:border-[#29685B]/40 bg-[#F0FDF4] dark:bg-[#29685B]/15 p-8 md:p-10">
                        <h2 className="mb-4 text-h3 font-semibold tracking-tight text-[#0F172A] dark:text-white">
                            {t("Τι είναι το PolicyWallet;", "What is PolicyWallet?")}
                        </h2>
                        <p className="mb-6 text-lead leading-relaxed text-[#334155] dark:text-slate-300">
                            {siteConfig.definition[lang]}
                        </p>
                        <ul className="space-y-3">
                            {[
                                {
                                    el: "Δεν είμαστε ασφαλιστική εταιρεία και δεν πουλάμε ασφάλειες. Σας βοηθάμε να οργανώνετε και να καταλαβαίνετε τα ασφαλιστήριά σας.",
                                    en: "We are not an insurance company and do not sell insurance. We help you organise and understand your policies.",
                                },
                                {
                                    el: "Διαβάζουμε ασφαλιστήρια από κάθε ασφαλιστική εταιρεία: αυτοκίνητο, κατοικία, υγεία, ομαδικά, κυβερνοασφάλεια και κατοικίδια.",
                                    en: "We read policies from any insurance company: car, home, health, group schemes, cyber and pets.",
                                },
                                {
                                    el: "Δουλεύουμε για ασφαλισμένους, ασφαλιστές και ασφαλιστικά γραφεία — στα ελληνικά και στα αγγλικά.",
                                    en: "We work for policyholders, insurance agents and agencies — in Greek and English.",
                                },
                                {
                                    el: "Τα αρχεία σας αποθηκεύονται κρυπτογραφημένα στην ΕΕ. Ορισμένοι τεχνικοί πάροχοι μπορεί να επεξεργάζονται στοιχεία εκτός ΕΕ. Μπορείτε να ζητήσετε αντίγραφο ή διαγραφή· στην πολιτική απορρήτου εξηγούμε τη διαδικασία.",
                                    en: "Your files are stored encrypted in the EU. Some technical providers may process data outside the EU. You can request a copy or deletion; our Privacy Policy explains the process.",
                                },
                            ].map((item) => (
                                <li key={item.en} className="flex items-start gap-3 text-body-lg leading-relaxed text-[#0F172A] dark:text-white">
                                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#29685B] dark:text-brand-accent" />
                                    {t(item.el, item.en)}
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>

                <section className="mx-auto mb-24 max-w-page-wide px-6 lg:px-12">
                    <div className="grid gap-8 md:grid-cols-3">
                        <article className="rounded-2xl border border-[#DCEBDA] dark:border-[#29685B]/40 bg-[#F0FDF4] dark:bg-[#29685B]/15 p-10">
                            <Shield className="mb-6 h-8 w-8 text-[#0F172A] dark:text-white" />
                            <h3 className="mb-3 text-h3 font-semibold tracking-tight">
                                {t("Πρώτα η ασφάλεια των δεδομένων σας", "Your data's security comes first")}
                            </h3>
                            <p className="text-body-lg leading-relaxed text-[#475569] dark:text-slate-300">
                                {t(
                                    "Περιορίζουμε την πρόσβαση στα αρχεία σας και τα αποθηκεύουμε κρυπτογραφημένα. Στην πολιτική απορρήτου εξηγούμε ποιος χρησιμοποιεί τα στοιχεία σας και γιατί.",
                                    "We restrict access to your files and store them encrypted. Our Privacy Policy explains who uses your data and why."
                                )}
                            </p>
                        </article>

                        <article className="rounded-2xl border border-[#DCEBDA] dark:border-[#29685B]/40 bg-[#F0FDF4] dark:bg-[#29685B]/15 p-10">
                            <Globe className="mb-6 h-8 w-8 text-[#0F172A] dark:text-white" />
                            <h3 className="mb-3 text-h3 font-semibold tracking-tight">
                                {t("Ξέρετε πώς λειτουργούμε", "Know how we work")}
                            </h3>
                            <p className="text-body-lg leading-relaxed text-[#475569] dark:text-slate-300">
                                {t(
                                    "Σας δείχνουμε τι καλύπτεται και τι όχι, με τους όρους και τα όρια που γράφει το ασφαλιστήριό σας.",
                                    "We show you what you are covered for, what is excluded, and what you can do about it. No asterisks."
                                )}
                            </p>
                        </article>

                        <article className="rounded-2xl border border-[#DCEBDA] dark:border-[#29685B]/40 bg-[#F0FDF4] dark:bg-[#29685B]/15 p-10">
                            <Users className="mb-6 h-8 w-8 text-[#0F172A] dark:text-white" />
                            <h3 className="mb-3 text-h3 font-semibold tracking-tight">
                                {t("Φτιαγμένο για ανθρώπους, όχι για ειδικούς", "Built for people, not for experts")}
                            </h3>
                            <p className="text-body-lg leading-relaxed text-[#475569] dark:text-slate-300">
                                {t(
                                    "Αν μια πρόταση χρειάζεται ασφαλιστικές γνώσεις για να τη διαβάσετε, την ξαναγράφουμε.",
                                    "If a sentence needs insurance knowledge to read, we rewrite it."
                                )}
                            </p>
                        </article>
                    </div>
                </section>

                <section className="mx-auto mb-24 max-w-4xl px-6 lg:px-12">
                    <h2 className="mb-6 text-h2 font-semibold tracking-tight text-[#0F172A] dark:text-white md:text-h1">
                        {t("Γιατί το φτιάξαμε", "Why we built it")}
                    </h2>
                    <div className="space-y-5 text-lead leading-[1.75] text-[#334155] dark:text-slate-300">
                        <p>
                            {t(
                                "Οι ασφαλιστικοί όροι μπορεί να είναι δύσκολοι. Για να βρείτε μια απάντηση, συχνά χρειάζεται να διαβάσετε πολλές σελίδες. Θέλουμε να σας βοηθήσουμε να ξεκινήσετε από τα βασικά.",
                                "Insurance terms can be difficult. Finding an answer often means reading many pages. We want to help you start with the essentials."
                            )}
                        </p>
                        <p>
                            {t(
                                "Το PolicyWallet φτιάχνεται στην Ελλάδα για ανθρώπους και επιχειρήσεις που έχουν ασφαλιστήρια. Συγκεντρώνει τα έγγραφα, εξηγεί τι αναφέρουν και βοηθά να παρακολουθείτε τις ημερομηνίες τους.",
                                "PolicyWallet is built in Greece for people and businesses with insurance policies. It brings documents together, explains what they say and helps you track their dates."
                            )}
                        </p>
                        <p>
                            {t(
                                "Ο τρόπος που βγάζουμε λεφτά είναι επίτηδες απλός: συνδρομές. Δεν παίρνουμε προμήθεια από ασφαλιστικές, δεν πουλάμε δεδομένα και δεν προωθούμε προϊόντα. Κανείς δεν μας πληρώνει για να σας πούμε κάτι συγκεκριμένο.",
                                "The way we make money is deliberately simple: subscriptions. We take no commission from insurance companies, we sell no data, and we push no products. Nobody pays us to tell you a particular thing."
                            )}
                        </p>
                    </div>
                </section>

                {/* Founders / team — renders only when real people are published
                    in lib/seo/team.ts (paired with Person JSON-LD on the page). */}
                {teamMembers.length > 0 && (
                    <section className="mx-auto mb-24 max-w-4xl px-6 lg:px-12">
                        <h2 className="mb-6 text-h2 font-semibold tracking-tight text-[#0F172A] dark:text-white md:text-h1">
                            {t("Η ομάδα", "The team")}
                        </h2>
                        <div className="grid gap-6 sm:grid-cols-2">
                            {teamMembers.map((member) => (
                                <article
                                    key={member.slug}
                                    id={member.slug}
                                    className="rounded-2xl border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-900 p-6"
                                >
                                    <h3 className="text-title font-semibold text-[#0F172A] dark:text-white">{member.name}</h3>
                                    <p className="mt-1 text-body font-medium uppercase tracking-wider text-[#5B6A7A] dark:text-slate-400">
                                        {isGreek ? member.role.el : member.role.en}
                                    </p>
                                    <p className="mt-3 text-body leading-relaxed text-[#334155] dark:text-slate-300">
                                        {isGreek ? member.bio.el : member.bio.en}
                                    </p>
                                    {member.credentials && (
                                        <p className="mt-2 text-body-sm text-[#5B6A7A] dark:text-slate-400">
                                            {isGreek ? member.credentials.el : member.credentials.en}
                                        </p>
                                    )}
                                    {member.profileUrl && (
                                        <a
                                            href={member.profileUrl}
                                            target="_blank"
                                            rel="noreferrer noopener"
                                            className="mt-3 inline-block text-body font-semibold text-[#0F172A] dark:text-white underline underline-offset-4"
                                        >
                                            LinkedIn
                                        </a>
                                    )}
                                </article>
                            ))}
                        </div>
                    </section>
                )}

                <section className="mx-auto max-w-page-wide px-6 lg:px-12">
                    <div className="relative overflow-hidden rounded-[32px] bg-cta-dark py-24 text-white">
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-[#64748B]/20 to-transparent" />
                        <div className="relative z-10 mx-auto max-w-2xl px-6 text-center">
                            <h2 className="mb-6 text-h2 font-semibold tracking-tight md:text-h1">
                                {t("Ελάτε στην ομάδα μας", "Join our team")}
                            </h2>
                            <p className="mb-10 text-lead leading-relaxed text-white/75">
                                {t(
                                    "Ψάχνουμε ανθρώπους που θέλουν να κάνουν την ασφάλιση κατανοητή. Γράψτε μας — ακόμη κι αν δεν βλέπετε θέση που σας ταιριάζει.",
                                    "We are looking for people who want to make insurance make sense. Write to us — even if you do not see a role that fits."
                                )}
                            </p>
                            <Link
                                href={`mailto:${siteConfig.careersEmail}`}
                                className="pw-primary-button-inverse pw-btn-lg"
                            >
                                {t("Στείλτε μας email", "Send us an email")}
                            </Link>
                            {/* Plain-text address so crawlers can read it despite
                                CDN-level email obfuscation of mailto links. */}
                            <p className="mt-6 text-body text-white/75">{siteConfig.careersEmail}</p>
                        </div>
                    </div>
                </section>
            </div>
        </LoBPageShell>
    )
}
