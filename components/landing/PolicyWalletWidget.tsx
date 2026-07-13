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
            <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_24px_64px_rgba(0,0,0,0.09),0_0_0_1px_rgba(15,23,42,0.04)]">
                {/* Browser bar */}
                <div className="flex items-center gap-2 border-b border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3">
                    <div className="flex gap-1.5">
                        <span className="h-3 w-3 rounded-full bg-[#FF5F57]" />
                        <span className="h-3 w-3 rounded-full bg-[#FFBD2E]" />
                        <span className="h-3 w-3 rounded-full bg-[#28CA41]" />
                    </div>
                    <div className="ml-3 flex-1 rounded-md border border-[#E2E8F0] bg-white px-3 py-1 font-mono text-[11px] text-[#94A3B8]">
                        {`${PRODUCT_DISPLAY_HOST}/wallet`}
                    </div>
                </div>

                <div className="p-5">
                    {/* Portfolio header */}
                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <p className="text-[13px] font-semibold text-[#0F172A]">
                                {t("Χαρτοφυλάκιο", "My Portfolio")}
                            </p>
                            <p className="text-[11px] text-[#64748B]">
                                {t("3 ενεργά συμβόλαια", "3 active policies")}
                            </p>
                        </div>
                        <div className="flex items-center gap-1.5 rounded-full border border-[#A7F3D0] bg-[#ECFDF5] px-2.5 py-1">
                            <Shield className="h-3 w-3 text-[#29685B]" />
                            <span className="text-[11px] font-semibold text-[#29685B]">
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
                                    p.type === "expiring" ? "border-[#FDE68A]" : "border-[#E2E8F0]"
                                } ${loaded ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"}`}
                                style={{ transitionDelay: `${i * 100 + 400}ms` }}
                            >
                                <div
                                    className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${
                                        p.type === "expiring" ? "bg-[#FEF3C7]" : "bg-[#F0FDF4]"
                                    }`}
                                >
                                    <p.Icon
                                        className={`h-5 w-5 ${
                                            p.type === "expiring" ? "text-[#D97706]" : "text-[#29685B]"
                                        }`}
                                    />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="mb-0.5 flex items-center justify-between gap-2">
                                        <span className="truncate text-[13px] font-semibold text-[#0F172A]">
                                            {p.name}
                                        </span>
                                        <span
                                            className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                                p.type === "expiring"
                                                    ? "bg-[#FEF3C7] text-[#B45309]"
                                                    : "bg-[#F0FDF4] text-[#166534]"
                                            }`}
                                        >
                                            {p.status}
                                        </span>
                                    </div>
                                    <p className="mb-1.5 text-[11px] text-[#94A3B8]">{p.insurer}</p>
                                    <div className="flex items-center gap-2">
                                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#F1F5F9]">
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
                                        <span className="text-[10px] font-medium text-[#94A3B8]">
                                            {p.coverage}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Gap alert */}
                    <div
                        className={`mt-3 flex items-start gap-2.5 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-3 transition-all duration-500 ${
                            loaded ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
                        }`}
                        style={{ transitionDelay: "900ms" }}
                    >
                        <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 animate-pulse text-[#D97706]" />
                        <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-semibold text-[#92400E]">
                                {t("Κενό κάλυψης εντοπίστηκε", "Coverage gap detected")}
                            </p>
                            <p className="text-[11px] text-[#B45309]">
                                {t(
                                    "Κατοικία — λείπει κάλυψη πλημμύρας",
                                    "Home — missing flood coverage"
                                )}
                            </p>
                        </div>
                        <Link
                            href="/auth/signup?role=policyholder&source=widget_gap_fix"
                            aria-label={t("Διόρθωση κενού κάλυψης κατοικίας", "Fix home coverage gap")}
                            className="flex-shrink-0 rounded-full bg-[#ECFDF5] px-2.5 py-1 text-[11px] font-semibold text-[#29685B] hover:bg-[#D1FAE5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#29685B]"
                        >
                            {t("Διόρθωση →", "Fix →")}
                        </Link>
                    </div>
                </div>
            </div>

            {/* Floating: AI analysis badge (top-right, in padding zone) */}
            <div
                className={`absolute right-0 top-0 flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-white px-3 py-1.5 shadow-md transition-all duration-500 ${
                    loaded ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
                }`}
                style={{ transitionDelay: "1100ms" }}
            >
                <span className="h-2 w-2 animate-pulse rounded-full bg-[#29685B]" />
                <span className="text-[11px] font-semibold text-[#0F172A]">AI</span>
                <span className="text-[11px] text-[#64748B]">
                    {t("Ανάλυση σε 28s", "Analyzed in 28s")}
                </span>
            </div>

            {/* Floating: renewal warning (bottom-left, in padding zone) */}
            <div
                className={`absolute bottom-0 left-0 flex items-center gap-1.5 rounded-full border border-[#FDE68A] bg-white px-3 py-1.5 shadow-md transition-all duration-500 ${
                    loaded ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
                }`}
                style={{ transitionDelay: "1300ms" }}
            >
                <Clock className="h-3.5 w-3.5 text-[#D97706]" />
                <span className="text-[11px] font-semibold text-[#92400E]">
                    {t("Λήγει σε 14 μέρες", "Expires in 14 days")}
                </span>
            </div>
        </div>
    )
}
