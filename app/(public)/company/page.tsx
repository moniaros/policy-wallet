"use client"

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Inter } from 'next/font/google'
import { Menu, X, ArrowRight, Shield, Globe, Users } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

const inter = Inter({ subsets: ['latin', 'greek'] })

export default function CompanyPage() {
    const { language, setLanguage } = useLanguage()
    const isGreek = language === 'el'
    const t = (el: string, en: string) => (isGreek ? el : en)

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [scrolled, setScrolled] = useState(false)

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20)
        }
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    return (
        <div className={`${inter.className} min-h-screen bg-white text-[#0F172A] selection:bg-[#64748B]/20 selection:text-[#0F172A]`}>
            {/* HEADER - Floating Pill */}
            <header className="fixed top-4 left-4 right-4 z-50">
                <div className={`mx-auto flex h-14 max-w-[1400px] items-center justify-between rounded-full px-6 transition-all duration-300 ${scrolled ? 'bg-white/90 backdrop-blur-xl border border-gray-200/50 shadow-sm' : 'bg-transparent border border-transparent'}`}>
                    {/* Logo */}
                    <Link href="/" className="inline-flex items-center text-[20px] font-bold tracking-tight">
                        <span className="text-[#0F172A]">Policy</span><span className="text-[#64748B]">Wallet</span>
                    </Link>

                    {/* Nav Links (Desktop) */}
                    <nav className="hidden items-center gap-8 font-medium text-[#475569] md:flex text-[14px]">
                        <Link href="/product" className="hover:text-[#0F172A] transition-colors">{t("Προϊόντα", "Products")}</Link>
                        <Link href="/pricing" className="hover:text-[#0F172A] transition-colors">{t("Τιμολόγηση", "Pricing")}</Link>
                        <Link href="/company" className="text-[#0F172A] transition-colors">{t("Εταιρεία", "Company")}</Link>
                    </nav>

                    {/* Actions (Desktop) */}
                    <div className="hidden md:flex items-center gap-5">
                        <div className="flex items-center gap-2">
                            <button onClick={() => setLanguage('el')} className={`text-xs font-semibold transition-colors ${language === 'el' ? 'text-[#0F172A]' : 'text-[#64748B] hover:text-[#0F172A]'}`}>EL</button>
                            <span className="text-[#E2E8F0]">|</span>
                            <button onClick={() => setLanguage('en')} className={`text-xs font-semibold transition-colors ${language === 'en' ? 'text-[#0F172A]' : 'text-[#64748B] hover:text-[#0F172A]'}`}>EN</button>
                        </div>
                        <Link
                            href="/auth/signin"
                            className="font-medium text-[#0F172A] hover:text-[#64748B] transition-colors text-[14px]"
                        >
                            {t("Σύνδεση", "Log in")}
                        </Link>
                        <Link
                            href="/auth/signup"
                            className="rounded-full bg-[#29685B] px-5 py-2 text-[14px] font-bold text-white transition-transform active:scale-95 hover:bg-[#1C4E44]"
                        >
                            {t("Ξεκινήστε", "Get started")}
                        </Link>
                    </div>

                    {/* Hamburger (Mobile) */}
                    <button
                        className="md:hidden p-2 -mr-2 text-[#0F172A]"
                        onClick={() => setIsMobileMenuOpen(true)}
                        aria-label="Open menu"
                    >
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
                    <button className="p-2 -mr-2 text-white hover:bg-white/10 rounded-full transition-colors" onClick={() => setIsMobileMenuOpen(false)} aria-label="Close menu">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex flex-1 flex-col justify-center px-8 sm:px-12 pb-24 max-w-[1400px] w-full mx-auto">
                    <nav className="flex flex-col gap-6 text-[44px] sm:text-[56px] font-medium tracking-tight mb-12 leading-tight">
                        <Link href="/product" className="text-white hover:text-white/80 transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
                            {t("Προϊόντα", "Products")}
                        </Link>
                        <Link href="/company" className="text-white hover:text-white/80 transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
                            {t("Εταιρεία", "Company")}
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
                <section className="px-6 lg:px-12 text-center mb-20 max-w-4xl mx-auto">
                    <h1 className="text-[48px] md:text-[72px] font-medium tracking-tight leading-[1.05] mb-6">
                        {t("Καινοτομώντας στην ψηφιακή ασφάλεια.", "Innovating digital trust.")}
                    </h1>
                    <p className="text-[18px] md:text-[22px] text-[#475569] leading-relaxed max-w-2xl mx-auto">
                        {t("Η PolicyWallet ιδρύθηκε με έναν σκοπό: Να κάνει τη διαχείριση της ασφάλισης και των προσωπικών δεδομένων απλή, διαφανή και προσβάσιμη για όλους.", "PolicyWallet was founded with a single purpose: To make managing insurance and personal data simple, transparent, and accessible for everyone.")}
                    </p>
                </section>

                {/* Values Grid */}
                <section className="px-6 lg:px-12 max-w-[1400px] mx-auto mb-24">
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="bg-[#D7E4ED] rounded-2xl p-10 border border-[#C1D5E0]">
                            <Shield className="w-8 h-8 text-[#0F172A] mb-6" />
                            <h3 className="text-[24px] font-medium tracking-tight mb-3">
                                {t("Προτεραιότητα στην Ασφάλεια", "Security First")}
                            </h3>
                            <p className="text-[16px] text-[#475569] leading-relaxed">
                                {t("Όλα τα δεδομένα σας είναι κρυπτογραφημένα και ακολουθούν τα υψηλότερα πρότυπα τραπεζικής ασφάλειας.", "All your data is encrypted and follows the highest banking-grade security standards.")}
                            </p>
                        </div>
                        <div className="bg-[#DCEBDA] rounded-2xl p-10 border border-[#C3D9C1]">
                            <Globe className="w-8 h-8 text-[#0F172A] mb-6" />
                            <h3 className="text-[24px] font-medium tracking-tight mb-3">
                                {t("Διαφάνεια Παντού", "Radical Transparency")}
                            </h3>
                            <p className="text-[16px] text-[#475569] leading-relaxed">
                                {t("Πιστεύουμε ότι πρέπει να έχετε τον πλήρη έλεγχο και εικόνα όλων των συμβολαίων σας.", "We believe you should have complete control and visibility over all your contracts.")}
                            </p>
                        </div>
                        <div className="bg-[#EBE5D9] rounded-2xl p-10 border border-[#D9D0C1]">
                            <Users className="w-8 h-8 text-[#0F172A] mb-6" />
                            <h3 className="text-[24px] font-medium tracking-tight mb-3">
                                {t("Πελατοκεντρική Προσέγγιση", "Customer Obsessed")}
                            </h3>
                            <p className="text-[16px] text-[#475569] leading-relaxed">
                                {t("Καθετί που δημιουργούμε δοκιμάζεται και βελτιώνεται με βάση την εμπειρία των πελατών μας.", "Everything we build is tested and improved based on our customer's experience.")}
                            </p>
                        </div>
                    </div>
                </section>

                {/* Join the team */}
                <section className="px-6 lg:px-12 max-w-[1400px] mx-auto text-center bg-[#1A1C1D] rounded-[32px] py-24 text-white overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-tr from-[#64748B]/20 to-transparent pointer-events-none" />
                    <div className="relative z-10 max-w-2xl mx-auto">
                        <h2 className="text-[36px] md:text-[48px] font-medium tracking-tight mb-6">
                            {t("Ελάτε στην ομάδα μας", "Join our mission")}
                        </h2>
                        <p className="text-[18px] text-[#94A3B8] mb-10 leading-relaxed">
                            {t("Αναζητούμε διαρκώς ταλέντα που θέλουν να αλλάξουν τον τρόπο που ο κόσμος κατανοεί την ασφάλιση.", "We're always looking for brilliant minds who want to change how the world understands insurance.")}
                        </p>
                        <Link href="mailto:careers@policywallet.com" className="inline-flex items-center justify-center rounded-2xl bg-white px-8 py-4 text-[16px] font-bold text-[#0F172A] transition-transform active:scale-[0.98] hover:bg-gray-100">
                            {t("Δείτε τις ανοιχτές θέσεις", "View open roles")}
                        </Link>
                    </div>
                </section>
            </main>

            {/* FOOTER */}
            <footer className="px-6 lg:px-12 py-12 border-t border-gray-200">
                <div className="mx-auto max-w-[1400px] flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                        <Link href="/" className="text-[20px] font-bold tracking-tight">
                            <span className="text-[#0F172A]">Policy</span><span className="text-[#64748B]">Wallet</span>
                        </Link>
                        <p className="text-[14px] text-[#475569] hidden md:block">
                            © {new Date().getFullYear()} PolicyWallet. {t("Όλα τα δικαιώματα διατηρούνται.", "All rights reserved.")}
                        </p>
                    </div>

                    <div className="flex items-center gap-6 text-[14px] font-medium text-[#475569]">
                        <Link href="/privacy" className="hover:text-[#0F172A] transition-colors">{t("Πολιτική Απορρήτου", "Privacy Policy")}</Link>
                        <Link href="/terms" className="hover:text-[#0F172A] transition-colors">{t("Όροι Χρήσης", "Terms of Service")}</Link>
                        <Link href="mailto:hello@policywallet.com" className="hover:text-[#0F172A] transition-colors">{t("Επικοινωνία", "Contact")}</Link>
                    </div>
                </div>
            </footer>
        </div>
    )
}
