"use client"

import { useEffect, useState } from "react"
import { Shield, AlertTriangle, Clock, Send, CheckCircle2, FileText } from "lucide-react"
import { PRODUCT_DISPLAY_HOST } from "@/lib/seo/site"

// ── Shared: browser-chrome wrapper ───────────────────────────────────

/**
 * Every widget below is an ILLUSTRATION of the product, not the product. It
 * shows example clients who do not exist. So the whole thing is one
 * `role="img"` with a plain-language alternative: assistive technology hears a
 * description instead of reading invented client names and coverage scores as
 * though they were the visitor's own book of business.
 *
 * That is also why nothing inside is interactive. A "Send" button that flips to
 * "Sent" without sending anything is a promise the page cannot keep, and at
 * 24px tall it was under the minimum touch target on top of that.
 */
function BrowserChrome({
    url,
    label,
    children,
}: {
    url: string
    label: string
    children: React.ReactNode
}) {
    return (
        <div
            role="img"
            aria-label={label}
            className="overflow-hidden rounded-2xl border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-[0_16px_48px_rgba(0,0,0,0.08),0_0_0_1px_rgba(15,23,42,0.04)]"
        >
            <div className="flex items-center gap-2 border-b border-[#E2E8F0] dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-900 px-4 py-3">
                <div className="flex gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-[#FF5F57]" />
                    <span className="h-3 w-3 rounded-full bg-[#FFBD2E]" />
                    <span className="h-3 w-3 rounded-full bg-[#28CA41]" />
                </div>
                <div className="ml-3 min-w-0 flex-1 truncate rounded-md border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1 font-mono text-micro text-[#5B6A7A] dark:text-slate-400">
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

    // Same fictional book as the homepage widget (AudienceTabs) — the two
    // mocks must agree on the numbers or the demo reads as random.
    const stats = [
        { label: t("Πελάτες", "Clients"), value: "47" },
        { label: t("Ανανεώσεις", "Renewals"), value: "8" },
        { label: t("Ευκαιρίες", "Opportunities"), value: "12" },
    ]

    const clients = [
        { name: t("Νικολαΐδης Γ.", "Nikolaidis G."), policies: t("Αυτοκίνητο + Σπίτι", "Car + Home"), score: 94, badge: t("Ενεργό", "Active"), type: "ok" as const },
        { name: t("Παπαδοπούλου Μ.", "Papadopoulou M."), policies: t("Υγεία", "Health"), score: 68, badge: t("Λήγει σε 8 μέρες", "Runs out in 8 days"), type: "warn" as const },
        { name: t("Καλογεράκης Π.", "Kalogerakis P."), policies: t("Αυτοκίνητο", "Car"), score: 82, badge: t("Ενεργό", "Active"), type: "ok" as const },
        { name: t("Δημητρίου Α.", "Dimitriou A."), policies: t("Κατοικία", "Home"), score: 41, badge: t("Κενό κάλυψης", "Cover gap"), type: "critical" as const },
    ]

    return (
        <BrowserChrome
            url={`${PRODUCT_DISPLAY_HOST}/agent/clients`}
            label={t(
                "Παράδειγμα: μία οθόνη με 47 πελάτες, ποιος έχει ενεργή ασφάλεια, ποιος λήγει σε 8 μέρες και ποιος έχει κενό κάλυψης.",
                "Example: one screen with 47 clients, showing who is active, whose cover runs out in 8 days, and who has a gap."
            )}
        >
            <div className="p-5">
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <p className="text-body-sm font-semibold text-[#0F172A] dark:text-white">{t("Οι πελάτες σας", "Your clients")}</p>
                        <p className="text-micro text-[#5B6A7A] dark:text-slate-400">{t("47 ενεργοί πελάτες", "47 active clients")}</p>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-full border border-[#A7F3D0] dark:border-[#29685B]/50 bg-[#ECFDF5] dark:bg-[#29685B]/15 px-2.5 py-1">
                        <Shield className="h-3 w-3 text-[#29685B] dark:text-[#A7F3D0]" />
                        <span className="text-micro font-semibold text-[#29685B] dark:text-[#A7F3D0]">{t("Έλεγχος ενεργός", "Scan in progress")}</span>
                    </div>
                </div>

                {/* KPI tiles */}
                <div className="mb-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {stats.map((s, i) => (
                        <div
                            key={i}
                            className={`rounded-xl border border-[#E2E8F0] dark:border-slate-800 p-2.5 text-center transition-all motion-reduce:transition-none motion-reduce:translate-x-0 motion-reduce:translate-y-0 motion-reduce:opacity-100 duration-500 ${
                                loaded ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
                            }`}
                            style={{ transitionDelay: `${i * 80 + 400}ms` }}
                        >
                            <p className="text-lead font-bold text-[#0F172A] dark:text-white">{s.value}</p>
                            <p className="text-kicker text-[#5B6A7A] dark:text-slate-400">{s.label}</p>
                        </div>
                    ))}
                </div>

                {/* Client rows */}
                <div className="space-y-2">
                    {clients.map((c, i) => (
                        <div
                            key={i}
                            className={`flex items-center gap-3 rounded-xl border p-2.5 transition-all motion-reduce:transition-none motion-reduce:translate-x-0 motion-reduce:translate-y-0 motion-reduce:opacity-100 duration-500 ${
                                c.type === "critical"
                                    ? "border-[#FECACA] dark:border-red-500/40"
                                    : c.type === "warn"
                                      ? "border-[#FDE68A] dark:border-amber-500/40"
                                      : "border-[#E2E8F0] dark:border-slate-800"
                            } ${loaded ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"}`}
                            style={{ transitionDelay: `${i * 100 + 640}ms` }}
                        >
                            <div
                                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-micro font-bold ${
                                    c.type === "critical"
                                        ? "bg-[#FEF2F2] dark:bg-red-500/15 text-[#B91C1C] dark:text-red-300"
                                        : c.type === "warn"
                                          ? "bg-[#FEF3C7] dark:bg-amber-500/15 text-[#92400E] dark:text-amber-200"
                                          : "bg-[#F0FDF4] dark:bg-[#29685B]/15 text-[#166534] dark:text-[#A7F3D0]"
                                }`}
                            >
                                {c.name.charAt(0)}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="mb-0.5 flex items-center justify-between gap-2">
                                    <span className="truncate text-caption font-semibold text-[#0F172A] dark:text-white">{c.name}</span>
                                    <span
                                        className={`flex-shrink-0 rounded-full px-2 py-0.5 text-kicker font-semibold ${
                                            c.type === "critical"
                                                ? "bg-[#FEF2F2] dark:bg-red-500/15 text-[#B91C1C] dark:text-red-300"
                                                : c.type === "warn"
                                                  ? "bg-[#FEF3C7] dark:bg-amber-500/15 text-[#92400E] dark:text-amber-200"
                                                  : "bg-[#F0FDF4] dark:bg-[#29685B]/15 text-[#166534] dark:text-[#A7F3D0]"
                                        }`}
                                    >
                                        {c.badge}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#F1F5F9] dark:bg-slate-800">
                                        <div
                                            className={`h-full rounded-full transition-all motion-reduce:transition-none motion-reduce:translate-x-0 motion-reduce:translate-y-0 motion-reduce:opacity-100 duration-1000 ease-out ${
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
                                    <span className="text-kicker font-medium text-[#5B6A7A] dark:text-slate-400">{c.score}%</span>
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
            severity: t("Επείγον", "Urgent"),
            textColor: "text-[#B91C1C] dark:text-red-300",
            bg: "bg-[#FEF2F2] dark:bg-red-500/15",
            border: "border-[#FECACA] dark:border-red-500/40",
            label: t("Χωρίς ασφάλεια ζωής (εξαρτώμενα άτομα)", "No life insurance (has dependents)"),
            delay: 1500,
        },
        {
            severity: t("Σημαντικό", "Important"),
            textColor: "text-[#92400E] dark:text-amber-200",
            bg: "bg-[#FFFBEB] dark:bg-amber-500/10",
            border: "border-[#FDE68A] dark:border-amber-500/40",
            label: t("Κατοικία — λείπει σεισμική κάλυψη", "Home — missing earthquake cover"),
            delay: 1800,
        },
        {
            severity: t("Μέτριο", "Medium"),
            textColor: "text-[#1E40AF] dark:text-blue-200",
            bg: "bg-[#EFF6FF] dark:bg-blue-500/15",
            border: "border-[#BFDBFE] dark:border-blue-500/40",
            label: t("Δεν υπάρχει ταξιδιωτική ασφάλεια", "No travel insurance"),
            delay: 2100,
        },
    ]

    return (
        <BrowserChrome
            url={`${PRODUCT_DISPLAY_HOST}/agent/gap-scan`}
            label={t(
                "Παράδειγμα: έλεγχος ενός πελάτη που βρίσκει τρία κενά — καμία ασφάλεια ζωής, καμία σεισμική κάλυψη στο σπίτι, καμία ταξιδιωτική ασφάλεια.",
                "Example: a check on one client that finds three gaps — no life cover, no earthquake cover on the home, and no travel insurance."
            )}
        >
            <div className="p-5">
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <p className="text-body-sm font-semibold text-[#0F172A] dark:text-white">{t("Έλεγχος κενών", "Gap check")}</p>
                        <p className="text-micro text-[#5B6A7A] dark:text-slate-400">{t("Ελέγχουμε: Παπαδοπούλου Μ.", "Checking: Papadopoulou M.")}</p>
                    </div>
                    <div
                        className={`flex items-center gap-1.5 transition-all motion-reduce:transition-none motion-reduce:translate-x-0 motion-reduce:translate-y-0 motion-reduce:opacity-100 duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
                    >
                        <span
                            className={`h-2 w-2 rounded-full ${
                                scanProgress < 100 ? "animate-pulse bg-[#29685B]" : "bg-[#22C55E]"
                            }`}
                        />
                        <span className="text-micro font-semibold text-[#29685B] dark:text-[#A7F3D0]">
                            {scanProgress < 100 ? t("Ελέγχουμε…", "Checking…") : t("Ολοκληρώθηκε", "Done")}
                        </span>
                    </div>
                </div>

                {/* Progress bar */}
                <div
                    className={`mb-4 rounded-xl border border-[#E2E8F0] dark:border-slate-800 p-3 transition-all motion-reduce:transition-none motion-reduce:translate-x-0 motion-reduce:translate-y-0 motion-reduce:opacity-100 duration-500 ${
                        loaded ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
                    }`}
                    style={{ transitionDelay: "400ms" }}
                >
                    <div className="mb-2 flex items-center justify-between">
                        <span className="text-micro font-medium text-[#475569] dark:text-slate-300">{t("Διαβάζουμε τα συμβόλαια", "Reading the policies")}</span>
                        <span className="text-micro font-bold text-[#0F172A] dark:text-white">{scanProgress}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[#F1F5F9] dark:bg-slate-800">
                        <div
                            className="h-full rounded-full bg-[#29685B] transition-all duration-100 ease-linear motion-reduce:transition-none"
                            style={{ width: `${scanProgress}%` }}
                        />
                    </div>
                </div>

                {/* Gap results */}
                <div className="space-y-2">
                    {gaps.map((g, i) => (
                        <div
                            key={i}
                            className={`flex items-start gap-2.5 rounded-xl border ${g.border} ${g.bg} p-3 transition-all motion-reduce:transition-none motion-reduce:translate-x-0 motion-reduce:translate-y-0 motion-reduce:opacity-100 duration-500 ${
                                loaded ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
                            }`}
                            style={{ transitionDelay: `${g.delay}ms` }}
                        >
                            <AlertTriangle className={`mt-0.5 h-3.5 w-3.5 flex-shrink-0 ${g.textColor}`} />
                            <div className="min-w-0 flex-1">
                                <span className={`mr-1.5 rounded-full px-1.5 py-0.5 text-kicker font-bold ${g.textColor} ${g.bg}`}>
                                    {g.severity}
                                </span>
                                <span className="text-micro text-[#374151] dark:text-slate-300">{g.label}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Summary */}
                <div
                    className={`mt-3 rounded-xl border border-[#DCEBDA] dark:border-[#29685B]/40 bg-[#F0FDF4] dark:bg-[#29685B]/15 p-2.5 text-center transition-all motion-reduce:transition-none motion-reduce:translate-x-0 motion-reduce:translate-y-0 motion-reduce:opacity-100 duration-500 ${
                        loaded ? "opacity-100" : "opacity-0"
                    }`}
                    style={{ transitionDelay: "2400ms" }}
                >
                    <p className="text-micro font-semibold text-[#166534] dark:text-[#A7F3D0]">
                        {t("3 κενά σε 47 πελάτες", "3 gaps across 47 clients")}
                    </p>
                </div>
            </div>
        </BrowserChrome>
    )
}

// ── Widget 3: Renewal Reminder Pipeline ──────────────────────────────

export function RenewalReminderWidget({ isGreek }: { isGreek: boolean }) {
    const [loaded, setLoaded] = useState(false)
    // Static illustration state — one reminder already sent, the rest waiting.
    const sent: Record<number, boolean> = { 1: true }
    const t = (el: string, en: string) => (isGreek ? el : en)

    useEffect(() => {
        const timer = setTimeout(() => setLoaded(true), 350)
        return () => clearTimeout(timer)
    }, [])

    const renewals = [
        { name: t("Παπαδοπούλου Μ.", "Papadopoulou M."), policy: t("Αυτοκίνητο", "Car"), days: 8, urgency: "critical" as const },
        { name: t("Νικολαΐδης Γ.", "Nikolaidis G."), policy: t("Κατοικία", "Home"), days: 22, urgency: "warn" as const },
        { name: t("Καλογεράκης Π.", "Kalogerakis P."), policy: t("Υγεία", "Health"), days: 29, urgency: "warn" as const },
        { name: t("Θεοδωρίδης Κ.", "Theodoridis K."), policy: t("Αυτοκίνητο", "Car"), days: 45, urgency: "ok" as const },
    ]

    const cfg = {
        critical: { border: "border-[#FECACA] dark:border-red-500/40", chip: "bg-[#FEF2F2] dark:bg-red-500/15 text-[#B91C1C] dark:text-red-300" },
        warn: { border: "border-[#FDE68A] dark:border-amber-500/40", chip: "bg-[#FEF3C7] dark:bg-amber-500/15 text-[#92400E] dark:text-amber-200" },
        ok: { border: "border-[#E2E8F0] dark:border-slate-800", chip: "bg-[#F0FDF4] dark:bg-[#29685B]/15 text-[#166534] dark:text-[#A7F3D0]" },
    }

    return (
        <BrowserChrome
            url={`${PRODUCT_DISPLAY_HOST}/agent/renewals`}
            label={t(
                "Παράδειγμα: λίστα με τέσσερις πελάτες των οποίων η ασφάλεια λήγει μέσα στις επόμενες 60 μέρες, με τον πιο επείγοντα πρώτο.",
                "Example: a list of four clients whose cover runs out within the next 60 days, most urgent first."
            )}
        >
            <div className="p-5">
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <p className="text-body-sm font-semibold text-[#0F172A] dark:text-white">{t("Τι λήγει", "What is running out")}</p>
                        <p className="text-micro text-[#5B6A7A] dark:text-slate-400">{t("Επόμενες 60 μέρες", "Next 60 days")}</p>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-full border border-[#FECACA] dark:border-red-500/40 bg-[#FEF2F2] dark:bg-red-500/15 px-2.5 py-1">
                        <Clock className="h-3 w-3 text-[#B91C1C] dark:text-red-300" />
                        <span className="text-micro font-semibold text-[#B91C1C] dark:text-red-300">1 {t("επείγον", "urgent")}</span>
                    </div>
                </div>

                <div className="space-y-2">
                    {renewals.map((r, i) => {
                        const isSent = !!sent[i]
                        const { border, chip } = cfg[r.urgency]
                        return (
                            <div
                                key={i}
                                className={`flex items-center gap-3 rounded-xl border ${border} p-2.5 transition-all motion-reduce:transition-none motion-reduce:translate-x-0 motion-reduce:translate-y-0 motion-reduce:opacity-100 duration-500 ${
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
                                    <p className="truncate text-caption font-semibold text-[#0F172A] dark:text-white">{r.name}</p>
                                    <p className="text-micro text-[#5B6A7A] dark:text-slate-400">{r.policy}</p>
                                </div>
                                <span
                                    className={`flex min-h-[24px] flex-shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-kicker font-semibold ${
                                        isSent
                                            ? "bg-[#F0FDF4] dark:bg-[#29685B]/15 text-[#166534] dark:text-[#A7F3D0]"
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
                                </span>
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

    // Demo premiums follow the row labels' language — el-GR puts € after the
    // amount ("450 €/έτος"), so a Greek visitor no longer sees an English-format
    // "€450/yr" mixed into an otherwise-Greek mock row.
    // Generic insurer labels on purpose. This report is invented, and putting
    // invented premiums under a real company's trademark is a claim about that
    // company we have no right to make.
    const rows = [
        { type: t("Αυτοκίνητο", "Car"), insurer: t("Ασφαλιστική Α", "Insurer A"), premium: t("450 €/έτος", "€450/yr") },
        { type: t("Κατοικία", "Home"), insurer: t("Ασφαλιστική Β", "Insurer B"), premium: t("280 €/έτος", "€280/yr") },
        { type: t("Υγεία", "Health"), insurer: t("Ασφαλιστική Γ", "Insurer C"), premium: t("1.200 €/έτος", "€1,200/yr") },
    ]

    return (
        <BrowserChrome
            url={`${PRODUCT_DISPLAY_HOST}/agent/reports`}
            label={t(
                "Παράδειγμα: μια καθαρή αναφορά για έναν πελάτη, με τις ασφάλειές του, το κόστος κάθε μίας και τη συνολική εικόνα κάλυψης.",
                "Example: a clean report for one client, listing their policies, what each one costs, and the overall cover picture."
            )}
        >
            <div className="p-5">
                {/* Report mock */}
                <div
                    className={`overflow-hidden rounded-xl border border-[#E2E8F0] dark:border-slate-800 transition-all motion-reduce:transition-none motion-reduce:translate-x-0 motion-reduce:translate-y-0 motion-reduce:opacity-100 duration-500 ${
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
                                {t("Αναφορά ασφάλισης", "Insurance report")}
                            </span>
                        </div>
                        <div className="rounded bg-white/10 px-2 py-0.5 text-kicker font-medium text-white">
                            01/04/2026
                        </div>
                    </div>

                    {/* Client info */}
                    <div
                        className={`border-b border-[#F1F5F9] dark:border-slate-800 px-4 py-3 transition-all motion-reduce:transition-none motion-reduce:translate-x-0 motion-reduce:translate-y-0 motion-reduce:opacity-100 duration-500 ${
                            loaded ? "opacity-100" : "opacity-0"
                        }`}
                        style={{ transitionDelay: "600ms" }}
                    >
                        <p className="text-kicker uppercase tracking-wider text-[#5B6A7A] dark:text-slate-400">{t("Πελάτης", "Client")}</p>
                        <p className="text-body font-semibold text-[#0F172A] dark:text-white">
                            {t("Νικολαΐδης Γεώργιος", "Nikolaidis Georgios")}
                        </p>
                    </div>

                    {/* Policy rows */}
                    <div className="divide-y divide-[#F1F5F9]">
                        {rows.map((r, i) => (
                            <div
                                key={i}
                                className={`flex items-center justify-between px-4 py-2.5 transition-all motion-reduce:transition-none motion-reduce:translate-x-0 motion-reduce:translate-y-0 motion-reduce:opacity-100 duration-500 ${
                                    loaded ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0"
                                }`}
                                style={{ transitionDelay: `${i * 150 + 800}ms` }}
                            >
                                <div>
                                    <p className="text-caption font-semibold text-[#0F172A] dark:text-white">{r.type}</p>
                                    <p className="text-micro text-[#5B6A7A] dark:text-slate-400">{r.insurer}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-micro font-semibold text-[#29685B] dark:text-[#A7F3D0]">{r.premium}</p>
                                    <span className="rounded-full bg-[#F0FDF4] dark:bg-[#29685B]/15 px-1.5 py-0.5 text-kicker font-semibold text-[#166534] dark:text-[#A7F3D0]">
                                        {t("Ενεργό", "Active")}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Score + send */}
                    <div
                        className={`flex items-center justify-between border-t border-[#E2E8F0] dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-900 px-4 py-3 transition-all motion-reduce:transition-none motion-reduce:translate-x-0 motion-reduce:translate-y-0 motion-reduce:opacity-100 duration-500 ${
                            loaded ? "opacity-100" : "opacity-0"
                        }`}
                        style={{ transitionDelay: "1250ms" }}
                    >
                        <div className="flex items-center gap-1.5">
                            <Shield className="h-3.5 w-3.5 text-[#29685B] dark:text-[#A7F3D0]" />
                            <span className="text-micro font-semibold text-[#0F172A] dark:text-white">{t("Σκορ Προστασίας", "Protection Score")}</span>
                            <span className="text-micro font-bold text-[#29685B] dark:text-[#A7F3D0]">87/100</span>
                        </div>
                        <span className="rounded-full bg-[#29685B] px-3 py-1.5 text-kicker font-bold text-white">
                            {t("Αποστολή →", "Send →")}
                        </span>
                    </div>
                </div>

                {/* Ready-to-send banner */}
                <div
                    className={`mt-3 flex items-center gap-2 rounded-xl border border-[#DCEBDA] dark:border-[#29685B]/40 bg-[#F0FDF4] dark:bg-[#29685B]/15 px-3 py-2 transition-all motion-reduce:transition-none motion-reduce:translate-x-0 motion-reduce:translate-y-0 motion-reduce:opacity-100 duration-500 ${
                        loaded ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
                    }`}
                    style={{ transitionDelay: "1450ms" }}
                >
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-[#29685B] dark:text-[#A7F3D0]" />
                    <p className="text-micro font-semibold text-[#166534] dark:text-[#A7F3D0]">
                        {t("Έτοιμη να σταλεί με ένα κλικ", "Ready to send in one click")}
                    </p>
                </div>
            </div>
        </BrowserChrome>
    )
}
