"use client"

import React from "react"
import Link from "next/link"
import { Car, CheckCircle2 } from "lucide-react"
import { ProductCategoryExplorer } from "@/components/landing/ProductCategoryExplorer"
import { useLanguage } from "@/contexts/LanguageContext"
import { LoBPageShell } from "@/components/landing/LoBPageShell"

export default function MotorProductPage() {
    const { language } = useLanguage()
    const isGreek = language === "el"
    const t = (el: string, en: string) => (isGreek ? el : en)

    return (
        <LoBPageShell activeNav="product">

            {/* HERO */}
            <section className="px-6 lg:px-12">
                <div className="mx-auto max-w-[900px] text-center">
                    <span className="inline-flex bg-[#D7E4ED] text-[#1A1A1A] px-3 py-1 rounded-[4px] text-[11px] font-semibold tracking-wider uppercase mb-6">
                        {t("Λύσεις Οχημάτων", "Motor Solutions")}
                    </span>
                    <h1 className="text-[46px] lg:text-[68px] leading-[1.05] tracking-[-0.04em] font-medium text-[#0F172A] mb-8">
                        {t("Έξυπνη διαχείριση ασφάλισης οχημάτων.", "Intelligent motor and liability management.")}
                    </h1>
                    <p className="mx-auto max-w-[680px] text-[20px] lg:text-[22px] leading-[1.5] text-[#475569] mb-10">
                        {t("Παρακολουθήστε την αξία αγοράς του οχήματος σας, εντοπίστε κενά στην οδική βοήθεια και αυτοματοποιήστε τις ανανεώσεις.", "Track real-time market values, identify critical gaps in roadside assistance, and fully automate your renewal workflows.")}
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link href="/auth/signup" className="w-full sm:w-auto rounded-[4px] bg-[#29685B] px-8 py-3.5 text-[16px] font-bold text-white transition-colors duration-150 hover:bg-[#1C4E44]">
                            {t("Ξεκινήστε δωρεάν", "Get Started Free")}
                        </Link>
                    </div>
                </div>
            </section>

            {/* FEATURE DEEP DIVE */}
            <section className="px-6 lg:px-12 py-24 mt-12 bg-[#F8FAFC]">
                <div className="mx-auto max-w-[1240px] grid md:grid-cols-2 gap-16 items-center">
                    <div>
                        <h2 className="text-[36px] font-medium tracking-[-0.03em] mb-6 leading-[1.1] text-[#1A1A1A]">
                            {t("Τι καλύπτει η ασφάλεια αυτοκινήτου σας;", "What does your motor insurance actually cover?")}
                        </h2>
                        <p className="text-[#475569] text-[18px] leading-relaxed mb-8">
                            {t("Το AI μας διαβάζει το ασφαλιστήριό σας και μετατρέπει τα δεδομένα σε δυναμικούς πίνακες ελέγχου.", "Our AI engine extracts complex policy details into highly visual, trackable market value meters and gap detectors.")}
                        </p>
                        <ul className="space-y-6">
                            <li className="flex gap-4">
                                <div className="flex-shrink-0 mt-1"><CheckCircle2 className="w-6 h-6 text-[#29685B]" /></div>
                                <div>
                                    <h4 className="text-[18px] font-medium text-[#1A1A1A]">{t("Έλεγχος Τρέχουσας Αξίας", "Market Value Meters")}</h4>
                                    <p className="text-[#475569]">{t("Παρακολουθήστε ζωντανά αν η τρέχουσα αξία του οχήματός σας υπερβαίνει την αποζημίωση.", "Live tracking to ensure your coverage value hasn't drifted below your car's real market value.")}</p>
                                </div>
                            </li>
                            <li className="flex gap-4">
                                <div className="flex-shrink-0 mt-1"><CheckCircle2 className="w-6 h-6 text-[#29685B]" /></div>
                                <div>
                                    <h4 className="text-[18px] font-medium text-[#1A1A1A]">{t("Κενά Οδικής Βοήθειας", "Roadside Gap Analysis")}</h4>
                                    <p className="text-[#475569]">{t("Εντοπισμός χαμένων παροχών ή διπλών καλύψεων πριν μείνετε στον δρόμο.", "Identify missing accident care or double-billed towing coverages instantly.")}</p>
                                </div>
                            </li>
                        </ul>
                    </div>

                    {/* Mock UI */}
                    <div className="bg-white p-8 rounded-[12px] border border-[#E5E5E5] shadow-[0_20px_40px_rgba(0,0,0,0.04)]">
                        <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-4">
                            <div>
                                <h3 className="text-[14px] font-bold text-[#1A1A1A] uppercase tracking-wider">Tesla Model 3</h3>
                                <p className="text-[13px] text-gray-500">Exp. 14 Days</p>
                            </div>
                            <div className="text-right">
                                <div className="text-[20px] font-medium text-[#1A1A1A]">€35,000</div>
                                <p className="text-[13px] text-[#166534] font-medium">Fully Covered</p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-[#475569]">Market Value Meter</span>
                                    <span className="font-medium">98% Match</span>
                                </div>
                                <div className="w-full bg-gray-100 h-2 rounded-full">
                                    <div className="bg-[#29685B] w-[98%] h-2 rounded-full" />
                                </div>
                            </div>
                            <div className="mt-6 flex items-center justify-between bg-[#F0FDF4] text-[#166534] p-4 rounded-lg border border-[#29685B]/20">
                                <span className="font-semibold text-sm flex items-center gap-2">
                                    <Car className="w-4 h-4" /> Roadside Assistance Included
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <ProductCategoryExplorer currentCategoryId="motor" />

            {/* CTA */}
            <section className="bg-[#1A1C1D] text-white py-24 text-center px-6">
                <h2 className="text-[36px] lg:text-[48px] font-medium tracking-[-0.03em] leading-[1.1] mb-8 text-white max-w-2xl mx-auto">
                    {t("Αποκτήστε τον έλεγχο των οχημάτων σας.", "Take full control of your motor policies.")}
                </h2>
                <Link href="/auth/signup" className="inline-flex rounded-[4px] bg-[#89D9B2] px-8 py-4 text-[16px] font-bold text-[#1A1A1A] transition-opacity duration-150 hover:opacity-90">
                    {t("Ξεκινήστε τώρα", "Start organizing today")}
                </Link>
            </section>

        </LoBPageShell>
    )
}
