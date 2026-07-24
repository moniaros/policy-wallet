"use client"

import Link from "next/link"
import { CheckCircle2, Globe, Shield, Users } from "lucide-react"
import { LoBPageShell } from "@/components/landing/LoBPageShell"
import { useLanguage } from "@/contexts/LanguageContext"
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
                    <h1 className="mb-6 text-h1 font-semibold leading-[1.05] tracking-tight md:text-display">
                        {t("Καινοτομώντας στην ψηφιακή ασφάλεια.", "Innovating digital trust.")}
                    </h1>
                    <p className="mx-auto max-w-2xl text-lead leading-relaxed text-[#475569] md:text-title">
                        {t(
                            "Η PolicyWallet δημιουργήθηκε για να κάνει τη διαχείριση ασφαλιστηρίων απλή, διαφανή και προσβάσιμη.",
                            "PolicyWallet was built to make insurance management simple, transparent, and accessible."
                        )}
                    </p>
                </section>

                {/* Definitional block — the "PolicyWallet is..." sentence answer
                    engines extract, followed by concrete company facts. */}
                <section className="mx-auto mb-20 max-w-4xl px-6 lg:px-12">
                    <div className="rounded-2xl border border-[#DCEBDA] bg-[#F0FDF4] p-8 md:p-10">
                        <h2 className="mb-4 text-h3 font-semibold tracking-tight text-[#0F172A]">
                            {t("Τι είναι το PolicyWallet;", "What is PolicyWallet?")}
                        </h2>
                        <p className="mb-6 text-lead leading-relaxed text-[#334155]">
                            {siteConfig.definition[lang]}
                        </p>
                        <ul className="space-y-3">
                            {[
                                {
                                    el: "Δεν είμαστε ασφαλιστική εταιρεία και δεν πουλάμε ασφαλιστικά προϊόντα — είμαστε το ουδέτερο εργαλείο του ασφαλισμένου.",
                                    en: "We are not an insurance company and we do not sell insurance products — we are the policyholder's neutral tool.",
                                },
                                {
                                    el: "Αναλύουμε συμβόλαια κάθε ασφαλιστικής εταιρείας: αυτοκίνητο, κατοικία, υγεία, ομαδικά, κυβερνοασφάλεια και κατοικίδια.",
                                    en: "We analyze policies from any insurer: motor, home, health, group, cyber, and pet.",
                                },
                                {
                                    el: "Εξυπηρετούμε τρεις ρόλους — ασφαλισμένους, ασφαλιστικούς πράκτορες και πρακτορεία — στα ελληνικά και στα αγγλικά.",
                                    en: "We serve three roles — policyholders, insurance agents, and agencies — in Greek and English.",
                                },
                                {
                                    el: "Τα δεδομένα φιλοξενούνται κρυπτογραφημένα σε ευρωπαϊκούς servers, με πλήρη συμμόρφωση GDPR.",
                                    en: "Data is hosted encrypted on EU servers, fully GDPR-compliant.",
                                },
                            ].map((item) => (
                                <li key={item.en} className="flex items-start gap-3 text-body-lg leading-relaxed text-[#0F172A]">
                                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#29685B]" />
                                    {t(item.el, item.en)}
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>

                <section className="mx-auto mb-24 max-w-page-wide px-6 lg:px-12">
                    <div className="grid gap-8 md:grid-cols-3">
                        <article className="rounded-2xl border border-[#DCEBDA] bg-[#F0FDF4] p-10">
                            <Shield className="mb-6 h-8 w-8 text-[#0F172A]" />
                            <h3 className="mb-3 text-h3 font-semibold tracking-tight">
                                {t("Ασφάλεια Πρώτα", "Security First")}
                            </h3>
                            <p className="text-body-lg leading-relaxed text-[#475569]">
                                {t(
                                    "Κρυπτογράφηση enterprise επιπέδου και αρχιτεκτονική privacy-by-design.",
                                    "Enterprise-grade encryption and privacy-by-design architecture."
                                )}
                            </p>
                        </article>

                        <article className="rounded-2xl border border-[#DCEBDA] bg-[#F0FDF4] p-10">
                            <Globe className="mb-6 h-8 w-8 text-[#0F172A]" />
                            <h3 className="mb-3 text-h3 font-semibold tracking-tight">
                                {t("Διαφάνεια", "Transparency")}
                            </h3>
                            <p className="text-body-lg leading-relaxed text-[#475569]">
                                {t(
                                    "Ο χρήστης βλέπει καθαρά καλύψεις, εξαιρέσεις και ενέργειες χωρίς κρυφές πολυπλοκότητες.",
                                    "Users get clear visibility across coverage, exclusions, and actions without hidden complexity."
                                )}
                            </p>
                        </article>

                        <article className="rounded-2xl border border-[#DCEBDA] bg-[#F0FDF4] p-10">
                            <Users className="mb-6 h-8 w-8 text-[#0F172A]" />
                            <h3 className="mb-3 text-h3 font-semibold tracking-tight">
                                {t("Πελατοκεντρική Προσέγγιση", "Customer Obsessed")}
                            </h3>
                            <p className="text-body-lg leading-relaxed text-[#475569]">
                                {t(
                                    "Κάθε ροή και κάθε οθόνη βελτιώνεται με πραγματικά σενάρια χρήσης από πελάτες και συνεργάτες.",
                                    "Every workflow and screen is refined with real customer and advisor usage patterns."
                                )}
                            </p>
                        </article>
                    </div>
                </section>

                <section className="mx-auto mb-24 max-w-4xl px-6 lg:px-12">
                    <h2 className="mb-6 text-h2 font-semibold tracking-tight text-[#0F172A] md:text-h1">
                        {t("Γιατί το φτιάξαμε;", "Why did we build it?")}
                    </h2>
                    <div className="space-y-5 text-lead leading-[1.75] text-[#334155]">
                        <p>
                            {t(
                                "Η Ελλάδα έχει από τα χαμηλότερα ποσοστά ιδιωτικής ασφάλισης στην Ευρώπη — και όσοι ασφαλίζονται, σπάνια γνωρίζουν τι ακριβώς καλύπτει το συμβόλαιό τους. Οι όροι είναι μακροσκελείς, οι εξαιρέσεις κρυμμένες και η σύγκριση σχεδόν αδύνατη για έναν μη ειδικό.",
                                "Greece has one of the lowest private-insurance penetration rates in Europe — and those who do insure rarely know what their policy actually covers. Terms run long, exclusions hide in the fine print, and comparison is nearly impossible for a non-expert."
                            )}
                        </p>
                        <p>
                            {t(
                                "Το PolicyWallet αναπτύσσεται στην Ελλάδα, για την ελληνική αγορά, από ομάδα με εμπειρία σε λογισμικό και χρηματοοικονομικές υπηρεσίες. Χτίζουμε το εργαλείο που θα θέλαμε να έχουμε ως ασφαλισμένοι: ένα ουδέτερο ψηφιακό πορτοφόλι που διαβάζει τα συμβόλαια για εσάς, εξηγεί τι σημαίνουν και σας προειδοποιεί πριν μείνετε ακάλυπτοι.",
                                "PolicyWallet is developed in Greece, for the Greek market, by a team with experience in software and financial services. We are building the tool we wished we had as policyholders: a neutral digital wallet that reads policies for you, explains what they mean, and warns you before you are left uncovered."
                            )}
                        </p>
                        <p>
                            {t(
                                "Το επιχειρηματικό μας μοντέλο είναι συνειδητά απλό: συνδρομές. Δεν παίρνουμε προμήθειες από ασφαλιστικές, δεν πουλάμε δεδομένα και δεν προωθούμε προϊόντα — έτσι η ανάλυση που βλέπετε έχει πάντα το δικό σας συμφέρον ως μοναδικό κριτήριο.",
                                "Our business model is deliberately simple: subscriptions. We take no commissions from insurers, sell no data, and promote no products — so the analysis you see always has your interest as its only criterion."
                            )}
                        </p>
                    </div>
                </section>

                {/* Founders / team — renders only when real people are published
                    in lib/seo/team.ts (paired with Person JSON-LD on the page). */}
                {teamMembers.length > 0 && (
                    <section className="mx-auto mb-24 max-w-4xl px-6 lg:px-12">
                        <h2 className="mb-6 text-h2 font-semibold tracking-tight text-[#0F172A] md:text-h1">
                            {t("Η ομάδα", "The team")}
                        </h2>
                        <div className="grid gap-6 sm:grid-cols-2">
                            {teamMembers.map((member) => (
                                <article
                                    key={member.slug}
                                    id={member.slug}
                                    className="rounded-2xl border border-[#E2E8F0] bg-white p-6"
                                >
                                    <h3 className="text-title font-semibold text-[#0F172A]">{member.name}</h3>
                                    <p className="mt-1 text-body font-medium uppercase tracking-wider text-[#5B6A7A]">
                                        {isGreek ? member.role.el : member.role.en}
                                    </p>
                                    <p className="mt-3 text-body leading-relaxed text-[#334155]">
                                        {isGreek ? member.bio.el : member.bio.en}
                                    </p>
                                    {member.credentials && (
                                        <p className="mt-2 text-body-sm text-[#5B6A7A]">
                                            {isGreek ? member.credentials.el : member.credentials.en}
                                        </p>
                                    )}
                                    {member.profileUrl && (
                                        <a
                                            href={member.profileUrl}
                                            target="_blank"
                                            rel="noreferrer noopener"
                                            className="mt-3 inline-block text-body font-semibold text-[#0F172A] underline underline-offset-4"
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
                                {t("Ελάτε στην ομάδα μας", "Join our mission")}
                            </h2>
                            <p className="mb-10 text-lead leading-relaxed text-[#5B6A7A]">
                                {t(
                                    "Αναζητούμε ανθρώπους που θέλουν να εξελίξουν την εμπειρία ασφάλισης στην Ελλάδα και διεθνώς.",
                                    "We are hiring people who want to modernize insurance experiences in Greece and beyond."
                                )}
                            </p>
                            <Link
                                href={`mailto:${siteConfig.careersEmail}`}
                                className="pw-primary-button-inverse pw-btn-lg"
                            >
                                {t("Δείτε τις ανοιχτές θέσεις", "View open roles")}
                            </Link>
                            {/* Plain-text address so crawlers can read it despite
                                CDN-level email obfuscation of mailto links. */}
                            <p className="mt-6 text-body text-[#5B6A7A]">{siteConfig.careersEmail}</p>
                        </div>
                    </div>
                </section>
            </main>
        </LoBPageShell>
    )
}
