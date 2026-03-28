"use client"

import Link from "next/link"
import { Globe, Shield, Users } from "lucide-react"
import { LoBPageShell } from "@/components/landing/LoBPageShell"
import { useLanguage } from "@/contexts/LanguageContext"

export default function CompanyPage() {
    const { language } = useLanguage()
    const isGreek = language === "el"
    const t = (el: string, en: string) => (isGreek ? el : en)

    return (
        <LoBPageShell activeNav="company">
            <main className="pb-24">
                <section className="mx-auto mb-20 max-w-4xl px-6 text-center lg:px-12">
                    <h1 className="mb-6 text-[48px] font-medium leading-[1.05] tracking-tight md:text-[72px]">
                        {t("Καινοτομώντας στην ψηφιακή ασφάλεια.", "Innovating digital trust.")}
                    </h1>
                    <p className="mx-auto max-w-2xl text-[18px] leading-relaxed text-[#475569] md:text-[22px]">
                        {t(
                            "Η PolicyWallet δημιουργήθηκε για να κάνει τη διαχείριση ασφαλιστηρίων απλή, διαφανή και προσβάσιμη.",
                            "PolicyWallet was built to make insurance management simple, transparent, and accessible."
                        )}
                    </p>
                </section>

                <section className="mx-auto mb-24 max-w-[1400px] px-6 lg:px-12">
                    <div className="grid gap-8 md:grid-cols-3">
                        <article className="rounded-2xl border border-[#C1D5E0] bg-[#D7E4ED] p-10">
                            <Shield className="mb-6 h-8 w-8 text-[#0F172A]" />
                            <h3 className="mb-3 text-[24px] font-medium tracking-tight">
                                {t("Ασφάλεια Πρώτα", "Security First")}
                            </h3>
                            <p className="text-[16px] leading-relaxed text-[#475569]">
                                {t(
                                    "Κρυπτογράφηση enterprise επιπέδου και αρχιτεκτονική privacy-by-design.",
                                    "Enterprise-grade encryption and privacy-by-design architecture."
                                )}
                            </p>
                        </article>

                        <article className="rounded-2xl border border-[#C3D9C1] bg-[#DCEBDA] p-10">
                            <Globe className="mb-6 h-8 w-8 text-[#0F172A]" />
                            <h3 className="mb-3 text-[24px] font-medium tracking-tight">
                                {t("Διαφάνεια", "Transparency")}
                            </h3>
                            <p className="text-[16px] leading-relaxed text-[#475569]">
                                {t(
                                    "Ο χρήστης βλέπει καθαρά καλύψεις, εξαιρέσεις και ενέργειες χωρίς κρυφές πολυπλοκότητες.",
                                    "Users get clear visibility across coverage, exclusions, and actions without hidden complexity."
                                )}
                            </p>
                        </article>

                        <article className="rounded-2xl border border-[#D9D0C1] bg-[#EBE5D9] p-10">
                            <Users className="mb-6 h-8 w-8 text-[#0F172A]" />
                            <h3 className="mb-3 text-[24px] font-medium tracking-tight">
                                {t("Πελατοκεντρική Προσέγγιση", "Customer Obsessed")}
                            </h3>
                            <p className="text-[16px] leading-relaxed text-[#475569]">
                                {t(
                                    "Κάθε ροή και κάθε οθόνη βελτιώνεται με πραγματικά σενάρια χρήσης από πελάτες και συνεργάτες.",
                                    "Every workflow and screen is refined with real customer and advisor usage patterns."
                                )}
                            </p>
                        </article>
                    </div>
                </section>

                <section className="mx-auto max-w-[1400px] px-6 lg:px-12">
                    <div className="relative overflow-hidden rounded-[32px] bg-[#1A1C1D] py-24 text-white">
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-[#64748B]/20 to-transparent" />
                        <div className="relative z-10 mx-auto max-w-2xl px-6 text-center">
                            <h2 className="mb-6 text-[36px] font-medium tracking-tight md:text-[48px]">
                                {t("Ελάτε στην ομάδα μας", "Join our mission")}
                            </h2>
                            <p className="mb-10 text-[18px] leading-relaxed text-[#94A3B8]">
                                {t(
                                    "Αναζητούμε ανθρώπους που θέλουν να εξελίξουν την εμπειρία ασφάλισης στην Ελλάδα και διεθνώς.",
                                    "We are hiring people who want to modernize insurance experiences in Greece and beyond."
                                )}
                            </p>
                            <Link
                                href="mailto:careers@policywallet.com"
                                className="inline-flex items-center justify-center rounded-2xl bg-white px-8 py-4 text-[16px] font-bold text-[#0F172A] transition-colors hover:bg-gray-100"
                            >
                                {t("Δείτε τις ανοιχτές θέσεις", "View open roles")}
                            </Link>
                        </div>
                    </div>
                </section>
            </main>
        </LoBPageShell>
    )
}
