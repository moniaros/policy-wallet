"use client"

import { useEffect, useState } from "react"
import { Shield, AlertTriangle, Clock, Send, CheckCircle2, FileText } from "lucide-react"
import { PRODUCT_DISPLAY_HOST } from "@/lib/seo/site"

// ── Shared: browser-chrome wrapper ───────────────────────────────────

function BrowserChrome({ url, children }: { url: string; children: React.ReactNode }) {
    return (
        <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_16px_48px_rgba(0,0,0,0.08),0_0_0_1px_rgba(15,23,42,0.04)]">
            <div className="flex items-center gap-2 border-b border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3">
                <div className="flex gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-[#FF5F57]" />
                    <span className="h-3 w-3 rounded-full bg-[#FFBD2E]" />
                    <span className="h-3 w-3 rounded-full bg-[#28CA41]" />
                </div>
                <div className="ml-3 flex-1 rounded-md border border-[#E2E8F0] bg-white px-3 py-1 font-mono text-micro text-[#64748B]">
                    {url}
                </div>
            </div>
            {children}
        </div>
    )
}

// ── Widget 1: Client Portfolio Dashboard ──────────────────────────────

export function ClientPortfolioDashboardWidget({ isGreek }: { isGreek: boolean }) {
    const [loaded, setLoaded] = useState(false)
    const t = (el: string, en: string) => (isGreek ? el : en)

    useEffect(() => {
        const timer = setTimeout(() => setLoaded(true), 350)
        return () => clearTimeout(timer)
    }, [])

    const stats = [
        { label: t("Πελάτες", "Clients"), value: "47" },
        { label: t("Ανανεώσεις", "Renewals"), value: "12" },
        { label: t("Ευκαιρίες", "Opps"), value: "8" },
    ]

    const clients = [
        { name: "Νικολαΐδης Γ.", policies: t("Αυτ. + Κατ.", "Motor + Home"), score: 94, badge: t("Ενεργό", "Active"), type: "ok" as const },
        { name: "Παπαδοπούλου Μ.", policies: t("Υγεία", "Health"), score: 68, badge: t("Λήγει σε 8 μέρες", "Expires in 8 days"), type: "warn" as const },
        { name: "Καλογεράκης Π.", policies: t("Αυτοκίνητο", "Motor"), score: 82, badge: t("Ενεργό", "Active"), type: "ok" as const },
        { name: "Δημητρίου Α.", policies: t("Κατοικία", "Home"), score: 41, badge: t("Κενό κάλυψης", "Coverage gap"), type: "critical" as const },
    ]

    return (
        <BrowserChrome url={`${PRODUCT_DISPLAY_HOST}/agent/clients`}>
            <div className="p-5">
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <p className="text-body-sm font-semibold text-[#0F172A]">{t("Χαρτοφυλάκιο Πελατών", "Client Portfolio")}</p>
                        <p className="text-micro text-[#64748B]">{t("47 ενεργοί πελάτες", "47 active clients")}</p>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-full border border-[#A7F3D0] bg-[#ECFDF5] px-2.5 py-1">
                        <Shield className="h-3 w-3 text-[#29685B]" />
                        <span className="text-micro font-semibold text-[#29685B]">{t("AI Ενεργό", "AI Active")}</span>
                    </div>
                </div>

                {/* KPI tiles */}
                <div className="mb-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {stats.map((s, i) => (
                        <div
                            key={i}
                            className={`rounded-xl border border-[#E2E8F0] p-2.5 text-center transition-all duration-500 ${
                                loaded ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
                            }`}
                            style={{ transitionDelay: `${i * 80 + 400}ms` }}
                        >
                            <p className="text-lead font-bold text-[#0F172A]">{s.value}</p>
                            <p className="text-kicker text-[#64748B]">{s.label}</p>
                        </div>
                    ))}
                </div>

                {/* Client rows */}
                <div className="space-y-2">
                    {clients.map((c, i) => (
                        <div
                            key={i}
                            className={`flex items-center gap-3 rounded-xl border p-2.5 transition-all duration-500 ${
                                c.type === "critical"
                                    ? "border-[#FECACA]"
                                    : c.type === "warn"
                                      ? "border-[#FDE68A]"
                                      : "border-[#E2E8F0]"
                            } ${loaded ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"}`}
                            style={{ transitionDelay: `${i * 100 + 640}ms` }}
                        >
                            <div
                                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-micro font-bold ${
                                    c.type === "critical"
                                        ? "bg-[#FEF2F2] text-[#B91C1C]"
                                        : c.type === "warn"
                                          ? "bg-[#FEF3C7] text-[#92400E]"
                                          : "bg-[#F0FDF4] text-[#166534]"
                                }`}
                            >
                                {c.name.charAt(0)}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="mb-0.5 flex items-center justify-between gap-2">
                                    <span className="truncate text-caption font-semibold text-[#0F172A]">{c.name}</span>
                                    <span
                                        className={`flex-shrink-0 rounded-full px-2 py-0.5 text-kicker font-semibold ${
                                            c.type === "critical"
                                                ? "bg-[#FEF2F2] text-[#B91C1C]"
                                                : c.type === "warn"
                                                  ? "bg-[#FEF3C7] text-[#B45309]"
                                                  : "bg-[#F0FDF4] text-[#166534]"
                                        }`}
                                    >
                                        {c.badge}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#F1F5F9]">
                                        <div
                                            className={`h-full rounded-full transition-all duration-1000 ease-out ${
                                                c.type === "critical"
                                                    ? "bg-[#EF4444]"
                                                    : c.type === "warn"
                                                      ? "bg-[#F59E0B]"
                                                      : "bg-[#29685B]"
                                            }`}
                                            style={{
                                                width: loaded ? `${c.score}%` : "0%",
                                                transitionDelay: `${i * 100 + 900}ms`,
                                            }}
                                        />
                                    </div>
                                    <span className="text-kicker font-medium text-[#64748B]">{c.score}%</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </BrowserChrome>
    )
}

// ── Widget 2: AI Gap Analysis ─────────────────────────────────────────

export function GapAnalysisWidget({ isGreek }: { isGreek: boolean }) {
    const [loaded, setLoaded] = useState(false)
    const [scanProgress, setScanProgress] = useState(0)
    const t = (el: string, en: string) => (isGreek ? el : en)

    useEffect(() => {
        const timer = setTimeout(() => setLoaded(true), 350)
        return () => clearTimeout(timer)
    }, [])

    useEffect(() => {
        if (!loaded) return
        let val = 0
        const interval = setInterval(() => {
            val += 2
            setScanProgress(Math.min(val, 100))
            if (val >= 100) clearInterval(interval)
        }, 35)
        return () => clearInterval(interval)
    }, [loaded])

    const gaps = [
        {
            severity: "CRITICAL",
            textColor: "text-[#B91C1C]",
            bg: "bg-[#FEF2F2]",
            border: "border-[#FECACA]",
            label: t("Χωρίς ασφάλεια ζωής (εξαρτώμενα άτομα)", "No life insurance (has dependents)"),
            delay: 1500,
        },
        {
            severity: "HIGH",
            textColor: "text-[#B45309]",
            bg: "bg-[#FFFBEB]",
            border: "border-[#FDE68A]",
            label: t("Κατοικία — λείπει σεισμική κάλυψη", "Home — missing earthquake coverage"),
            delay: 1800,
        },
        {
            severity: "MEDIUM",
            textColor: "text-[#1E40AF]",
            bg: "bg-[#EFF6FF]",
            border: "border-[#BFDBFE]",
            label: t("Δεν υπάρχει ταξιδιωτική ασφάλεια", "No travel insurance"),
            delay: 2100,
        },
    ]

    return (
        <BrowserChrome url={`${PRODUCT_DISPLAY_HOST}/agent/gap-scan`}>
            <div className="p-5">
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <p className="text-body-sm font-semibold text-[#0F172A]">{t("AI Σαρωτής Κενών", "AI Gap Scanner")}</p>
                        <p className="text-micro text-[#64748B]">{t("Σάρωση: Παπαδοπούλου Μ.", "Scanning: Papadopoulou M.")}</p>
                    </div>
                    <div
                        className={`flex items-center gap-1.5 transition-all duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
                    >
                        <span
                            className={`h-2 w-2 rounded-full ${
                                scanProgress < 100 ? "animate-pulse bg-[#29685B]" : "bg-[#22C55E]"
                            }`}
                        />
                        <span className="text-micro font-semibold text-[#29685B]">
                            {scanProgress < 100 ? t("Σάρωση…", "Scanning…") : t("Ολοκληρώθη", "Complete")}
                        </span>
                    </div>
                </div>

                {/* Progress bar */}
                <div
                    className={`mb-4 rounded-xl border border-[#E2E8F0] p-3 transition-all duration-500 ${
                        loaded ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
                    }`}
                    style={{ transitionDelay: "400ms" }}
                >
                    <div className="mb-2 flex items-center justify-between">
                        <span className="text-micro font-medium text-[#475569]">{t("Ανάλυση συμβολαίων", "Analyzing policies")}</span>
                        <span className="text-micro font-bold text-[#0F172A]">{scanProgress}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[#F1F5F9]">
                        <div
                            className="h-full rounded-full bg-[#29685B] transition-all duration-100 ease-linear"
                            style={{ width: `${scanProgress}%` }}
                        />
                    </div>
                </div>

                {/* Gap results */}
                <div className="space-y-2">
                    {gaps.map((g, i) => (
                        <div
                            key={i}
                            className={`flex items-start gap-2.5 rounded-xl border ${g.border} ${g.bg} p-3 transition-all duration-500 ${
                                loaded ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
                            }`}
                            style={{ transitionDelay: `${g.delay}ms` }}
                        >
                            <AlertTriangle className={`mt-0.5 h-3.5 w-3.5 flex-shrink-0 ${g.textColor}`} />
                            <div className="min-w-0 flex-1">
                                <span className={`mr-1.5 rounded-full px-1.5 py-0.5 text-kicker font-bold ${g.textColor} ${g.bg}`}>
                                    {g.severity}
                                </span>
                                <span className="text-micro text-[#374151]">{g.label}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Summary */}
                <div
                    className={`mt-3 rounded-xl border border-[#DCEBDA] bg-[#F0FDF4] p-2.5 text-center transition-all duration-500 ${
                        loaded ? "opacity-100" : "opacity-0"
                    }`}
                    style={{ transitionDelay: "2400ms" }}
                >
                    <p className="text-micro font-semibold text-[#166534]">
                        {t("3 κενά εντοπίστηκαν σε 47 πελάτες", "3 gaps detected across 47 clients")}
                    </p>
                </div>
            </div>
        </BrowserChrome>
    )
}

// ── Widget 3: Renewal Reminder Pipeline ──────────────────────────────

export function RenewalReminderWidget({ isGreek }: { isGreek: boolean }) {
    const [loaded, setLoaded] = useState(false)
    const [sent, setSent] = useState<Record<number, boolean>>({ 1: true })
    const t = (el: string, en: string) => (isGreek ? el : en)

    useEffect(() => {
        const timer = setTimeout(() => setLoaded(true), 350)
        return () => clearTimeout(timer)
    }, [])

    const renewals = [
        { name: "Παπαδοπούλου Μ.", policy: t("Αυτοκίνητο", "Motor"), days: 8, urgency: "critical" as const },
        { name: "Νικολαΐδης Γ.", policy: t("Κατοικία", "Home"), days: 22, urgency: "warn" as const },
        { name: "Καλογεράκης Π.", policy: t("Υγεία", "Health"), days: 29, urgency: "warn" as const },
        { name: "Θεοδωρίδης Κ.", policy: t("Αυτοκίνητο", "Motor"), days: 45, urgency: "ok" as const },
    ]

    const cfg = {
        critical: { border: "border-[#FECACA]", chip: "bg-[#FEF2F2] text-[#B91C1C]" },
        warn: { border: "border-[#FDE68A]", chip: "bg-[#FEF3C7] text-[#B45309]" },
        ok: { border: "border-[#E2E8F0]", chip: "bg-[#F0FDF4] text-[#166534]" },
    }

    return (
        <BrowserChrome url={`${PRODUCT_DISPLAY_HOST}/agent/renewals`}>
            <div className="p-5">
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <p className="text-body-sm font-semibold text-[#0F172A]">{t("Pipeline Ανανεώσεων", "Renewal Pipeline")}</p>
                        <p className="text-micro text-[#64748B]">{t("Επόμενες 60 μέρες", "Next 60 days")}</p>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-full border border-[#FECACA] bg-[#FEF2F2] px-2.5 py-1">
                        <Clock className="h-3 w-3 text-[#B91C1C]" />
                        <span className="text-micro font-semibold text-[#B91C1C]">1 {t("επείγον", "urgent")}</span>
                    </div>
                </div>

                <div className="space-y-2">
                    {renewals.map((r, i) => {
                        const isSent = !!sent[i]
                        const { border, chip } = cfg[r.urgency]
                        return (
                            <div
                                key={i}
                                className={`flex items-center gap-3 rounded-xl border ${border} p-2.5 transition-all duration-500 ${
                                    loaded ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
                                }`}
                                style={{ transitionDelay: `${i * 100 + 400}ms` }}
                            >
                                {/* Days chip */}
                                <div className={`flex-shrink-0 rounded-lg px-2 py-1 text-center ${chip}`}>
                                    <p className="text-body font-bold leading-none">{r.days}</p>
                                    <p className="text-kicker leading-tight">{t("μέρες", "days")}</p>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-caption font-semibold text-[#0F172A]">{r.name}</p>
                                    <p className="text-micro text-[#64748B]">{r.policy}</p>
                                </div>
                                <button
                                    onClick={() => setSent((prev) => ({ ...prev, [i]: true }))}
                                    className={`flex flex-shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-kicker font-semibold transition-all ${
                                        isSent
                                            ? "bg-[#F0FDF4] text-[#166534]"
                                            : "bg-[#29685B] text-white hover:bg-[#1C4E44]"
                                    }`}
                                >
                                    {isSent ? (
                                        <>
                                            <CheckCircle2 className="h-3 w-3" />
                                            {t("Στάλθηκε", "Sent")}
                                        </>
                                    ) : (
                                        <>
                                            <Send className="h-3 w-3" />
                                            {t("Αποστολή", "Send")}
                                        </>
                                    )}
                                </button>
                            </div>
                        )
                    })}
                </div>
            </div>
        </BrowserChrome>
    )
}

// ── Widget 4: Branded Report Preview ─────────────────────────────────

export function BrandedReportWidget({ isGreek }: { isGreek: boolean }) {
    const [loaded, setLoaded] = useState(false)
    const t = (el: string, en: string) => (isGreek ? el : en)

    useEffect(() => {
        const timer = setTimeout(() => setLoaded(true), 350)
        return () => clearTimeout(timer)
    }, [])

    const rows = [
        { type: t("Αυτοκίνητο", "Motor"), insurer: "Interamerican", premium: "€450/yr" },
        { type: t("Κατοικία", "Home"), insurer: t("Εθνική", "Ethniki"), premium: "€280/yr" },
        { type: t("Υγεία", "Health"), insurer: "Eurolife", premium: "€1.200/yr" },
    ]

    return (
        <BrowserChrome url={`${PRODUCT_DISPLAY_HOST}/agent/reports`}>
            <div className="p-5">
                {/* Report mock */}
                <div
                    className={`overflow-hidden rounded-xl border border-[#E2E8F0] transition-all duration-500 ${
                        loaded ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
                    }`}
                    style={{ transitionDelay: "400ms" }}
                >
                    {/* Branded header */}
                    <div className="flex items-center justify-between bg-[#29685B] px-4 py-3">
                        <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white/20">
                                <FileText className="h-4 w-4 text-white" />
                            </div>
                            <span className="text-caption font-bold uppercase tracking-wider text-white">
                                {t("Ασφαλιστική Αναφορά", "Insurance Report")}
                            </span>
                        </div>
                        <div className="rounded bg-white/15 px-2 py-0.5 text-kicker font-medium text-white/90">
                            01/04/2026
                        </div>
                    </div>

                    {/* Client info */}
                    <div
                        className={`border-b border-[#F1F5F9] px-4 py-3 transition-all duration-500 ${
                            loaded ? "opacity-100" : "opacity-0"
                        }`}
                        style={{ transitionDelay: "600ms" }}
                    >
                        <p className="text-kicker uppercase tracking-wider text-[#64748B]">{t("Πελάτης", "Client")}</p>
                        <p className="text-body font-semibold text-[#0F172A]">Νικολαΐδης Γεώργιος</p>
                    </div>

                    {/* Policy rows */}
                    <div className="divide-y divide-[#F1F5F9]">
                        {rows.map((r, i) => (
                            <div
                                key={i}
                                className={`flex items-center justify-between px-4 py-2.5 transition-all duration-500 ${
                                    loaded ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0"
                                }`}
                                style={{ transitionDelay: `${i * 150 + 800}ms` }}
                            >
                                <div>
                                    <p className="text-caption font-semibold text-[#0F172A]">{r.type}</p>
                                    <p className="text-micro text-[#64748B]">{r.insurer}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-micro font-semibold text-[#29685B]">{r.premium}</p>
                                    <span className="rounded-full bg-[#F0FDF4] px-1.5 py-0.5 text-kicker font-semibold text-[#166534]">
                                        {t("Ενεργό", "Active")}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Score + send */}
                    <div
                        className={`flex items-center justify-between border-t border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 transition-all duration-500 ${
                            loaded ? "opacity-100" : "opacity-0"
                        }`}
                        style={{ transitionDelay: "1250ms" }}
                    >
                        <div className="flex items-center gap-1.5">
                            <Shield className="h-3.5 w-3.5 text-[#29685B]" />
                            <span className="text-micro font-semibold text-[#0F172A]">{t("Σκορ κάλυψης", "Protection Score")}</span>
                            <span className="text-micro font-bold text-[#29685B]">87/100</span>
                        </div>
                        <button className="rounded-full bg-[#29685B] px-3 py-1.5 text-kicker font-bold text-white transition-colors hover:bg-[#1C4E44]">
                            {t("Αποστολή →", "Send →")}
                        </button>
                    </div>
                </div>

                {/* Ready-to-send banner */}
                <div
                    className={`mt-3 flex items-center gap-2 rounded-xl border border-[#DCEBDA] bg-[#F0FDF4] px-3 py-2 transition-all duration-500 ${
                        loaded ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
                    }`}
                    style={{ transitionDelay: "1450ms" }}
                >
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-[#29685B]" />
                    <p className="text-micro font-semibold text-[#166534]">
                        {t("Έτοιμο για αποστολή — PDF + email με ένα κλικ", "Ready to send — PDF + email in one click")}
                    </p>
                </div>
            </div>
        </BrowserChrome>
    )
}
