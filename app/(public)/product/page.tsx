"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { Inter } from "next/font/google"
import { ArrowRight, Menu, X, Shield, Zap, Search, Globe } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { trackLandingEvent } from "@/lib/landing/analytics"
import { PolicyWalletLogo } from "@/components/branding/Logo"

const inter = Inter({
    subsets: ["latin", "greek"],
    weight: ["400", "500", "600", "700"],
})

export default function ProductPage() {
    const { language, setLanguage } = useLanguage()
    const isGreek = language === "el"
    const t = (el: string, en: string) => (isGreek ? el : en)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    // Prevent scrolling when mobile menu is open
    useEffect(() => {
        if (isMobileMenuOpen) {
            document.body.style.overflow = "hidden"
        } else {
            document.body.style.overflow = "unset"
        }
        return () => {
            document.body.style.overflow = "unset"
        }
    }, [isMobileMenuOpen])

    useEffect(() => {
        trackLandingEvent("page_view_product", {
            locale: language as any,
        })
    }, [language])

    return (
        <div className={`${inter.className} min-h-screen bg-white text-[#0F172A] selection:bg-[#64748B]/20 selection:text-[#0F172A]`}>
            {/* HEADER - Floating Pill */}
            <header className="fixed top-4 left-4 right-4 z-50">
                <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between rounded-full bg-white/80 px-6 backdrop-blur-xl border border-gray-200/50 shadow-sm transition-all duration-300">
                    <Link href="/" className="inline-flex items-center text-[20px] font-bold tracking-tight">
                        <span className="text-[#0F172A]">Policy</span><span className="text-[#64748B]">Wallet</span>
                    </Link>

                    <nav className="hidden items-center gap-8 font-medium text-[#475569] md:flex text-[14px]">
                        <Link href="/product" className="text-[#0F172A] transition-colors">{t("Προϊόντα", "Products")}</Link>
                        <Link href="/pricing" className="hover:text-[#0F172A] transition-colors">{t("Τιμολόγηση", "Pricing")}</Link>
                    </nav>

                    <div className="hidden md:flex items-center gap-5">
                        <div className="flex items-center gap-2">
                            <button onClick={() => setLanguage('el')} className={`text-xs font-semibold transition-colors ${language === 'el' ? 'text-[#0F172A]' : 'text-[#64748B] hover:text-[#0F172A]'}`}>EL</button>
                            <span className="text-[#E2E8F0]">|</span>
                            <button onClick={() => setLanguage('en')} className={`text-xs font-semibold transition-colors ${language === 'en' ? 'text-[#0F172A]' : 'text-[#64748B] hover:text-[#0F172A]'}`}>EN</button>
                        </div>
                        <Link href="/auth/signin" className="font-medium text-[#0F172A] hover:text-[#64748B] transition-colors text-[14px]">
                            {t("Σύνδεση", "Log in")}
                        </Link>
                        <Link href="/auth/signup?role=policyholder" className="rounded-full bg-[#29685B] px-5 py-2 text-[14px] font-bold text-white transition-colors hover:bg-[#1C4E44]">
                            {t("Ξεκινήστε", "Get started")}
                        </Link>
                    </div>

                    <button className="md:hidden p-2 -mr-2 text-[#0F172A]" onClick={() => setIsMobileMenuOpen(true)}>
                        <Menu className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {/* FULL-SCREEN MOBILE MENU (Arc Style) */}
            <div className={`fixed inset-0 z-[100] bg-[#29685B] backdrop-blur-3xl text-white flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${isMobileMenuOpen ? "translate-y-0" : "-translate-y-full"}`}>
                <div className="flex h-16 items-center justify-between px-6 pt-4 max-w-[1400px] w-full mx-auto">
                    <Link href="/" className="inline-flex items-center text-[20px] font-bold tracking-tight" onClick={() => setIsMobileMenuOpen(false)}>
                        <span className="text-white">Policy</span><span className="text-white/80">Wallet</span>
                    </Link>
                    <button className="p-2 -mr-2 text-white hover:bg-white/10 rounded-full transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex flex-1 flex-col justify-center px-8 sm:px-12 pb-24 max-w-[1400px] w-full mx-auto">
                    <nav className="flex flex-col gap-6 text-[44px] sm:text-[56px] font-medium tracking-tight mb-12 leading-tight">
                        <Link href="/product" className="text-white hover:text-white/80 transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
                            {t("Προϊόντα", "Products")}
                        </Link>
                        <Link href="/pricing" className="text-white hover:text-white/80 transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
                            {t("Τιμολόγηση", "Pricing")}
                        </Link>
                        <div className="flex items-center gap-4 mt-4 text-[18px] font-bold">
                            <button onClick={() => { setLanguage('el'); setIsMobileMenuOpen(false) }} className={`transition-colors ${language === 'el' ? 'text-white' : 'text-white/50'}`}>EL</button>
                            <span className="text-white/20">|</span>
                            <button onClick={() => { setLanguage('en'); setIsMobileMenuOpen(false) }} className={`transition-colors ${language === 'en' ? 'text-white' : 'text-white/50'}`}>EN</button>
                        </div>
                    </nav>

                    <div className="flex flex-col gap-4 mt-auto">
                        <Link href="/auth/signin" className="w-full rounded-2xl bg-[#1C4E44] border border-transparent px-6 py-4 text-center text-[18px] font-bold text-white transition-colors hover:bg-[#143B33]" onClick={() => setIsMobileMenuOpen(false)}>
                            {t("Σύνδεση", "Log in")}
                        </Link>
                        <Link href="/auth/signup" className="w-full rounded-2xl bg-[#337D6F] px-6 py-4 text-center text-[18px] font-bold text-white transition-transform active:scale-[0.98] hover:bg-[#2C6E61]" onClick={() => setIsMobileMenuOpen(false)}>
                            {t("Ξεκινήστε", "Get started")}
                        </Link>
                    </div>
                </div>
            </div>

            <main className="pt-32 lg:pt-40 pb-24">
                {/* Hero */}
                <section className="px-6 lg:px-12 text-center mb-24 max-w-4xl mx-auto">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-semibold text-xs mb-6 tracking-wide uppercase">
                        <Zap className="w-3.5 h-3.5 flex-shrink-0" />
                        {t("Διαθέσιμο τώρα", "Available Now")}
                    </div>
                    <h1 className="text-[48px] md:text-[64px] font-medium tracking-tight leading-[1.05] mb-6">
                        {t("Το επόμενο επίπεδο ασφάλισης.", "The next level of personal insurance.")}
                    </h1>
                    <p className="text-[18px] md:text-[22px] text-[#475569] mb-10 leading-relaxed max-w-2xl mx-auto">
                        {t("Έχουμε δημιουργήσει την πιο αξιόπιστη υποδομή. Προστατέψτε όσα αγαπάτε με το PolicyWallet.", "We’ve crafted the most reliable infrastructure. Protect what you love with PolicyWallet.")}
                    </p>
                    <div className="flex items-center justify-center gap-4">
                        <Link href="/auth/signup" className="rounded-full bg-[#29685B] px-8 py-3.5 text-[16px] font-bold text-white transition-colors hover:bg-[#1C4E44]">
                            {t("Δοκιμάστε δωρεάν", "Try for free")}
                        </Link>
                    </div>
                </section>

                {/* Product Grid */}
                <section className="px-6 lg:px-12 max-w-[1400px] mx-auto">
                    <div className="grid md:grid-cols-2 gap-6 lg:gap-10">
                        {/* Feature 1 */}
                        <div className="bg-[#D7E4ED] rounded-2xl p-10 lg:p-14 border border-[#C1D5E0] flex flex-col">
                            <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-8">
                                <Shield className="w-6 h-6 text-[#0F172A]" />
                            </div>
                            <h2 className="text-[32px] font-medium tracking-tight mb-4">
                                {t("Απόλυτη Ασφάλεια", "Absolute Security")}
                            </h2>
                            <p className="text-[18px] text-[#475569] leading-relaxed mb-auto">
                                {t("Οργανώστε έγγραφα, στοιχεία και εγγυήσεις σε ένα προστατευμένο περιβάλλον. Δεν γίνεται διαμοιρασμός δεδομένων χωρίς την έγκρισή σας.", "Organize documents, info, and warranties in a protected environment. Data is never shared without your explicit consent.")}
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="bg-[#DCEBDA] rounded-2xl p-10 lg:p-14 border border-[#C3D9C1] flex flex-col">
                            <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-8">
                                <Search className="w-6 h-6 text-[#0F172A]" />
                            </div>
                            <h2 className="text-[32px] font-medium tracking-tight mb-4">
                                {t("Έξυπνη Ανακάλυψη Κενών", "Smart Gap Detection")}
                            </h2>
                            <p className="text-[18px] text-[#475569] leading-relaxed mb-auto">
                                {t("Η τεχνητή νοημοσύνη διασταυρώνει τα ασφαλιστήρια σας και εντοπίζει διπλές καλύψεις καθώς και κρίσιμα κενά.", "Our Artificial Intelligence cross-references your policies, detecting overlapping coverages and critical insurance gaps.")}
                            </p>
                        </div>

                        {/* Feature 3 (Full width) */}
                        <div className="bg-[#EBE5D9] text-[#1A1A1A] rounded-2xl p-10 lg:p-14 md:col-span-2 flex flex-col md:flex-row gap-12 items-center">
                            <div className="flex-1">
                                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-8 shadow-sm">
                                    <Globe className="w-6 h-6 text-[#0F172A]" />
                                </div>
                                <h2 className="text-[32px] md:text-[40px] font-medium tracking-tight mb-4">
                                    {t("Διασύνδεση με Ασφαλιστές", "Connect with Insurers")}
                                </h2>
                                <p className="text-[18px] text-[#475569] leading-relaxed mb-8">
                                    {t("Όταν είστε έτοιμοι για ανανέωση, στείλτε ένα τυποποιημένο αρχείο (ACORD) στους συνεργάτες μας για άμεσες και ανταγωνιστικές προσφορές.", "When you're ready to renew, share a standardized ACORD data file with our partners to receive immediate, competitive quotes.")}
                                </p>
                                <Link href="mailto:hello@policywallet.com" className="inline-flex items-center gap-2 font-medium hover:text-[#475569] transition-colors text-[16px]">
                                    {t("Επικοινωνία", "Contact us")} <ArrowRight className="w-4 h-4" />
                                </Link>
                            </div>
                            <div className="flex-1 w-full relative h-[300px] bg-[#1E293B] rounded-xl border border-white/10 overflow-hidden shadow-2xl">
                                <div className="absolute inset-x-0 bottom-0 top-1/2 bg-gradient-to-t from-black/50 to-transparent"></div>
                                {/* Decorative elements to represent the interface */}
                                <div className="absolute top-6 left-6 right-6">
                                    <div className="h-6 w-32 bg-white/10 rounded mb-4"></div>
                                    <div className="flex flex-col gap-3">
                                        <div className="h-16 w-full bg-white/5 rounded-lg border border-white/5"></div>
                                        <div className="h-16 w-full bg-white/5 rounded-lg border border-white/5"></div>
                                        <div className="h-16 w-3/4 bg-white/5 rounded-lg border border-white/5"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* FOOTER */}
            <footer className="bg-white py-16 px-6 lg:px-12 border-t border-[#F0F0F0]">
                <div className="mx-auto grid max-w-[1400px] gap-12 lg:grid-cols-[2fr_1fr_1fr_1fr]">
                    <div>
                        <Link href="/" className="inline-flex items-center text-[20px] font-bold tracking-tight mb-4">
                            <span className="text-[#0F172A]">Policy</span><span className="text-[#64748B]">Wallet</span>
                        </Link>
                    </div>
                    <div>
                        <p className="text-[13px] font-semibold text-[#0F172A] mb-4">{t("Προϊόντα", "Products")}</p>
                        <ul className="space-y-3 text-[14px] text-[#475569]">
                            <li><Link href="/product" className="hover:text-[#0F172A] transition-colors">{t("Διαχείριση", "Storage")}</Link></li>
                            <li><Link href="/product" className="hover:text-[#0F172A] transition-colors">{t("AI Insights", "AI Insights")}</Link></li>
                            <li><Link href="/product" className="hover:text-[#0F172A] transition-colors">{t("Συνεργασία", "Network")}</Link></li>
                        </ul>
                    </div>
                    <div>
                        <p className="text-[13px] font-semibold text-[#0F172A] mb-4">{t("Εταιρεία", "Company")}</p>
                        <ul className="space-y-3 text-[14px] text-[#475569]">
                            <li><Link href="/about" className="hover:text-[#0F172A] transition-colors">{t("Σχετικά", "About")}</Link></li>
                            <li><Link href="/privacy" className="hover:text-[#0F172A] transition-colors">Privacy Policy</Link></li>
                            <li><Link href="/terms" className="hover:text-[#0F172A] transition-colors">Terms of Service</Link></li>
                        </ul>
                    </div>
                    <div>
                        <p className="text-[13px] font-semibold text-[#0F172A] mb-4">{t("Λογαριασμός", "Account")}</p>
                        <ul className="space-y-3 text-[14px] text-[#475569]">
                            <li><Link href="/auth/signin" className="hover:text-[#0F172A] transition-colors">Log in</Link></li>
                            <li><Link href="/auth/signup" className="hover:text-[#0F172A] transition-colors">Get started</Link></li>
                        </ul>
                    </div>
                </div>
            </footer>
        </div>
    )
}
