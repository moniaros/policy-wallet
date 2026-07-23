import React from "react"
import Link from "next/link"
import { HeartHandshake, ShieldAlert, CheckCircle2 } from "lucide-react"
import { ProductCategoryExplorer } from "@/components/landing/ProductCategoryExplorer"
import { LoBPageShell } from "@/components/landing/LoBPageShell"

export default function LifeProductPage({ locale }: { locale: "el" | "en" }) {
    const isGreek = locale === "el"
    const t = (el: string, en: string) => (isGreek ? el : en)

    return (
        <LoBPageShell activeNav="product" locale={locale}>

            {/* HERO */}
            <section className="px-6 lg:px-12">
                <div className="mx-auto max-w-form text-center">
                    <span className="inline-flex bg-[#DCEBDA] text-[#166534] px-3 py-1 rounded-full text-caption font-semibold tracking-wider uppercase mb-6">
                        {t("Ασφάλεια Ζωής", "Life Insurance")}
                    </span>
                    <h1 className="text-h1 lg:text-display leading-[1.05] tracking-[-0.04em] font-semibold text-[#0F172A] mb-8">
                        {t("Αρκεί το κεφάλαιο για τους δικούς σας;", "Would the payout actually be enough?")}
                    </h1>
                    <p className="mx-auto max-w-reading text-title leading-[1.5] text-[#475569] mb-10">
                        {t("Υπόλοιπο στεγαστικού, έξοδα οικογένειας, σπουδές παιδιών: βάλτε το κεφάλαιο κάλυψης δίπλα στις πραγματικές σας υποχρεώσεις και δείτε αν στέκει.", "Outstanding mortgage, family expenses, children's education: place your coverage capital next to your real obligations and see if it holds up.")}
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link href="/auth/signup" className="pw-primary-button pw-btn-lg w-full sm:w-auto">
                            {t("Ξεκινήστε δωρεάν", "Get Started Free")}
                        </Link>
                    </div>
                </div>
            </section>

            {/* FEATURE DEEP DIVE */}
            <section className="px-6 lg:px-12 py-24 mt-12 bg-[#F8FAFC]">
                <div className="mx-auto max-w-page grid md:grid-cols-2 gap-16 items-center">
                    <div>
                        <h2 className="text-h2 font-semibold tracking-[-0.03em] mb-6 leading-[1.1] text-[#0F172A]">
                            {t("Το συμβόλαιο ζωής δεν είναι «ένα χαρτί στο συρτάρι».", "A life policy is not just paper in a drawer.")}
                        </h2>
                        <p className="text-[#475569] text-lead leading-relaxed mb-8">
                            {t("Παροχή θανάτου, μόνιμη αναπηρία, σοβαρές ασθένειες, προστασία δανείου — τέσσερα σκέλη που συχνά αγοράστηκαν πριν χρόνια και δεν ξαναδιαβάστηκαν ποτέ. Η AI τα ξεχωρίζει και τα εξηγεί ένα προς ένα.", "Death benefit, permanent disability, critical illness, mortgage protection — four components often bought years ago and never re-read. Our AI separates and explains each one.")}
                        </p>
                        <ul className="space-y-6">
                            <li className="flex gap-4">
                                <div className="flex-shrink-0 mt-1"><CheckCircle2 className="w-6 h-6 text-[#29685B]" /></div>
                                <div>
                                    <h4 className="text-lead font-semibold text-[#0F172A]">{t("Κεφάλαιο vs Υποχρεώσεις", "Capital vs Obligations")}</h4>
                                    <p className="text-[#475569]">{t("Ένα κεφάλαιο που ορίστηκε όταν το στεγαστικό ήταν στην αρχή του μπορεί σήμερα να μην καλύπτει ούτε το υπόλοιπο του δανείου.", "A sum insured set when your mortgage was new may no longer cover even the remaining loan balance today.")}</p>
                                </div>
                            </li>
                            <li className="flex gap-4">
                                <div className="flex-shrink-0 mt-1"><CheckCircle2 className="w-6 h-6 text-[#29685B]" /></div>
                                <div>
                                    <h4 className="text-lead font-semibold text-[#0F172A]">{t("Σοβαρές Ασθένειες & Αναπηρία", "Critical Illness & Disability")}</h4>
                                    <p className="text-[#475569]">{t("Δείτε αν οι συμπληρωματικές καλύψεις πληρώνουν όσο ζείτε — ή μόνο μετά. Η διαφορά κρίνει το εισόδημα της οικογένειας.", "See whether supplementary covers pay while you are alive — or only after. That difference decides your family's income.")}</p>
                                </div>
                            </li>
                            <li className="flex gap-4">
                                <div className="flex-shrink-0 mt-1"><CheckCircle2 className="w-6 h-6 text-[#29685B]" /></div>
                                <div>
                                    <h4 className="text-lead font-semibold text-[#0F172A]">{t("Δικαιούχοι με μία ματιά", "Beneficiaries at a Glance")}</h4>
                                    <p className="text-[#475569]">{t("Ποιος εισπράττει, με ποια σειρά και υπό ποιους όρους — καταγεγραμμένα καθαρά, όχι θαμμένα στη σελίδα 14.", "Who receives the benefit, in what order and under which terms — recorded clearly, not buried on page 14.")}</p>
                                </div>
                            </li>
                        </ul>
                    </div>

                    {/* Mock UI */}
                    <div className="bg-white p-8 rounded-[12px] border border-[#E2E8F0] shadow-[0_20px_40px_rgba(0,0,0,0.04)]">
                        <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-4">
                            <div>
                                <h3 className="text-body font-bold text-[#0F172A] uppercase tracking-wider">Family Protection</h3>
                                <p className="text-body-sm text-gray-500">Term Life · 2 Dependents</p>
                            </div>
                        </div>
                        <div className="space-y-5">
                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-[#475569]">Coverage vs Mortgage Balance</span>
                                    <span className="font-medium text-amber-600">Gap Detected</span>
                                </div>
                                <div className="w-full bg-gray-100 h-2 rounded-full">
                                    <div className="bg-amber-500 w-[72%] h-2 rounded-full" />
                                </div>
                            </div>
                            <div className="p-4 bg-[#F0FDF4] rounded-lg flex justify-between items-center border border-[#29685B]/20">
                                <div className="font-medium text-[#166534] text-sm">Critical Illness Included</div>
                                <HeartHandshake className="w-5 h-5 text-[#29685B]" />
                            </div>
                            <div className="p-4 bg-rose-50 rounded-lg flex justify-between border border-rose-100">
                                <div>
                                    <p className="font-medium text-rose-900 text-sm flex items-center gap-2">
                                        <ShieldAlert className="w-4 h-4" /> Missing Cover
                                    </p>
                                    <p className="text-xs text-rose-700 mt-1">- Permanent Disability Rider</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <ProductCategoryExplorer currentCategoryId="life" locale={locale} />

            {/* CTA */}
            <section className="bg-[#1A2420] text-white py-24 text-center px-6">
                <h2 className="text-h2 lg:text-h1 font-semibold tracking-[-0.03em] leading-[1.1] mb-8 text-white max-w-2xl mx-auto">
                    {t("Μην αφήσετε την οικογένειά σας με ερωτηματικά.", "Don't leave your family with question marks.")}
                </h2>
                <Link href="/auth/signup" className="pw-primary-button-mint pw-btn-lg">
                    {t("Ανεβάστε το συμβόλαιο ζωής σας", "Upload your life policy")}
                </Link>
            </section>

        </LoBPageShell>
    )
}
