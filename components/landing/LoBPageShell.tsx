"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { Inter } from "next/font/google"
import { Menu, X } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { ThemeToggle } from "@/components/ThemeToggle"
import { SolutionsDropdown, SolutionsMobileGroup } from "@/components/landing/SolutionsDropdown"
import { PublicMegaFooter } from "@/components/landing/PublicMegaFooter"

const inter = Inter({ subsets: ["latin", "greek"], weight: ["400", "500", "600", "700"] })

interface LoBPageShellProps {
    children: React.ReactNode
    activeNav?: "product" | "company" | "pricing" | "none"
}

export function LoBPageShell({ children, activeNav = "none" }: LoBPageShellProps) {
    const { language, setLanguage } = useLanguage()
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [scrolled, setScrolled] = useState(false)
    const isGreek = language === "el"
    const t = (el: string, en: string) => (isGreek ? el : en)

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 24)
        window.addEventListener("scroll", handleScroll, { passive: true })
        return () => window.removeEventListener("scroll", handleScroll)
    }, [])

    useEffect(() => {
        document.body.style.overflow = isMobileMenuOpen ? "hidden" : "unset"
        return () => {
            document.body.style.overflow = "unset"
        }
    }, [isMobileMenuOpen])

    const navLinkClass = (key: "product" | "company" | "pricing") =>
        activeNav === key
            ? "text-[#0F172A] font-semibold"
            : "text-[#475569] hover:text-[#0F172A]"

    return (
        <div className={`${inter.className} min-h-screen bg-white text-[#0F172A] selection:bg-[#206756]/20 selection:text-[#0F172A] dark:bg-slate-950 dark:text-white`}>
            <header className="fixed left-4 right-4 top-4 z-50">
                <div
                    className={`mx-auto flex h-14 max-w-[1400px] items-center justify-between rounded-full px-6 transition-all duration-300 ${
                        scrolled ? "border border-gray-200/60 bg-white/90 shadow-sm backdrop-blur-xl" : "border border-gray-200/50 bg-white/80 shadow-sm backdrop-blur-xl"
                    }`}
                >
                    <Link href="/" className="inline-flex items-center text-[20px] font-bold tracking-tight">
                        <span className="text-[#0F172A]">Policy</span>
                        <span className="text-[#64748B]">Wallet</span>
                    </Link>

                    <nav className="hidden items-center gap-8 text-[14px] font-medium md:flex">
                        <Link href="/product" className={`transition-colors duration-150 ${navLinkClass("product")}`}>
                            {t("Προϊόντα", "Products")}
                        </Link>
                        <SolutionsDropdown language={language} className="text-[#475569]" />
                        <Link href="/company" className={`transition-colors duration-150 ${navLinkClass("company")}`}>
                            {t("Εταιρεία", "Company")}
                        </Link>
                        <Link href="/pricing" className={`transition-colors duration-150 ${navLinkClass("pricing")}`}>
                            {t("Τιμολόγηση", "Pricing")}
                        </Link>
                    </nav>

                    <div className="hidden items-center gap-5 md:flex">
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => setLanguage("el")}
                                className={`cursor-pointer text-xs font-semibold transition-colors duration-150 ${language === "el" ? "text-[#0F172A]" : "text-[#64748B] hover:text-[#0F172A]"}`} // i18n-hardcoded-ignore: CSS classes, not copy
                            >
                                EL
                            </button>
                            <span className="select-none text-[#E2E8F0]">|</span>
                            <button
                                onClick={() => setLanguage("en")}
                                className={`cursor-pointer text-xs font-semibold transition-colors duration-150 ${language === "en" ? "text-[#0F172A]" : "text-[#64748B] hover:text-[#0F172A]"}`}
                            >
                                EN
                            </button>
                        </div>
                        <ThemeToggle />
                        <Link href="/auth/signin" className="text-[14px] font-medium text-[#0F172A] transition-colors duration-150 hover:text-[#206756]">
                            {t("Σύνδεση", "Log in")}
                        </Link>
                        <Link
                            href="/auth/signup?role=policyholder"
                            className="rounded-full bg-[#29685B] px-5 py-2 text-[14px] font-bold text-white transition-colors duration-150 hover:bg-[#1C4E44]"
                        >
                            {t("Ξεκινήστε", "Get started")}
                        </Link>
                    </div>

                    <button
                        className="cursor-pointer rounded-full p-2 -mr-2 text-[#0F172A] transition-colors duration-150 hover:bg-gray-100 md:hidden"
                        onClick={() => setIsMobileMenuOpen(true)}
                        aria-label={t("Άνοιγμα μενού", "Open menu")}
                    >
                        <Menu className="h-5 w-5" />
                    </button>
                </div>
            </header>

            <div
                className={`fixed inset-0 z-[100] flex flex-col bg-[#29685B] text-white transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${isMobileMenuOpen ? "translate-y-0" : "-translate-y-full"}`}
            >
                <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center justify-between px-6 pt-4">
                    <Link href="/" className="inline-flex items-center text-[20px] font-bold tracking-tight" onClick={() => setIsMobileMenuOpen(false)}>
                        <span className="text-white">Policy</span>
                        <span className="text-white/80">Wallet</span>
                    </Link>
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        <button
                            className="cursor-pointer rounded-full p-2 -mr-2 text-white transition-colors duration-150 hover:bg-white/10"
                            onClick={() => setIsMobileMenuOpen(false)}
                            aria-label={t("Κλείσιμο μενού", "Close menu")}
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>
                </div>

                <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col justify-center px-8 pb-24 sm:px-12">
                    <nav className="mb-12 flex flex-col gap-6 text-[44px] font-medium leading-tight tracking-tight sm:text-[56px]">
                        <Link href="/product" className="text-white transition-colors duration-150 hover:text-white/80" onClick={() => setIsMobileMenuOpen(false)}>
                            {t("Προϊόντα", "Products")}
                        </Link>
                        <SolutionsMobileGroup language={language} onNavigate={() => setIsMobileMenuOpen(false)} className="text-[20px] sm:text-[22px]" />
                        <Link href="/company" className="text-white transition-colors duration-150 hover:text-white/80" onClick={() => setIsMobileMenuOpen(false)}>
                            {t("Εταιρεία", "Company")}
                        </Link>
                        <Link href="/pricing" className="text-white transition-colors duration-150 hover:text-white/80" onClick={() => setIsMobileMenuOpen(false)}>
                            {t("Τιμολόγηση", "Pricing")}
                        </Link>

                        <div className="mt-2 flex items-center gap-4 text-[18px] font-bold">
                            <button
                                onClick={() => {
                                    setLanguage("el")
                                    setIsMobileMenuOpen(false)
                                }}
                                className={`cursor-pointer transition-colors duration-150 ${language === "el" ? "text-white" : "text-white/50"}`} // i18n-hardcoded-ignore: CSS classes, not copy
                            >
                                EL
                            </button>
                            <span className="select-none text-white/20">|</span>
                            <button
                                onClick={() => {
                                    setLanguage("en")
                                    setIsMobileMenuOpen(false)
                                }}
                                className={`cursor-pointer transition-colors duration-150 ${language === "en" ? "text-white" : "text-white/50"}`}
                            >
                                EN
                            </button>
                        </div>
                    </nav>

                    <div className="mt-auto flex flex-col gap-4">
                        <Link
                            href="/auth/signin"
                            className="w-full rounded-2xl border border-transparent bg-[#1C4E44] px-6 py-4 text-center text-[18px] font-bold text-white transition-colors duration-150 hover:bg-[#143B33]"
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

            <main className="pt-32 lg:pt-40">{children}</main>

            <PublicMegaFooter locale={language} />
        </div>
    )
}
