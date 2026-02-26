"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { Inter } from "next/font/google"
import { Menu, X, ArrowRight } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"

const inter = Inter({ subsets: ["latin", "greek"], weight: ["400", "500", "600", "700"] })

interface LoBPageShellProps {
    children: React.ReactNode
    activeNav?: "product" | "company" | "pricing"
}

export function LoBPageShell({ children, activeNav = "product" }: LoBPageShellProps) {
    const { language, setLanguage } = useLanguage()
    const isGreek = language === "el"
    const t = (el: string, en: string) => (isGreek ? el : en)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [scrolled, setScrolled] = useState(false)

    // Scroll-aware transparent → frosted header
    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 24)
        window.addEventListener("scroll", handleScroll, { passive: true })
        return () => window.removeEventListener("scroll", handleScroll)
    }, [])

    // Lock body scroll when mobile menu is open
    useEffect(() => {
        document.body.style.overflow = isMobileMenuOpen ? "hidden" : "unset"
        return () => { document.body.style.overflow = "unset" }
    }, [isMobileMenuOpen])

    const navLink = (href: string, label: string) => {
        const isActive = activeNav === href.replace("/", "")
        return (
            <Link
                href={href}
                className={`transition-colors duration-150 ${isActive
                    ? "text-[#0F172A] font-semibold"
                    : "text-[#475569] hover:text-[#0F172A]"
                    }`}
            >
                {label}
            </Link>
        )
    }

    return (
        <div className={`${inter.className} min-h-screen bg-white text-[#0F172A] selection:bg-[#206756]/20 selection:text-[#0F172A]`}>

            {/* ─── HEADER ─── */}
            <header className="fixed top-4 left-4 right-4 z-50">
                <div
                    className={`mx-auto flex h-14 max-w-[1400px] items-center justify-between rounded-full px-6 transition-all duration-300 ${scrolled
                        ? "bg-white/90 backdrop-blur-xl border border-gray-200/60 shadow-sm"
                        : "bg-white/80 backdrop-blur-xl border border-gray-200/50 shadow-sm"
                        }`}
                >
                    {/* Logo */}
                    <Link href="/" className="inline-flex items-center text-[20px] font-bold tracking-tight">
                        <span className="text-[#0F172A]">Policy</span>
                        <span className="text-[#64748B]">Wallet</span>
                    </Link>

                    {/* Desktop Nav */}
                    <nav className="hidden items-center gap-8 font-medium md:flex text-[14px]">
                        {navLink("/product", t("Προϊόντα", "Products"))}
                        {navLink("/company", t("Εταιρεία", "Company"))}
                        {navLink("/pricing", t("Τιμολόγηση", "Pricing"))}
                    </nav>

                    {/* Desktop Actions */}
                    <div className="hidden md:flex items-center gap-5">
                        {/* Language toggle */}
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => setLanguage("el")}
                                className={`cursor-pointer text-xs font-semibold transition-colors duration-150 ${language === "el" ? "text-[#0F172A]" : "text-[#64748B] hover:text-[#0F172A]"}`}
                            >
                                EL
                            </button>
                            <span className="text-[#E2E8F0] select-none">|</span>
                            <button
                                onClick={() => setLanguage("en")}
                                className={`cursor-pointer text-xs font-semibold transition-colors duration-150 ${language === "en" ? "text-[#0F172A]" : "text-[#64748B] hover:text-[#0F172A]"}`}
                            >
                                EN
                            </button>
                        </div>

                        <Link
                            href="/auth/signin"
                            className="font-medium text-[#0F172A] hover:text-[#206756] transition-colors duration-150 text-[14px]"
                        >
                            {t("Σύνδεση", "Log in")}
                        </Link>
                        <Link
                            href="/auth/signup?role=policyholder"
                            className="rounded-full bg-[#29685B] px-5 py-2 text-[14px] font-bold text-white transition-colors duration-150 hover:bg-[#1C4E44]"
                        >
                            {t("Ξεκινήστε", "Get started")}
                        </Link>
                    </div>

                    {/* Hamburger */}
                    <button
                        className="md:hidden cursor-pointer p-2 -mr-2 text-[#0F172A] hover:bg-gray-100 rounded-full transition-colors duration-150"
                        onClick={() => setIsMobileMenuOpen(true)}
                        aria-label="Open menu"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {/* ─── FULL-SCREEN MOBILE MENU ─── */}
            <div
                className={`fixed inset-0 z-[100] bg-[#29685B] text-white flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${isMobileMenuOpen ? "translate-y-0" : "-translate-y-full"}`}
            >
                <div className="flex h-16 items-center justify-between px-6 pt-4 max-w-[1400px] w-full mx-auto">
                    <Link
                        href="/"
                        className="inline-flex items-center text-[20px] font-bold tracking-tight"
                        onClick={() => setIsMobileMenuOpen(false)}
                    >
                        <span className="text-white">Policy</span>
                        <span className="text-white/80">Wallet</span>
                    </Link>
                    <button
                        className="cursor-pointer p-2 -mr-2 text-white hover:bg-white/10 rounded-full transition-colors duration-150"
                        onClick={() => setIsMobileMenuOpen(false)}
                        aria-label="Close menu"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex flex-1 flex-col justify-center px-8 sm:px-12 pb-24 max-w-[1400px] w-full mx-auto">
                    <nav className="flex flex-col gap-6 text-[44px] sm:text-[56px] font-medium tracking-tight mb-12 leading-tight">
                        <Link href="/product" className="text-white hover:text-white/80 transition-colors duration-150" onClick={() => setIsMobileMenuOpen(false)}>
                            {t("Προϊόντα", "Products")}
                        </Link>
                        <Link href="/company" className="text-white hover:text-white/80 transition-colors duration-150" onClick={() => setIsMobileMenuOpen(false)}>
                            {t("Εταιρεία", "Company")}
                        </Link>
                        <Link href="/pricing" className="text-white hover:text-white/80 transition-colors duration-150" onClick={() => setIsMobileMenuOpen(false)}>
                            {t("Τιμολόγηση", "Pricing")}
                        </Link>

                        {/* Language toggle in mobile menu */}
                        <div className="flex items-center gap-4 mt-2 text-[18px] font-bold">
                            <button
                                onClick={() => { setLanguage("el"); setIsMobileMenuOpen(false) }}
                                className={`cursor-pointer transition-colors duration-150 ${language === "el" ? "text-white" : "text-white/50"}`}
                            >
                                EL
                            </button>
                            <span className="text-white/20 select-none">|</span>
                            <button
                                onClick={() => { setLanguage("en"); setIsMobileMenuOpen(false) }}
                                className={`cursor-pointer transition-colors duration-150 ${language === "en" ? "text-white" : "text-white/50"}`}
                            >
                                EN
                            </button>
                        </div>
                    </nav>

                    {/* Mobile auth CTAs */}
                    <div className="flex flex-col gap-4 mt-auto">
                        <Link
                            href="/auth/signin"
                            className="w-full rounded-2xl bg-[#1C4E44] border border-transparent px-6 py-4 text-center text-[18px] font-bold text-white transition-colors duration-150 hover:bg-[#143B33]"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            {t("Σύνδεση", "Log in")}
                        </Link>
                        <Link
                            href="/auth/signup?role=policyholder"
                            className="w-full rounded-2xl bg-[#337D6F] px-6 py-4 text-center text-[18px] font-bold text-white transition-colors duration-150 hover:bg-[#2C6E61]"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            {t("Ξεκινήστε δωρεάν", "Get started free")}
                        </Link>
                    </div>
                </div>
            </div>

            {/* ─── PAGE CONTENT ─── */}
            <main className="pt-32 lg:pt-40">
                {children}
            </main>

            {/* ─── FOOTER ─── */}
            <footer className="bg-white py-16 px-6 lg:px-12 border-t border-[#F0F0F0]">
                <div className="mx-auto grid max-w-[1400px] gap-12 lg:grid-cols-[2fr_1fr_1fr_1fr]">
                    <div>
                        <Link href="/" className="inline-flex items-center text-[20px] font-bold tracking-tight mb-4">
                            <span className="text-[#1A1A1A]">Policy</span>
                            <span className="text-[#64748B]">Wallet</span>
                        </Link>
                        <p className="text-[14px] text-[#707070] max-w-[280px] leading-relaxed mt-2">
                            {t("Το έξυπνο πορτοφόλι ασφάλισής σας.", "Your smart insurance wallet.")}
                        </p>
                    </div>

                    <div>
                        <p className="text-[13px] font-semibold text-[#1A1A1A] mb-4">{t("Προϊόντα", "Products")}</p>
                        <ul className="space-y-3 text-[14px] text-[#707070]">
                            <li><Link href="/product/motor" className="hover:text-[#1A1A1A] transition-colors duration-150">{t("Αυτοκίνητο", "Motor")}</Link></li>
                            <li><Link href="/product/property" className="hover:text-[#1A1A1A] transition-colors duration-150">{t("Ακίνητο", "Property")}</Link></li>
                            <li><Link href="/product/health" className="hover:text-[#1A1A1A] transition-colors duration-150">{t("Υγεία", "Health")}</Link></li>
                            <li><Link href="/product/cyber" className="hover:text-[#1A1A1A] transition-colors duration-150">{t("Κυβερνοασφάλεια", "Cyber")}</Link></li>
                            <li><Link href="/product/group-health" className="hover:text-[#1A1A1A] transition-colors duration-150">{t("Ομαδική Υγεία", "Group Health")}</Link></li>
                            <li><Link href="/product/group-pension" className="hover:text-[#1A1A1A] transition-colors duration-150">{t("Ομαδική Σύνταξη", "Group Pension")}</Link></li>
                        </ul>
                    </div>

                    <div>
                        <p className="text-[13px] font-semibold text-[#1A1A1A] mb-4">{t("Εταιρεία", "Company")}</p>
                        <ul className="space-y-3 text-[14px] text-[#707070]">
                            <li><Link href="/company" className="hover:text-[#1A1A1A] transition-colors duration-150">{t("Σχετικά", "About")}</Link></li>
                            <li><Link href="/pricing" className="hover:text-[#1A1A1A] transition-colors duration-150">{t("Τιμολόγηση", "Pricing")}</Link></li>
                            <li><Link href="/privacy" className="hover:text-[#1A1A1A] transition-colors duration-150">Privacy Policy</Link></li>
                            <li><Link href="/terms" className="hover:text-[#1A1A1A] transition-colors duration-150">Terms of Service</Link></li>
                        </ul>
                    </div>

                    <div>
                        <p className="text-[13px] font-semibold text-[#1A1A1A] mb-4">{t("Λογαριασμός", "Account")}</p>
                        <ul className="space-y-3 text-[14px] text-[#707070]">
                            <li><Link href="/auth/signin" className="hover:text-[#1A1A1A] transition-colors duration-150">{t("Σύνδεση", "Log in")}</Link></li>
                            <li><Link href="/auth/signup" className="hover:text-[#1A1A1A] transition-colors duration-150">{t("Εγγραφή", "Get started")}</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="mx-auto max-w-[1400px] mt-12 pt-8 border-t border-[#F0F0F0] flex flex-col sm:flex-row items-center justify-between gap-4 text-[13px] text-[#A0A0A0]">
                    <p>© {new Date().getFullYear()} PolicyWallet. {t("Με επιφύλαξη παντός δικαιώματος.", "All rights reserved.")}</p>
                    <div className="flex items-center gap-6">
                        <Link href="/privacy" className="hover:text-[#475569] transition-colors duration-150">Privacy</Link>
                        <Link href="/terms" className="hover:text-[#475569] transition-colors duration-150">Terms</Link>
                    </div>
                </div>
            </footer>
        </div>
    )
}
