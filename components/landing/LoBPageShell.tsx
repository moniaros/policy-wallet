"use client"

import React from "react"
import Link from "next/link"
import { Inter } from "next/font/google"
import { ArrowRight } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { localizeHref } from "@/lib/seo/locale-links"
import { PublicHeader } from "@/components/public/PublicHeader"
import { PublicMegaFooter } from "@/components/landing/PublicMegaFooter"
import { SKIP_LINK_TARGET_ID } from "@/lib/nav/public-nav"

const inter = Inter({ subsets: ["latin", "greek"], weight: ["400", "500", "600", "700"] })

interface LoBPageShellProps {
    children: React.ReactNode
    /**
     * Retained for call-site compatibility; active-state is now derived from
     * the pathname inside PublicHeader, so this is no longer read.
     */
    activeNav?: "product" | "company" | "pricing" | "none"
}

/**
 * Shared shell for public marketing pages: the canonical PublicHeader, a
 * `<main>` landmark (skip-link target), a pricing funnel band, and the shared
 * footer. The header/nav/mobile-menu now live in PublicHeader so every public
 * page renders identical chrome.
 */
export function LoBPageShell({ children }: LoBPageShellProps) {
    const { language } = useLanguage()
    const isGreek = language === "el"
    const t = (el: string, en: string) => (isGreek ? el : en)
    const l = (href: string) => localizeHref(href, language)

    return (
        <div className={`${inter.className} min-h-screen bg-white text-[#0F172A] selection:bg-[#29685B]/20 selection:text-[#0F172A] dark:bg-slate-950 dark:text-white`}>
            <PublicHeader locale={language} />

            <main id={SKIP_LINK_TARGET_ID} tabIndex={-1} className="pt-28 lg:pt-36">
                {children}

                {/* Pricing funnel — every LoB page routes to /pricing from the body, not only the nav */}
                <section className="border-t border-[#E2E8F0] bg-white px-6 py-16 text-center lg:px-12 dark:border-slate-800 dark:bg-slate-950">
                    <div className="mx-auto max-w-[760px]">
                        <p className="mb-3 text-[12px] font-semibold uppercase tracking-widest text-[#29685B]">
                            {t("Τιμολόγηση", "Pricing")}
                        </p>
                        <h2 className="mb-4 text-[32px] font-medium leading-[1.15] tracking-[-0.03em] text-[#0F172A] lg:text-[40px] dark:text-white">
                            {t("Δωρεάν για 1 συμβόλαιο. Αναβάθμιση όποτε τη χρειαστείτε.", "Free for 1 policy. Upgrade whenever you need it.")}
                        </h2>
                        <p className="mb-8 text-[16px] leading-relaxed text-[#475569] dark:text-slate-400">
                            {t(
                                "Starter 2,99€/μήνα για οργάνωση, Plus 7,99€/μήνα με πλήρη ανάλυση AI. Ακύρωση όποτε θέλετε.",
                                "Starter at €2.99/month for organization, Plus at €7.99/month with full AI analysis. Cancel anytime."
                            )}
                        </p>
                        <Link href={l("/pricing")} className="pw-secondary-button pw-btn-lg">
                            {t("Δείτε την τιμολόγηση", "See pricing")}
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                </section>
            </main>

            <PublicMegaFooter locale={language} />
        </div>
    )
}
