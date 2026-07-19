"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"
import { trackLandingEvent } from "@/lib/landing/analytics"
import { localizeHref } from "@/lib/seo/locale-links"
import type { LandingLocale } from "@/types/landing-content"
import { SolutionsDropdown, SolutionsMobileGroup } from "@/components/landing/SolutionsDropdown"

interface LandingHeaderProps {
    locale: LandingLocale
    /** The #perks nav link renders only when live partner offers exist. */
    showPerksLink?: boolean
}

/**
 * Client island for the landing page chrome: fixed nav + full-screen mobile
 * menu (open/close state, body scroll lock) and the landing analytics
 * (page_view on mount, nav CTA click). Everything below the header on the
 * landing page is server-rendered — see WorldClassLanding.
 */
export function LandingHeader({ locale, showPerksLink = false }: LandingHeaderProps) {
    const isGreek = locale === "el"
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const t = (el: string, en: string) => (isGreek ? el : en)
    // EN context navigates within the /en tree (unmirrored targets stay Greek).
    const l = (href: string) => localizeHref(href, locale)

    useEffect(() => {
        trackLandingEvent("page_view_landing", {
            locale,
            page_variant: "policywallet_landing_v2",
        })
    }, [locale])

    useEffect(() => {
        document.body.style.overflow = isMobileMenuOpen ? "hidden" : "unset"
        return () => {
            document.body.style.overflow = "unset"
        }
    }, [isMobileMenuOpen])

    return (
        <>
            {/* ── NAV ──────────────────────────────────────────────── */}
            <header className="fixed left-4 right-4 top-4 z-50">
                <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between rounded-full border border-gray-200/50 bg-white/80 px-6 shadow-sm backdrop-blur-xl transition-all duration-300">
                    <Link
                        href={l("/")}
                        className="inline-flex items-center text-[20px] font-bold tracking-tight"
                    >
                        <span className="text-[#0F172A]">Policy</span>
                        <span className="text-[#64748B]">Wallet</span>
                    </Link>

                    <nav className="hidden items-center gap-8 text-[14px] font-medium text-[#475569] md:flex">
                        <Link href={l("/product")} className="transition-colors hover:text-[#0F172A]">
                            {t("Προϊόντα", "Products")}
                        </Link>
                        <SolutionsDropdown language={locale} />
                        <Link href="#services" className="transition-colors hover:text-[#0F172A]">
                            {t("Υπηρεσίες", "Services")}
                        </Link>
                        {showPerksLink && (
                            <Link href="#perks" className="transition-colors hover:text-[#0F172A]">
                                {t("Παροχές", "Benefits")}
                            </Link>
                        )}
                        <Link href={l("/company")} className="transition-colors hover:text-[#0F172A]">
                            {t("Εταιρεία", "Company")}
                        </Link>
                        <Link href={l("/pricing")} className="transition-colors hover:text-[#0F172A]">
                            {t("Τιμολόγηση", "Pricing")}
                        </Link>
                    </nav>

                    <div className="hidden items-center gap-5 md:flex">
                        <div className="flex items-center gap-2">
                            <Link
                                href="/"
                                className={`text-xs font-semibold transition-colors ${
                                    locale === "el"
                                        ? "text-[#0F172A]"
                                        : "text-[#64748B] hover:text-[#0F172A]"
                                }`}
                            >
                                ΕΛ
                            </Link>
                            <span className="text-[#E2E8F0]">|</span>
                            <Link
                                href="/en"
                                className={`text-xs font-semibold transition-colors ${
                                    locale === "en"
                                        ? "text-[#0F172A]"
                                        : "text-[#64748B] hover:text-[#0F172A]"
                                }`}
                            >
                                EN
                            </Link>
                        </div>
                        <Link
                            href="/auth/signin?source=landing_nav_login"
                            className="text-[14px] font-medium text-[#0F172A] transition-colors hover:text-[#29685B]"
                        >
                            {t("Σύνδεση", "Log in")}
                        </Link>
                        <Link
                            href="/auth/signup?role=policyholder&source=landing_nav"
                            onClick={() =>
                                trackLandingEvent("cta_clicked_hero", {
                                    locale,
                                    cta: "start_free",
                                    location: "nav",
                                })
                            }
                            className="pw-primary-button pw-btn-sm"
                        >
                            {t("Ξεκινήστε", "Get started")}
                        </Link>
                    </div>

                    <button
                        type="button"
                        className="-mr-2 p-2 text-[#0F172A] md:hidden"
                        onClick={() => setIsMobileMenuOpen(true)}
                        aria-label={t("Άνοιγμα μενού", "Open menu")}
                    >
                        <Menu className="h-5 w-5" />
                    </button>
                </div>
            </header>

            {/* ── MOBILE MENU ──────────────────────────────────────── */}
            <div
                className={`fixed inset-0 z-[100] flex flex-col bg-[#29685B] text-white transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    isMobileMenuOpen ? "translate-y-0" : "-translate-y-full"
                }`}
            >
                <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center justify-between px-6 pt-4">
                    <Link
                        href={l("/")}
                        className="inline-flex items-center text-[20px] font-bold tracking-tight"
                        onClick={() => setIsMobileMenuOpen(false)}
                    >
                        <span className="text-white">Policy</span>
                        <span className="text-white/80">Wallet</span>
                    </Link>
                    <button
                        type="button"
                        className="-mr-2 rounded-full p-2 transition-colors hover:bg-white/10"
                        onClick={() => setIsMobileMenuOpen(false)}
                        aria-label={t("Κλείσιμο μενού", "Close menu")}
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col justify-center px-8 pb-24 sm:px-12">
                    <nav className="mb-12 flex flex-col gap-6 text-[44px] font-medium leading-tight tracking-tight sm:text-[56px]">
                        <Link
                            href={l("/product")}
                            className="text-white transition-colors hover:text-white/80"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            {t("Προϊόντα", "Products")}
                        </Link>
                        <SolutionsMobileGroup
                            language={locale}
                            onNavigate={() => setIsMobileMenuOpen(false)}
                            className="text-[20px]"
                        />
                        <Link
                            href={l("/company")}
                            className="text-white transition-colors hover:text-white/80"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            {t("Εταιρεία", "Company")}
                        </Link>
                        <Link
                            href={l("/pricing")}
                            className="text-white transition-colors hover:text-white/80"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            {t("Τιμολόγηση", "Pricing")}
                        </Link>
                    </nav>

                    <div className="mt-auto flex flex-col gap-4">
                        <Link
                            href="/auth/signin?source=landing_nav_login"
                            className="pw-secondary-button-inverse pw-btn-lg w-full"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            {t("Σύνδεση", "Log in")}
                        </Link>
                        <Link
                            href="/auth/signup?role=policyholder&source=landing_nav"
                            className="pw-primary-button-inverse pw-btn-lg w-full"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            {t("Ξεκινήστε", "Get started")}
                        </Link>
                    </div>
                </div>
            </div>
        </>
    )
}
