"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Inter } from "next/font/google"
import { ArrowRight, Menu, X } from "lucide-react"
import { trackLandingEvent } from "@/lib/landing/analytics"
import type { LandingLocale } from "@/types/landing-content"
import { ThemeToggle } from "@/components/ThemeToggle"
import { SolutionsDropdown, SolutionsMobileGroup } from "@/components/landing/SolutionsDropdown"
import { PublicMegaFooter } from "@/components/landing/PublicMegaFooter"

const inter = Inter({ subsets: ["latin", "greek"], weight: ["400", "500", "600", "700"] })

interface WorldClassLandingProps {
    locale: LandingLocale
}

export function WorldClassLanding({ locale }: WorldClassLandingProps) {
    const isGreek = locale === "el"
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const t = (el: string, en: string) => (isGreek ? el : en)

    useEffect(() => {
        trackLandingEvent("page_view_landing", {
            locale,
            page_variant: "policywallet_landing_segment_selector_v1",
        })
    }, [locale])

    useEffect(() => {
        document.body.style.overflow = isMobileMenuOpen ? "hidden" : "unset"
        return () => {
            document.body.style.overflow = "unset"
        }
    }, [isMobileMenuOpen])

    const trackCta = (location: string) => {
        trackLandingEvent("cta_clicked_hero", {
            locale,
            cta: "start_free",
            location,
        })
    }

    return (
        <div className={`${inter.className} min-h-screen bg-white text-[#0F172A] selection:bg-[#206756]/20 selection:text-[#0F172A]`}>
            <header className="fixed left-4 right-4 top-4 z-50">
                <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between rounded-full border border-gray-200/50 bg-white/80 px-6 shadow-sm backdrop-blur-xl transition-all duration-300">
                    <Link href="/" className="inline-flex items-center text-[20px] font-bold tracking-tight">
                        <span className="text-[#0F172A]">Policy</span>
                        <span className="text-[#64748B]">Wallet</span>
                    </Link>

                    <nav className="hidden items-center gap-8 text-[14px] font-medium text-[#475569] md:flex">
                        <Link href="/product" className="transition-colors hover:text-[#0F172A]">
                            {t("Προϊόντα", "Products")}
                        </Link>
                        <SolutionsDropdown language={locale} />
                        <Link href="/company" className="transition-colors hover:text-[#0F172A]">
                            {t("Εταιρεία", "Company")}
                        </Link>
                        <Link href="/pricing" className="transition-colors hover:text-[#0F172A]">
                            {t("Τιμολόγηση", "Pricing")}
                        </Link>
                    </nav>

                    <div className="hidden items-center gap-5 md:flex">
                        <div className="flex items-center gap-2">
                            <Link href="/el" className={`text-xs font-semibold transition-colors ${locale === "el" ? "text-[#0F172A]" : "text-[#64748B] hover:text-[#0F172A]"}`}>EL</Link>
                            <span className="text-[#E2E8F0]">|</span>
                            <Link href="/en" className={`text-xs font-semibold transition-colors ${locale === "en" ? "text-[#0F172A]" : "text-[#64748B] hover:text-[#0F172A]"}`}>EN</Link>
                        </div>
                        <ThemeToggle />
                        <Link href="/auth/signin?source=landing_nav_login" className="text-[14px] font-medium text-[#0F172A] transition-colors hover:text-[#206756]">
                            {t("Σύνδεση", "Log in")}
                        </Link>
                        <Link
                            href="/auth/signup?role=policyholder&source=landing_nav"
                            onClick={() => trackCta("nav")}
                            className="rounded-full bg-[#29685B] px-5 py-2 text-[14px] font-bold text-white transition-colors hover:bg-[#1C4E44]"
                        >
                            {t("Ξεκινήστε", "Get started")}
                        </Link>
                    </div>

                    <button className="p-2 -mr-2 text-[#0F172A] md:hidden" onClick={() => setIsMobileMenuOpen(true)} aria-label="Open menu">
                        <Menu className="h-5 w-5" />
                    </button>
                </div>
            </header>

            <div className={`fixed inset-0 z-[100] flex flex-col bg-[#29685B] text-white transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${isMobileMenuOpen ? "translate-y-0" : "-translate-y-full"}`}>
                <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center justify-between px-6 pt-4">
                    <Link href="/" className="inline-flex items-center text-[20px] font-bold tracking-tight" onClick={() => setIsMobileMenuOpen(false)}>
                        <span className="text-white">Policy</span>
                        <span className="text-white/80">Wallet</span>
                    </Link>
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        <button className="rounded-full p-2 -mr-2 transition-colors hover:bg-white/10" onClick={() => setIsMobileMenuOpen(false)} aria-label="Close menu">
                            <X className="h-6 w-6" />
                        </button>
                    </div>
                </div>

                <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col justify-center px-8 pb-24 sm:px-12">
                    <nav className="mb-12 flex flex-col gap-6 text-[44px] font-medium leading-tight tracking-tight sm:text-[56px]">
                        <Link href="/product" className="text-white transition-colors hover:text-white/80" onClick={() => setIsMobileMenuOpen(false)}>
                            {t("Προϊόντα", "Products")}
                        </Link>
                        <SolutionsMobileGroup language={locale} onNavigate={() => setIsMobileMenuOpen(false)} className="text-[20px] sm:text-[22px]" />
                        <Link href="/company" className="text-white transition-colors hover:text-white/80" onClick={() => setIsMobileMenuOpen(false)}>
                            {t("Εταιρεία", "Company")}
                        </Link>
                        <Link href="/pricing" className="text-white transition-colors hover:text-white/80" onClick={() => setIsMobileMenuOpen(false)}>
                            {t("Τιμολόγηση", "Pricing")}
                        </Link>
                    </nav>

                    <div className="mt-auto flex flex-col gap-4">
                        <Link href="/auth/signin?source=landing_nav_login" className="w-full rounded-2xl border border-transparent bg-[#1C4E44] px-6 py-4 text-center text-[18px] font-bold text-white transition-colors hover:bg-[#143B33]" onClick={() => setIsMobileMenuOpen(false)}>
                            {t("Σύνδεση", "Log in")}
                        </Link>
                        <Link href="/auth/signup?role=policyholder&source=landing_nav" className="w-full rounded-2xl bg-[#337D6F] px-6 py-4 text-center text-[18px] font-bold text-white transition-colors hover:bg-[#2C6E61]" onClick={() => setIsMobileMenuOpen(false)}>
                            {t("Ξεκινήστε", "Get started")}
                        </Link>
                    </div>
                </div>
            </div>

            <main className="pt-32 lg:pt-40">
                <section className="px-6 lg:px-12">
                    <div className="mx-auto max-w-[920px] text-center">
                        <h1 className="mb-8 text-[46px] font-medium leading-[1.05] tracking-[-0.04em] text-[#0F172A] lg:text-[68px]">
                            {t("Όλα τα συμβόλαιά σου οργανωμένα, σε ένα Wallet.", "All your policies organized in one Wallet.")}
                        </h1>
                        <p className="mx-auto mb-10 max-w-[700px] text-[20px] leading-[1.5] text-[#475569] lg:text-[22px]">
                            {t(
                                "Συγκέντρωσε ασφαλιστήρια, κατανόησε καλύψεις και πάρε προτάσεις με AI για να κλείσεις κενά προστασίας.",
                                "Consolidate policies, understand coverage, and get AI recommendations to close protection gaps."
                            )}
                        </p>
                        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                            <Link
                                href="/auth/signup?role=policyholder&source=landing_hero"
                                onClick={() => trackCta("hero")}
                                className="w-full rounded-full bg-[#29685B] px-8 py-3.5 text-[16px] font-bold text-white transition-colors hover:bg-[#1C4E44] sm:w-auto"
                            >
                                {t("Ξεκινήστε τώρα", "Get started")}
                            </Link>
                            <Link href="/contact" className="w-full rounded-full border border-gray-200 bg-white px-8 py-3.5 text-[16px] font-bold text-[#0F172A] transition-colors hover:bg-gray-50 sm:w-auto">
                                {t("Επικοινωνία", "Contact us")}
                            </Link>
                        </div>
                    </div>
                </section>

                <section className="mb-20 mt-16 px-6 lg:mt-24 lg:px-12">
                    <div className="mx-auto aspect-[16/10] max-w-[1240px] overflow-hidden rounded-[10px] border border-[#E5E5E5] bg-white shadow-[0_30px_80px_rgba(0,0,0,0.12)] md:aspect-[16/9]">
                        <Image src="/screenshots/desktop-dashboard.png" alt="PolicyWallet dashboard" fill className="object-contain object-top bg-[#F8FAFC] p-2" priority />
                    </div>
                </section>

                <section className="bg-[#F8FAFC] px-6 py-20 lg:px-12">
                    <div className="mx-auto max-w-[1240px]">
                        <h2 className="mb-10 text-center text-[34px] font-medium tracking-[-0.03em] text-[#0F172A] lg:text-[44px]">
                            {t("Είστε ιδιώτης ή ασφαλιστής;", "Are you an individual or an insurance advisor?")}
                        </h2>

                        <div className="grid gap-6 md:grid-cols-2">
                            <Link
                                href="/product"
                                className="group relative overflow-hidden rounded-[14px] border border-[#D8E2EA] bg-white p-8 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
                            >
                                <div className="mb-5 inline-flex rounded-full bg-[#E6F0F6] px-3 py-1 text-xs font-semibold tracking-wider text-[#1E293B]">
                                    {t("Για Ιδιώτες", "For Individuals")}
                                </div>
                                <h3 className="mb-3 text-[30px] font-medium tracking-tight text-[#0F172A]">
                                    {t("Προστατέψτε την οικογένεια και την περιουσία σας.", "Protect your family and your assets.")}
                                </h3>
                                <p className="max-w-[520px] text-[17px] leading-relaxed text-[#475569]">
                                    {t(
                                        "Διαχειριστείτε ασφαλιστήρια, λάβετε υπενθυμίσεις και κατανοήστε ακριβώς τι καλύπτεται.",
                                        "Manage policies, get reminders, and clearly understand what is covered."
                                    )}
                                </p>
                                <div className="mt-6 inline-flex items-center gap-1.5 text-[15px] font-medium text-[#0F172A] group-hover:underline">
                                    {t("Μετάβαση", "Explore")} <ArrowRight className="h-4 w-4" />
                                </div>
                            </Link>

                            <Link
                                href="/solutions/agents"
                                className="group relative overflow-hidden rounded-[14px] border border-[#CFE3DA] bg-[#EAF6F1] p-8 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
                            >
                                <div className="mb-5 inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold tracking-wider text-[#1E293B]">
                                    {t("Για Ασφαλιστές", "For Insurance Agents")}
                                </div>
                                <h3 className="mb-3 text-[30px] font-medium tracking-tight text-[#0F172A]">
                                    {t("Αναπτύξτε το χαρτοφυλάκιό σας με AI.", "Scale your portfolio with AI workflows.")}
                                </h3>
                                <p className="max-w-[520px] text-[17px] leading-relaxed text-[#475569]">
                                    {t(
                                        "Διαχειριστείτε περισσότερους πελάτες, αυτοματοποιήστε renewals και στείλτε branded reports με ένα κλικ.",
                                        "Manage more clients, automate renewals, and send branded reports in one click."
                                    )}
                                </p>
                                <div className="mt-6 inline-flex items-center gap-1.5 text-[15px] font-medium text-[#0F172A] group-hover:underline">
                                    {t("Μετάβαση", "Explore")} <ArrowRight className="h-4 w-4" />
                                </div>
                            </Link>
                        </div>
                    </div>
                </section>
            </main>

            <PublicMegaFooter locale={locale} />
        </div>
    )
}
