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
    const upcomingRenewals = policies
        .filter((policy) => policy.endDate > now)
        .sort((a, b) => a.endDate.getTime() - b.endDate.getTime())
        .slice(0, 3)

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

    const savingsEstimate = duplicatePolicyLines.size * 35
    const openGapCount = await db.gapInstance.count({
        where: {
            policy: { ownerUserId: dbUser.id },
            status: { in: ["open", "detected", "acknowledged"] },
        },
    })
    const healthScore = policies.length === 0 ? 0 : Math.max(0, Math.min(100, Math.round((activePolicies.length / policies.length) * 100)))

    return (
        <div className="pw-page-shell">
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <p className="pw-kicker">
                        {t("Î‘ÏÏ‡Î¹ÎºÎ®", "Home")}
                    </p>
                    <h1 className="mt-2 text-3xl font-semibold tracking-tight text-black dark:text-white">
                        {t("Î Î¯Î½Î±ÎºÎ±Ï‚ Ï€ÏÎ¿ÏƒÏ„Î±ÏƒÎ¯Î±Ï‚", "Protection dashboard")}
                    </h1>
                    <p className="mt-2 text-sm text-black/65 dark:text-white/70">
                        {t("Î— ÏƒÏ…Î½Î¿Î»Î¹ÎºÎ® ÎµÎ¹ÎºÏŒÎ½Î± Ï„Ï‰Î½ Î±ÏƒÏ†Î±Î»Î¯ÏƒÎµÏŽÎ½ ÏƒÎ¿Ï… ÏƒÎµ Î­Î½Î± ÏƒÎ·Î¼ÎµÎ¯Î¿.", "Your complete insurance overview in one place.")}
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <Link
                        href="/wallet"
                        className="pw-card rounded-3xl p-6"
                    >
                        <p className="pw-kicker">
                            {t("Î•Î½ÎµÏÎ³Î¬ ÏƒÏ…Î¼Î²ÏŒÎ»Î±Î¹Î±", "Active policies")}
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
                            {t("ÎšÏÎºÎ»Î¿Ï‚ ÎºÎ¬Î»Ï…ÏˆÎ·Ï‚", "Coverage progress")}
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
                                {t("Î†Î½Î¿Î¹Î³Î¼Î± AI Insights", "Open AI Insights")}
                            </p>
                        </div>
                    </Link>

                    <div className="pw-card rounded-3xl p-6">
                        <p className="pw-kicker">
                            {t("Î‘Î½Î±Î½ÎµÏŽÏƒÎµÎ¹Ï‚ ÏƒÏÎ½Ï„Î¿Î¼Î±", "Upcoming renewals")}
                        </p>
                        <div className="mt-3">
                            {upcomingRenewals.length === 0 ? (
                                <p className="text-sm text-black/55 dark:text-white/65">{t("Î”ÎµÎ½ Ï…Ï€Î¬ÏÏ‡Î¿Ï…Î½ Î±Î½Î±Î½ÎµÏŽÏƒÎµÎ¹Ï‚.", "No upcoming renewals.")}</p>
                            ) : (
                                <div className="-mx-2 flex snap-x gap-3 overflow-x-auto px-2 pb-1">
                                    {upcomingRenewals.map((policy) => {
                                        const { icon: PolicyIcon, label } = getLineOfBusinessMeta(policy.lineOfBusiness)
                                        const premiumLabel = formatCurrencyValue(policy.premiumAmount, policy.premiumCurrency || "EUR")

                                        return (
                                            <div
                                                key={policy.id}
                                                className="min-w-[220px] snap-start rounded-2xl border border-black/10 bg-black/5 p-3 dark:border-white/15 dark:bg-black/30"
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="inline-flex items-center gap-2">
                                                        <span className="grid h-8 w-8 place-items-center rounded-lg bg-white text-[#1FDC86] dark:bg-black">
                                                            <PolicyIcon className="h-4 w-4" />
                                                        </span>
                                                        <div>
                                                            <p className="text-[11px] font-semibold uppercase tracking-wide text-black/45 dark:text-white/55">{label}</p>
                                                            <p className="truncate text-xs font-semibold text-black dark:text-white">{policy.insurerName}</p>
                                                        </div>
                                                    </div>
                                                    <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                                                        {daysUntil(policy.endDate)} {t("Î·Î¼.", "days")}
                                                    </p>
                                                </div>
                                                <div className="mt-3 flex items-center justify-between text-xs">
                                                    <p className="text-black/65 dark:text-white/70">
                                                        {policy.endDate.toLocaleDateString(isGreek ? "el-GR" : "en-GB")}
                                                    </p>
                                                    <p className="font-semibold text-black dark:text-white">
                                                        {premiumLabel || t("Ï‡Ï‰ÏÎ¯Ï‚ premium", "premium n/a")}
                                                    </p>
                                                </div>
                                            </div>
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
                            {t("AI Insight", "AI Insight")}
                        </p>
                        <div className="mt-3 flex items-start gap-3">
                            <Sparkles className="mt-0.5 h-5 w-5 text-[#1FDC86]" />
                            <p className="text-sm text-black/80 dark:text-white/80">
                                {openGapCount > 0
                                    ? t(`Î•Î½Ï„Î¿Ï€Î¯ÏƒÏ„Î·ÎºÎ±Î½ ${openGapCount} ÏƒÎ·Î¼ÎµÎ¯Î± Ï€Î¿Ï… Î±Î¾Î¯Î¶Î¿Ï…Î½ Î­Î»ÎµÎ³Ï‡Î¿.`, `${openGapCount} coverage points need review.`)
                                    : t("Î— ÎºÎ¬Î»Ï…ÏˆÎ® ÏƒÎ¿Ï… Ï†Î±Î¯Î½ÎµÏ„Î±Î¹ ÏƒÏ„Î±Î¸ÎµÏÎ® ÏƒÎ®Î¼ÎµÏÎ±.", "Your coverage looks stable today.")}
                            </p>
                        </div>
                    </Link>

                    <Link
                        href="/wallet/add"
                        className="pw-card rounded-3xl p-6"
                    >
                        <p className="pw-kicker">
                            {t("Î“ÏÎ®Î³Î¿ÏÎ¿ Upload", "Quick upload")}
                        </p>
                        <div className="mt-3 flex items-center gap-3">
                            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#1FDC86] text-white">
                                <Upload className="h-5 w-5" />
                            </div>
                            <p className="text-sm text-black/80 dark:text-white/80">
                                {t("Î ÏÏŒÏƒÎ¸ÎµÏƒÎµ Î½Î­Î¿ ÏƒÏ…Î¼Î²ÏŒÎ»Î±Î¹Î¿", "Add a new policy")}
                            </p>
                        </div>
                    </Link>

                    <div className="pw-card rounded-3xl p-6">
                        <p className="pw-kicker">
                            {t("Î ÏÏŒÏƒÏ†Î±Ï„Î± Î­Î³Î³ÏÎ±Ï†Î±", "Recent documents")}
                        </p>
                        <div className="mt-3">
                            {recentDocuments.length === 0 ? (
                                <p className="text-sm text-black/55 dark:text-white/65">{t("Î”ÎµÎ½ Î²ÏÎ­Î¸Î·ÎºÎ±Î½ Î­Î³Î³ÏÎ±Ï†Î±.", "No documents yet.")}</p>
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
                            {t("ÎšÎ±Ï„Î¬ÏƒÏ„Î±ÏƒÎ· ÏƒÏ…Î¼Î²Î¿ÏÎ»Î¿Ï…", "Agent link status")}
                        </p>
                        <div className="mt-3 flex items-center gap-3">
                            <span
                                className={`inline-block h-2.5 w-2.5 rounded-full ${
                                    customerRelationship ? "bg-[#1FDC86]" : "bg-black/30 dark:bg-white/30"
                                }`}
                            />
                            <p className="text-sm text-black/80 dark:text-white/80">
                                {customerRelationship
                                    ? t(`Î£Ï…Î½Î´ÎµÎ´ÎµÎ¼Î­Î½Î¿Ï‚: ${customerRelationship.agent.name || customerRelationship.agent.email}`, `Connected: ${customerRelationship.agent.name || customerRelationship.agent.email}`)
                                    : t("Î”ÎµÎ½ Ï…Ï€Î¬ÏÏ‡ÎµÎ¹ ÏƒÏÎ½Î´ÎµÏƒÎ· ÏƒÏ…Î¼Î²Î¿ÏÎ»Î¿Ï….", "No agent connected yet.")}
                            </p>
                        </div>
                    </Link>

                    <div className="pw-card rounded-3xl p-6">
                        <p className="pw-kicker">
                            {t("Î¥Ï€ÎµÎ½Î¸ÏÎ¼Î¹ÏƒÎ· check-up", "Health check-up reminder")}
                        </p>
                        <div className="mt-3 flex items-start gap-3">
                            <HeartPulse className="mt-0.5 h-5 w-5 text-[#1FDC86]" />
                            <p className="text-sm text-black/80 dark:text-white/80">
                                {hasHealthPolicy
                                    ? t("Î¤Î¿ ÎµÏ„Î®ÏƒÎ¹Î¿ check-up ÏƒÎ¿Ï… ÎµÎ¯Î½Î±Î¹ Î´Î¹Î±Î¸Î­ÏƒÎ¹Î¼Î¿.", "Your annual check-up benefit is available.")
                                    : t("Î ÏÏŒÏƒÎ¸ÎµÏƒÎµ health policy Î³Î¹Î± Ï€ÏÎ¿Î»Î·Ï€Ï„Î¹ÎºÎ­Ï‚ Ï…Ï€ÎµÎ½Î¸Ï…Î¼Î¯ÏƒÎµÎ¹Ï‚.", "Add a health policy to unlock preventive reminders.")}
                            </p>
                        </div>
                    </div>

                    <Link
                        href="/coverage-insights"
                        className="pw-card rounded-3xl p-6"
                    >
                        <p className="pw-kicker">
                            {t("Î•Ï…ÎºÎ±Î¹ÏÎ¯ÎµÏ‚ ÎµÎ¾Î¿Î¹ÎºÎ¿Î½ÏŒÎ¼Î·ÏƒÎ·Ï‚", "Savings opportunities")}
                        </p>
                        <div className="mt-3 flex items-center justify-between">
                            <p className="text-sm text-black/80 dark:text-white/80">
                                {savingsEstimate > 0
                                    ? t(`Î Î¹Î¸Î±Î½Î® ÎµÎ¾Î¿Î¹ÎºÎ¿Î½ÏŒÎ¼Î·ÏƒÎ· â‚¬${savingsEstimate}/Î­Ï„Î¿Ï‚`, `Potential savings â‚¬${savingsEstimate}/year`)
                                    : t("Î”ÎµÎ½ Ï…Ï€Î¬ÏÏ‡Î¿Ï…Î½ Î¬Î¼ÎµÏƒÎµÏ‚ ÎµÏ…ÎºÎ±Î¹ÏÎ¯ÎµÏ‚ ÏƒÎ®Î¼ÎµÏÎ±.", "No immediate savings opportunities today.")}
                            </p>
                            <span className="rounded-full bg-[#1FDC86]/20 px-2 py-1 text-xs font-semibold text-black dark:text-[#1FDC86]">
                                â‚¬
                            </span>
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
                                {t("Î’Î¿Î®Î¸ÎµÎ¹Î± ÎºÎ±Î¹ Ï…Ï€Î¿ÏƒÏ„Î®ÏÎ¹Î¾Î·", "Help and support")}
                            </p>
                        </div>
                        <p className="text-xs text-black/55 dark:text-white/65">
                            {t("Î†Î½Î¿Î¹Î³Î¼Î± Help Center", "Open Help Center")}
                        </p>
                    </Link>
                </div>
            </div>

            <Link
                href="/wallet/add"
                className="fixed bottom-24 left-1/2 z-30 grid h-14 w-14 -translate-x-1/2 place-items-center rounded-2xl bg-[#1FDC86] text-white shadow-xl transition hover:bg-[#19b870] lg:bottom-6 lg:left-auto lg:right-6 lg:translate-x-0"
                aria-label={t("Î“ÏÎ®Î³Î¿ÏÎ¿ upload", "Quick upload")}
            >
                <Upload className="h-6 w-6" />
            </Link>

            {!customerRelationship && (
                <div className="fixed bottom-24 left-6 hidden items-center gap-2 rounded-xl bg-amber-100 px-3 py-2 text-xs font-bold text-amber-800 shadow-md lg:flex">
                    <AlertCircle className="h-4 w-4" />
                    {t("Î£Ï…Î½Î´Î­ÏƒÎ¿Ï… Î¼Îµ ÏƒÏÎ¼Î²Î¿Ï…Î»Î¿ Î³Î¹Î± Ï„Î±Ï‡ÏÏ„ÎµÏÎ· Ï…Ï€Î¿ÏƒÏ„Î®ÏÎ¹Î¾Î·.", "Connect with an agent for faster support.")}
                    <Link href="/agent" className="underline">
                        {t("Î£ÏÎ½Î´ÎµÏƒÎ·", "Connect")}
                    </Link>
                </div>
            )}

            <div className="fixed bottom-6 left-6 hidden items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-black/80 shadow-md lg:flex dark:bg-black dark:text-white/85">
                <CalendarClock className="h-4 w-4 text-[#1FDC86]" />
                {t("Î ÏÎ¿Ï„ÎµÏÎ±Î¹ÏŒÏ„Î·Ï„Î±: ÎµÏ€ÏŒÎ¼ÎµÎ½Î· Î±Î½Î±Î½Î­Ï‰ÏƒÎ·", "Priority: next renewal")}
            </div>

            <div className="fixed bottom-6 right-24 hidden items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-black/80 shadow-md lg:flex dark:bg-black dark:text-white/85">
                <Users className="h-4 w-4 text-[#1FDC86]" />
                {t("My Agent ÎºÎ±Î¹ Î¿Î¹ÎºÎ¿Î³Î­Î½ÎµÎ¹Î± Î±Ï€ÏŒ Settings", "My Agent and family controls in Settings")}
            </div>
        </div>
    )
}




