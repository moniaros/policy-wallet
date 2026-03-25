export const runtime = 'nodejs'

import Link from "next/link"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { fixMojibakeText } from "@/lib/i18n/fix-mojibake"
import {
    AlertCircle,
    Car,
    CalendarClock,
    CircleHelp,
    FileText,
    HeartPulse,
    House,
    Landmark,
    PawPrint,
    Shield,
    Ship,
    Sparkles,
    Stethoscope,
    Upload,
    Users,
    Wallet,
} from "lucide-react"
import { GettingStartedWrapper } from "@/components/dashboard/GettingStartedWrapper"

function daysUntil(date: Date) {
    return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

function formatCurrencyValue(amount: unknown, currency: string = "EUR") {
    if (amount == null) return null
    const numericAmount = Number(amount)
    if (!Number.isFinite(numericAmount)) return null

    return new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: currency || "EUR",
        maximumFractionDigits: 0,
    }).format(numericAmount)
}

function getLineOfBusinessMeta(lineOfBusiness: string) {
    const key = (lineOfBusiness || "").toLowerCase()

    if (key.includes("motor") || key.includes("auto")) return { icon: Car, label: "Motor" }
    if (key.includes("health")) return { icon: HeartPulse, label: "Health" }
    if (key.includes("home") || key.includes("property")) return { icon: House, label: "Home" }
    if (key.includes("life") || key.includes("investment")) return { icon: Landmark, label: "Life" }
    if (key.includes("pet")) return { icon: PawPrint, label: "Pet" }
    if (key.includes("doctor") || key.includes("liability")) return { icon: Stethoscope, label: "Doctor Liability" }
    if (key.includes("marine") || key.includes("yacht")) return { icon: Ship, label: "Marine" }

    return { icon: Shield, label: "Other" }
}

export default async function PolicyholderHomePage() {
    const { dbUser } = await getAuthenticatedUser()
    const roles = (dbUser.roles || "policyholder").split(",")
    const role = roles[0]

    if (role !== "policyholder") {
        if (role === "agent") redirect("/dashboard")
        if (role === "admin") redirect("/admin/dashboard")
    }

    const isGreek = (dbUser.preferredLanguage || "en") === "el"
    const t = (el: string, en: string) => fixMojibakeText(isGreek ? el : en)

    const policies = await db.policy.findMany({
        where: { ownerUserId: dbUser.id },
        include: { documents: true },
        orderBy: { endDate: "asc" },
    })

    const customerRelationship = await db.customerRelationship.findFirst({
        where: {
            policyholderUserId: dbUser.id,
            status: "active",
        },
        include: { agent: true },
    })

    const now = new Date()
    const activePolicies = policies.filter((policy) => policy.status === "active")
    const sixMonthsOut = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000)
    const upcomingRenewals = policies
        .filter((policy) => policy.endDate > now && policy.endDate <= sixMonthsOut)
        .sort((a, b) => a.endDate.getTime() - b.endDate.getTime())

    const recentDocuments = policies
        .flatMap((policy) =>
            policy.documents.map((document) => ({
                id: document.id,
                policyId: policy.id,
                fileName: document.fileName,
                uploadedAt: document.uploadedAt,
                insurerName: policy.insurerName,
            }))
        )
        .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())
        .slice(0, 5)

    const hasHealthPolicy = policies.some((policy) => policy.lineOfBusiness === "health")
    const duplicatePolicyLines = new Set<string>()
    for (const policy of policies) {
        const sameLineCount = policies.filter((p) => p.lineOfBusiness === policy.lineOfBusiness).length
        if (sameLineCount > 1) duplicatePolicyLines.add(policy.lineOfBusiness)
    }

    const duplicateLobPremiumTotal = policies
        .filter((p) => duplicatePolicyLines.has(p.lineOfBusiness) && p.premiumAmount != null)
        .reduce((sum, p) => sum + Number(p.premiumAmount ?? 0), 0)
    const savingsEstimate = Math.round(duplicateLobPremiumTotal * 0.12)

    // Portfolio summary: total premium + LOB breakdown
    const totalAnnualPremium = activePolicies
        .filter(p => p.premiumAmount != null)
        .reduce((sum, p) => sum + Number(p.premiumAmount ?? 0), 0)
    const lobBreakdown = activePolicies.reduce((acc, p) => {
        const lob = p.lineOfBusiness || 'other'
        if (!acc[lob]) acc[lob] = 0
        acc[lob] += Number(p.premiumAmount ?? 0)
        return acc
    }, {} as Record<string, number>)

    const openGaps = await db.gapInstance.findMany({
        where: {
            policy: { ownerUserId: dbUser.id },
            status: { in: ["open", "detected", "acknowledged"] },
        },
        select: { severity: true },
    })
    const openGapCount = openGaps.length

    // Gap-based health score: start at 100, penalize by severity
    const criticalGaps = openGaps.filter(g => g.severity === "critical").length
    const highGaps = openGaps.filter(g => g.severity === "high").length
    const mediumGaps = openGaps.filter(g => g.severity === "medium").length
    const lowGaps = openGaps.filter(g => g.severity === "low").length
    const healthScore = policies.length === 0
        ? 0
        : Math.max(0, Math.min(100, 100 - (criticalGaps * 25 + highGaps * 15 + mediumGaps * 8 + lowGaps * 3)))

    // Getting Started checklist data
    const hasAnalysisRun = await db.policyAnalysisRun.findFirst({
        where: { userId: dbUser.id, status: "completed" },
        select: { id: true },
    })
    const hasNotificationPref = await db.notificationPreference.findFirst({
        where: { userId: dbUser.id, enabled: true },
        select: { id: true },
    })
    const isOnboardingComplete = Boolean(dbUser.updatedAt) && policies.length > 0

    return (
        <div className="pw-page-shell">
            <div className="mx-auto max-w-7xl px-4 py-8 pb-32 sm:px-6 lg:px-8 lg:pb-8">
                <div className="mb-8">
                    <p className="pw-kicker">
                        {t("Αρχική", "Home")}
                    </p>
                    <h1 className="mt-2 text-3xl font-semibold tracking-tight text-black dark:text-white">
                        {t("Πίνακας προστασίας", "Protection dashboard")}
                    </h1>
                    <p className="mt-2 text-sm text-black/65 dark:text-white/70">
                        {t("Η συνολική εικόνα των ασφαλίσεών σας σε ένα σημείο.", "Your complete insurance overview in one place.")}
                    </p>
                </div>

                {/* Getting Started Checklist */}
                <div className="mb-4">
                    <GettingStartedWrapper
                        policyCount={activePolicies.length}
                        hasAnalysis={Boolean(hasAnalysisRun)}
                        gapCount={openGapCount}
                        hasAgent={Boolean(customerRelationship)}
                        notificationsEnabled={Boolean(hasNotificationPref)}
                    />
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <Link
                        href="/wallet"
                        className="pw-card rounded-3xl p-6"
                    >
                        <p className="pw-kicker">
                            {t("Ενεργά συμβόλαια", "Active policies")}
                        </p>
                        <div className="mt-3 flex items-center justify-between">
                            <p className="text-4xl font-semibold text-black dark:text-white">{activePolicies.length}</p>
                            <Wallet className="h-6 w-6 text-[#1FDC86]" />
                        </div>
                    </Link>

                    <Link
                        href="/coverage-insights"
                        className="pw-card rounded-3xl p-6"
                    >
                        <p className="pw-kicker">
                            {t("Κύκλος κάλυψης", "Coverage progress")}
                        </p>
                        <div className="mt-3 flex items-center gap-4">
                            <div className="relative h-14 w-14">
                                <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
                                    <path d="M18 2 a 16 16 0 1 1 0 32 a 16 16 0 1 1 0 -32" fill="none" className="stroke-black/10 dark:stroke-white/15" strokeWidth="3" />
                                    <path
                                        d="M18 2 a 16 16 0 1 1 0 32 a 16 16 0 1 1 0 -32"
                                        fill="none"
                                        className="stroke-[#1FDC86]"
                                        strokeWidth="3"
                                        strokeDasharray={`${healthScore}, 100`}
                                    />
                                </svg>
                                <span className="absolute inset-0 grid place-items-center text-xs font-semibold text-black dark:text-white">
                                    {healthScore}%
                                </span>
                            </div>
                            <p className="text-sm text-black/65 dark:text-white/70">
                                {t("Άνοιγμα AI Insights", "Open AI Insights")}
                            </p>
                        </div>
                    </Link>

                    {/* Portfolio Summary */}
                    {totalAnnualPremium > 0 && (
                        <div className="pw-card rounded-3xl p-6 lg:col-span-3">
                            <p className="pw-kicker">
                                {t("Χαρτοφυλάκιο ασφαλίσεων", "Insurance portfolio")}
                            </p>
                            <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-3xl font-semibold text-black dark:text-white">
                                        {formatCurrencyValue(totalAnnualPremium) || '€0'}
                                    </p>
                                    <p className="mt-1 text-xs text-black/55 dark:text-white/60">
                                        {t("Συνολικό ετήσιο ασφάλιστρο", "Total annual premium")}
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {Object.entries(lobBreakdown)
                                        .filter(([, amount]) => amount > 0)
                                        .sort(([, a], [, b]) => b - a)
                                        .map(([lob, amount]) => {
                                            const meta = getLineOfBusinessMeta(lob)
                                            const LobIcon = meta.icon
                                            return (
                                                <div key={lob} className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-black/5 px-3 py-1.5 dark:border-white/15 dark:bg-white/5">
                                                    <LobIcon className="h-3.5 w-3.5 text-[#1FDC86]" />
                                                    <span className="text-xs font-bold text-black/70 dark:text-white/75">
                                                        {formatCurrencyValue(amount)}
                                                    </span>
                                                </div>
                                            )
                                        })}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="pw-card rounded-3xl p-6">
                        <div className="flex items-center justify-between">
                            <p className="pw-kicker">
                                {t("Χρονοδιάγραμμα ανανεώσεων", "Renewal timeline")}
                            </p>
                            {upcomingRenewals.length > 0 && (
                                <p className="text-[11px] font-semibold text-black/45 dark:text-white/55">
                                    {upcomingRenewals.length} {t("συμβόλαια", "policies")}
                                </p>
                            )}
                        </div>
                        <div className="mt-3">
                            {upcomingRenewals.length === 0 ? (
                                <p className="text-sm text-black/55 dark:text-white/65">{t("Δεν υπάρχουν ανανεώσεις τους επόμενους 6 μήνες.", "No renewals in the next 6 months.")}</p>
                            ) : (
                                <div className="space-y-2">
                                    {upcomingRenewals.slice(0, 6).map((policy) => {
                                        const { icon: PolicyIcon, label } = getLineOfBusinessMeta(policy.lineOfBusiness)
                                        const premiumLabel = formatCurrencyValue(policy.premiumAmount, policy.premiumCurrency || "EUR")
                                        const days = daysUntil(policy.endDate)
                                        const urgencyColor = days <= 30 ? "bg-rose-500" : days <= 89 ? "bg-amber-500" : "bg-[#1FDC86]"
                                        const urgencyText = days <= 30
                                            ? "text-rose-700 dark:text-rose-300"
                                            : days <= 89
                                                ? "text-amber-700 dark:text-amber-300"
                                                : "text-[#1FDC86] dark:text-[#1FDC86]"

                                        return (
                                            <Link
                                                key={policy.id}
                                                href={`/wallet/${policy.id}`}
                                                className="flex items-center gap-3 rounded-xl border border-black/8 bg-black/[0.03] p-2.5 transition hover:bg-black/[0.06] dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
                                            >
                                                <div className={`h-8 w-1 rounded-full ${urgencyColor}`} />
                                                <span className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-lg bg-white text-black/70 dark:bg-black dark:text-white/70">
                                                    <PolicyIcon className="h-3.5 w-3.5" />
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-xs font-semibold text-black dark:text-white">{policy.insurerName}</p>
                                                    <p className="text-[11px] text-black/50 dark:text-white/55">{label} · {policy.endDate.toLocaleDateString(isGreek ? "el-GR" : "en-GB")}</p>
                                                </div>
                                                <div className="flex-shrink-0 text-right">
                                                    <p className={`text-xs font-bold ${urgencyText}`}>
                                                        {days} {t("ημ.", "d")}
                                                    </p>
                                                    {premiumLabel && (
                                                        <p className="text-[11px] text-black/50 dark:text-white/55">{premiumLabel}</p>
                                                    )}
                                                </div>
                                            </Link>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <Link
                        href="/coverage-insights"
                        className="pw-card rounded-3xl p-6"
                    >
                        <p className="pw-kicker">
                            {t("Ανάλυση AI", "AI Analysis")}
                        </p>
                        <div className="mt-3 flex items-start gap-3">
                            <Sparkles className="mt-0.5 h-5 w-5 text-[#1FDC86]" />
                            <div className="flex-1">
                                <p className="text-sm text-black/80 dark:text-white/80">
                                    {openGapCount > 0
                                        ? t(`Εντοπίστηκαν ${openGapCount} σημεία που αξίζουν έλεγχο.`, `${openGapCount} coverage points need review.`)
                                        : t("Η κάλυψή σας φαίνεται σταθερή σήμερα.", "Your coverage looks stable today.")}
                                </p>
                                {openGapCount > 0 && (
                                    <p className="mt-1.5 text-xs font-semibold text-[#1FDC86]">
                                        {t("Δείτε λεπτομέρειες →", "View details →")}
                                    </p>
                                )}
                            </div>
                        </div>
                    </Link>

                    <Link
                        href="/wallet/add"
                        className="pw-card rounded-3xl p-6"
                    >
                        <p className="pw-kicker">
                            {t("Γρήγορο Upload", "Quick upload")}
                        </p>
                        <div className="mt-3 flex items-center gap-3">
                            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#1FDC86] text-white">
                                <Upload className="h-5 w-5" />
                            </div>
                            <p className="text-sm text-black/80 dark:text-white/80">
                                {t("Προσθέστε νέο συμβόλαιο", "Add a new policy")}
                            </p>
                        </div>
                    </Link>

                    <div className="pw-card rounded-3xl p-6">
                        <p className="pw-kicker">
                            {t("Πρόσφατα έγγραφα", "Recent documents")}
                        </p>
                        <div className="mt-3">
                            {recentDocuments.length === 0 ? (
                                <p className="text-sm text-black/55 dark:text-white/65">{t("Δεν βρέθηκαν έγγραφα.", "No documents yet.")}</p>
                            ) : (
                                <div className="-mx-2 flex snap-x gap-2 overflow-x-auto px-2 pb-1">
                                    {recentDocuments.map((document) => (
                                        <Link
                                            key={document.id}
                                            href={`/wallet/${document.policyId}`}
                                            className="min-w-[220px] snap-start rounded-xl border border-black/10 bg-black/5 px-3 py-3 transition hover:bg-black/10 dark:border-white/15 dark:bg-black/30 dark:hover:bg-black/40"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="truncate text-xs font-semibold text-black dark:text-white">{document.fileName}</span>
                                                <FileText className="h-4 w-4 flex-shrink-0 text-black/45 dark:text-white/55" />
                                            </div>
                                            <p className="mt-2 truncate text-[11px] text-black/45 dark:text-white/60">
                                                {document.insurerName}
                                            </p>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <Link
                        href="/agent"
                        className="pw-card rounded-3xl p-6"
                    >
                        <p className="pw-kicker">
                            {t("Κατάσταση συμβούλου", "Agent link status")}
                        </p>
                        <div className="mt-3 flex items-center gap-3">
                            <span
                                className={`inline-block h-2.5 w-2.5 rounded-full ${
                                    customerRelationship ? "bg-[#1FDC86]" : "bg-black/30 dark:bg-white/30"
                                }`}
                            />
                            <p className="text-sm text-black/80 dark:text-white/80">
                                {customerRelationship
                                    ? t(`Συνδεδεμένος: ${customerRelationship.agent.name || customerRelationship.agent.email}`, `Connected: ${customerRelationship.agent.name || customerRelationship.agent.email}`)
                                    : t("Δεν υπάρχει σύνδεση συμβούλου.", "No agent connected yet.")}
                            </p>
                        </div>
                    </Link>

                    <div className="pw-card rounded-3xl p-6">
                        <p className="pw-kicker">
                            {t("Υπενθύμιση check-up", "Health check-up reminder")}
                        </p>
                        <div className="mt-3 flex items-start gap-3">
                            <HeartPulse className="mt-0.5 h-5 w-5 text-[#1FDC86]" />
                            <p className="text-sm text-black/80 dark:text-white/80">
                                {hasHealthPolicy
                                    ? t("Το ετήσιο check-up σας είναι διαθέσιμο.", "Your annual check-up benefit is available.")
                                    : t("Προσθέστε ασφάλεια υγείας για προληπτικές υπενθυμίσεις.", "Add a health policy to unlock preventive reminders.")}
                            </p>
                        </div>
                    </div>

                    <Link
                        href="/coverage-insights"
                        className="pw-card rounded-3xl p-6"
                    >
                        <p className="pw-kicker">{t("Ευκαιρίες εξοικονόμησης", "Savings opportunities")}</p>
                        <div className="mt-3 flex items-center justify-between">
                            <p className="text-sm text-black/80 dark:text-white/80">
                                {savingsEstimate > 0
                                    ? t(`Δυνατότητα εξοικονόμησης ${formatCurrencyValue(savingsEstimate)}/έτος`, `Potential savings ${formatCurrencyValue(savingsEstimate)}/year`)
                                    : t("Δεν υπάρχουν ευκαιρίες εξοικονόμησης αυτή τη στιγμή.", "No immediate savings opportunities today.")}
                            </p>
                            {savingsEstimate > 0 && (
                                <span className="rounded-full bg-[#1FDC86]/20 px-2 py-1 text-xs font-semibold text-black dark:text-[#1FDC86]">
                                    {formatCurrencyValue(savingsEstimate)}
                                </span>
                            )}
                        </div>
                    </Link>
                </div>

                <div className="mt-4">
                    <Link
                        href="/help"
                        className="pw-card flex items-center justify-between rounded-3xl px-6 py-4"
                    >
                        <div className="flex items-center gap-3">
                            <CircleHelp className="h-5 w-5 text-black/60 dark:text-white/65" />
                            <p className="text-sm font-semibold text-black dark:text-white">
                                {t("Βοήθεια και υποστήριξη", "Help and support")}
                            </p>
                        </div>
                        <p className="text-xs text-black/55 dark:text-white/65">
                            {t("Άνοιγμα Help Center", "Open Help Center")}
                        </p>
                    </Link>
                </div>
            </div>

            <Link
                href="/wallet/add"
                className="fixed bottom-24 left-1/2 z-30 grid h-14 w-14 -translate-x-1/2 place-items-center rounded-2xl bg-[#1FDC86] text-white shadow-xl transition hover:bg-[#19b870] lg:bottom-6 lg:left-auto lg:right-6 lg:translate-x-0"
                aria-label={t("Γρήγορο upload", "Quick upload")}
            >
                <Upload className="h-6 w-6" />
            </Link>

            {!customerRelationship && (
                <div className="fixed bottom-24 left-6 hidden items-center gap-2 rounded-xl bg-amber-100 px-3 py-2 text-xs font-bold text-amber-800 shadow-md lg:flex">
                    <AlertCircle className="h-4 w-4" />
                    {t("Συνδεθείτε με σύμβουλο για ταχύτερη υποστήριξη.", "Connect with an agent for faster support.")}
                    <Link href="/agent" className="underline">
                        {t("Σύνδεση", "Connect")}
                    </Link>
                </div>
            )}

            <div className="fixed bottom-6 left-6 hidden items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-black/80 shadow-md lg:flex dark:bg-black dark:text-white/85">
                <CalendarClock className="h-4 w-4 text-[#1FDC86]" />
                {t("Προτεραιότητα: επόμενη ανανέωση", "Priority: next renewal")}
            </div>

            <div className="fixed bottom-6 right-24 hidden items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-black/80 shadow-md lg:flex dark:bg-black dark:text-white/85">
                <Users className="h-4 w-4 text-[#1FDC86]" />
                {t("My Agent και οικογένεια από Settings", "My Agent and family controls in Settings")}
            </div>
        </div>
    )
}




