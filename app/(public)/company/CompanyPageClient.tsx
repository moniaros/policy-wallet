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
            <main className="pb-24">
                <section className="mx-auto mb-16 max-w-4xl px-6 text-center lg:px-12">
                    {/* Category kicker — the company page opens by naming the
                        category we created; the H1 is its human decode. */}
                    <p className="mb-4 text-caption font-semibold uppercase tracking-widest text-[#29685B] dark:text-[#A7F3D0]">
                        {t(CATEGORY_NAME.el, CATEGORY_NAME.en)}
                    </p>
                    <h1 className="mb-6 text-h1 font-semibold leading-[1.05] tracking-tight md:text-display">
                        {t("Είμαστε με το μέρος σας. Μόνο.", "We are on your side. Only yours.")}
                    </h1>
                    <p className="mx-auto max-w-2xl text-lead leading-relaxed text-[#475569] dark:text-slate-300 md:text-title">
                        {t(
                            "Φτιάξαμε το PolicyWallet για να ξέρετε επιτέλους τι σας καλύπτει η ασφάλειά σας — και τι όχι.",
                            "We built PolicyWallet so that you finally know what your insurance covers you for — and what it does not."
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
                                    el: "Δεν είμαστε ασφαλιστική εταιρεία και δεν πουλάμε ασφαλιστικά προϊόντα — είμαστε το ουδέτερο εργαλείο του ασφαλισμένου.",
                                    en: "We are not an insurance company and we do not sell insurance products — we are the policyholder's neutral tool.",
                                },
                                {
                                    el: "Διαβάζουμε συμβόλαια από κάθε ασφαλιστική εταιρεία: αυτοκίνητο, κατοικία, υγεία, ομαδικά, κυβερνοασφάλεια και κατοικίδια.",
                                    en: "We read policies from any insurance company: car, home, health, group schemes, cyber and pets.",
                                },
                                {
                                    el: "Δουλεύουμε για ασφαλισμένους, ασφαλιστές και ασφαλιστικά γραφεία — στα ελληνικά και στα αγγλικά.",
                                    en: "We work for policyholders, insurance agents and agencies — in Greek and English.",
                                },
                                {
                                    el: "Τα δεδομένα σας φυλάσσονται κρυπτογραφημένα σε διακομιστές μέσα στην Ευρώπη — και τα εξάγετε ή τα διαγράφετε όποτε θέλετε.",
                                    en: "Your data is kept encrypted on servers inside Europe — and you can export or delete it whenever you want.",
                                },
                            ].map((item) => (
                                <li key={item.en} className="flex items-start gap-3 text-body-lg leading-relaxed text-[#0F172A] dark:text-white">
                                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#29685B] dark:text-[#A7F3D0]" />
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
                                    "Τα αρχεία σας είναι κρυπτογραφημένα και μένουν σε διακομιστές μέσα στην Ευρώπη. Τα διαγράφετε όποτε θέλετε.",
                                    "Your files are encrypted and stay on servers inside Europe. You can delete them whenever you want."
                                )}
                            </p>
                        </article>

                        <article className="rounded-2xl border border-[#DCEBDA] dark:border-[#29685B]/40 bg-[#F0FDF4] dark:bg-[#29685B]/15 p-10">
                            <Globe className="mb-6 h-8 w-8 text-[#0F172A] dark:text-white" />
                            <h3 className="mb-3 text-h3 font-semibold tracking-tight">
                                {t("Καμία κρυφή ατζέντα", "No hidden agenda")}
                            </h3>
                            <p className="text-body-lg leading-relaxed text-[#475569] dark:text-slate-300">
                                {t(
                                    "Σας δείχνουμε τι καλύπτεστε, τι εξαιρείται και τι μπορείτε να κάνετε. Χωρίς αστερίσκους.",
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
                                "Όσοι έχουν ιδιωτική ασφάλιση στην Ελλάδα σπάνια ξέρουν τι ακριβώς καλύπτει το συμβόλαιό τους. Οι όροι είναι μακροσκελείς, οι εξαιρέσεις κρυμμένες και η σύγκριση σχεδόν αδύνατη για έναν μη ειδικό.",
                                "People with private insurance in Greece rarely know what their policy actually covers. Terms run long, exclusions stay hidden, and comparison is nearly impossible for a non-expert."
                            )}
                        </p>
                        <p>
                            {t(
                                "Το PolicyWallet φτιάχνεται στην Ελλάδα, για την ελληνική αγορά, από ανθρώπους με εμπειρία στο λογισμικό και στις χρηματοοικονομικές υπηρεσίες. Φτιάχνουμε το εργαλείο που θα θέλαμε να έχουμε εμείς ως ασφαλισμένοι: κάτι που διαβάζει τα συμβόλαια για εσάς, εξηγεί τι λένε και σας ειδοποιεί πριν μείνετε ακάλυπτοι.",
                                "PolicyWallet is built in Greece, for the Greek market, by people with a background in software and financial services. We are building the tool we wish we had as policyholders. Something that reads the policies for you, explains what they say, and warns you before you are left uncovered."
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
                    <div className="relative overflow-hidden rounded-[32px] bg-[#1A2420] py-24 text-white">
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
            </main>
        </LoBPageShell>
    )
}
