"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Car, Home, Heart, AlertTriangle, Clock, Shield } from "lucide-react"
import { PRODUCT_DISPLAY_HOST } from "@/lib/seo/site"

interface PolicyWalletWidgetProps {
    isGreek: boolean
}

export function PolicyWalletWidget({ isGreek }: PolicyWalletWidgetProps) {
    const [loaded, setLoaded] = useState(false)
    const t = (el: string, en: string) => (isGreek ? el : en)

    useEffect(() => {
        const timer = setTimeout(() => setLoaded(true), 350)
        return () => clearTimeout(timer)
    }, [])

    const policies = [
        {
            Icon: Car,
            name: t("Αυτοκίνητο", "Motor"),
            insurer: "Interamerican",
            status: t("Ενεργό", "Active"),
            type: "active" as const,
            coverage: 92,
        },
        {
            Icon: Home,
            name: t("Κατοικία", "Home"),
            insurer: t("Εθνική", "Ethniki"),
            status: t("Λήγει σε 14 μέρες", "Expires in 14 days"),
            type: "expiring" as const,
            coverage: 71,
        },
        {
            Icon: Heart,
            name: t("Υγεία", "Health"),
            insurer: "Eurolife",
            status: t("Ενεργό", "Active"),
            type: "active" as const,
            coverage: 98,
        },
    ]

    return (
        <div className="relative mx-auto w-full max-w-[480px] px-5 pb-8 pt-5 lg:ml-auto lg:mr-0">
            {/* Main card */}
            <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-[0_24px_64px_rgba(0,0,0,0.09),0_0_0_1px_rgba(15,23,42,0.04)]">
                {/* Browser bar */}
                <div className="flex items-center gap-2 border-b border-[#E2E8F0] dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-900 px-4 py-3">
                    <div className="flex gap-1.5">
                        <span className="h-3 w-3 rounded-full bg-[#FF5F57]" />
                        <span className="h-3 w-3 rounded-full bg-[#FFBD2E]" />
                        <span className="h-3 w-3 rounded-full bg-[#28CA41]" />
                    </div>
                    <div className="ml-3 flex-1 rounded-md border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1 font-mono text-micro text-[#5B6A7A] dark:text-slate-400">
                        {`${PRODUCT_DISPLAY_HOST}/wallet`}
                    </div>
                </div>

                <div className="p-5">
                    {/* Portfolio header */}
                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <p className="text-body-sm font-semibold text-[#0F172A] dark:text-white">
                                {t("Χαρτοφυλάκιο", "My Portfolio")}
                            </p>
                            <p className="text-micro text-[#5B6A7A] dark:text-slate-400">
                                {t("3 ενεργά συμβόλαια", "3 active policies")}
                            </p>
                        </div>
                        <div className="flex items-center gap-1.5 rounded-full border border-[#A7F3D0] dark:border-[#29685B]/50 bg-[#ECFDF5] dark:bg-[#29685B]/15 px-2.5 py-1">
                            <Shield className="h-3 w-3 text-[#29685B] dark:text-[#A7F3D0]" />
                            <span className="text-micro font-semibold text-[#29685B] dark:text-[#A7F3D0]">
                                87% {t("κάλυψη", "covered")}
                            </span>
                        </div>
                    </div>

                    {/* Policy tiles */}
                    <div className="space-y-2">
                        {policies.map((p, i) => (
                            <div
                                key={i}
                                className={`flex items-center gap-3 rounded-xl border p-3 transition-all duration-500 ${
                                    p.type === "expiring" ? "border-[#FDE68A] dark:border-amber-500/40" : "border-[#E2E8F0]"
                                } ${loaded ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"}`}
                                style={{ transitionDelay: `${i * 100 + 400}ms` }}
                            >
                                <div
                                    className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${
                                        p.type === "expiring" ? "bg-[#FEF3C7]" : "bg-[#F0FDF4] dark:bg-[#29685B]/15"
                                    }`}
                                >
                                    <p.Icon
                                        className={`h-5 w-5 ${
                                            p.type === "expiring" ? "text-[#92400E]" : "text-[#29685B] dark:text-[#A7F3D0]"
                                        }`}
                                    />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="mb-0.5 flex items-center justify-between gap-2">
                                        <span className="truncate text-body-sm font-semibold text-[#0F172A] dark:text-white">
                                            {p.name}
                                        </span>
                                        <span
                                            className={`flex-shrink-0 rounded-full px-2 py-0.5 text-kicker font-semibold ${
                                                p.type === "expiring"
                                                    ? "bg-[#FEF3C7] dark:bg-amber-500/15 text-[#92400E] dark:text-amber-200"
                                                    : "bg-[#F0FDF4] dark:bg-[#29685B]/15 text-[#166534] dark:text-[#A7F3D0]"
                                            }`}
                                        >
                                            {p.status}
                                        </span>
                                    </div>
                                    <p className="mb-1.5 text-micro text-[#5B6A7A] dark:text-slate-400">{p.insurer}</p>
                                    <div className="flex items-center gap-2">
                                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#F1F5F9] dark:bg-slate-800">
                                            <div
                                                className={`h-full rounded-full transition-all duration-1000 ease-out ${
                                                    p.type === "expiring" ? "bg-[#F59E0B]" : "bg-[#29685B]"
                                                }`}
                                                style={{
                                                    width: loaded ? `${p.coverage}%` : "0%",
                                                    transitionDelay: `${i * 100 + 700}ms`,
                                                }}
                                            />
                                        </div>
                                        <span className="text-kicker font-medium text-[#5B6A7A] dark:text-slate-400">
                                            {p.coverage}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Gap alert */}
                    <div
                        className={`mt-3 flex items-start gap-2.5 rounded-xl border border-[#FDE68A] dark:border-amber-500/40 bg-[#FFFBEB] dark:bg-amber-500/10 p-3 transition-all duration-500 ${
                            loaded ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
                        }`}
                        style={{ transitionDelay: "900ms" }}
                    >
                        <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 animate-pulse text-[#92400E] dark:text-amber-200" />
                        <div className="flex-1 min-w-0">
                            <p className="text-caption font-semibold text-[#92400E] dark:text-amber-200">
                                {t("Κενό κάλυψης εντοπίστηκε", "Coverage gap detected")}
                            </p>
                            <p className="text-micro text-[#92400E] dark:text-amber-200">
                                {t(
                                    "Κατοικία — λείπει κάλυψη πλημμύρας",
                                    "Home — missing flood coverage"
                                )}
                            </p>
                        </div>
                        <Link
                            href="/auth/signup?role=policyholder&source=widget_gap_fix"
                            aria-label={t("Διόρθωση κενού κάλυψης κατοικίας", "Fix home coverage gap")}
                            className="flex-shrink-0 rounded-full bg-[#ECFDF5] dark:bg-[#29685B]/15 px-2.5 py-1 text-micro font-semibold text-[#29685B] dark:text-[#A7F3D0] hover:bg-[#D1FAE5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        >
                            {t("Διόρθωση →", "Fix →")}
                        </Link>
                    </div>
                </div>
            </div>

            {/* Floating: AI analysis badge (top-right, in padding zone) */}
            <div
                className={`absolute right-0 top-0 flex items-center gap-2 rounded-full border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 shadow-md transition-all duration-500 ${
                    loaded ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
                }`}
                style={{ transitionDelay: "1100ms" }}
            >
                <span className="h-2 w-2 animate-pulse rounded-full bg-[#29685B]" />
                <span className="text-micro font-semibold text-[#0F172A] dark:text-white">AI</span>
                <span className="text-micro text-[#5B6A7A] dark:text-slate-400">
                    {t("Ανάλυση σε 28s", "Analyzed in 28s")}
                </span>
            </div>

            {/* Floating: renewal warning (bottom-left, in padding zone) */}
            <div
                className={`absolute bottom-0 left-0 flex items-center gap-1.5 rounded-full border border-[#FDE68A] dark:border-amber-500/40 bg-white dark:bg-slate-900 px-3 py-1.5 shadow-md transition-all duration-500 ${
                    loaded ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
                }`}
                style={{ transitionDelay: "1300ms" }}
            >
                <Clock className="h-3.5 w-3.5 text-[#92400E] dark:text-amber-200" />
                <span className="text-micro font-semibold text-[#92400E] dark:text-amber-200">
                    {t("Λήγει σε 14 μέρες", "Expires in 14 days")}
                </span>
            </div>
        </div>
    )
}
