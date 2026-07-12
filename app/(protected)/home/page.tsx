export const runtime = 'nodejs'

import Link from "next/link"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { fixMojibakeText } from "@/lib/i18n/fix-mojibake"
import type { User } from "@prisma/client"
import { getProtectionScore } from "@/lib/services/gap-engine"
import {
    ArrowRight,
    CalendarClock,
    Car,
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
    Wallet,
} from "lucide-react"
import { GettingStartedWrapper } from "@/components/dashboard/GettingStartedWrapper"
import { resolveUserEntitlements } from "@/lib/subscription-entitlements"
import { FREE_POLICY_LIMIT } from "@/lib/monetization/feature-gates"
import { UpgradeTriggerCard } from "@/components/monetization/UpgradeTriggerCard"
import { CarriedPlanCard } from "@/components/monetization/CarriedPlanCard"

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

export default async function PolicyholderHomePage({ preloadedDbUser }: { preloadedDbUser?: User } = {}) {
    const dbUser = preloadedDbUser ?? (await getAuthenticatedUser()).dbUser

    if (!preloadedDbUser) {
        // Role-guard only when accessed directly — dashboard/page.tsx already redirects
        const role = (dbUser.roles || "policyholder").split(",")[0]
        if (role !== "policyholder") {
            if (role === "agent") redirect("/dashboard/agent")
            if (role === "admin") redirect("/admin/dashboard")
        }
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

    const entitlements = await resolveUserEntitlements(dbUser.id)
    const isFreeTier = entitlements.tier === "free"

    // Plan picked at signup but never activated (carried through onboarding)
    let carriedPlan: "ph-plus" | "ph-pro" | null = null
    let carriedBilling: "monthly" | "annual" = "monthly"
    if (isFreeTier) {
        const profile = await db.policyholderProfile.findUnique({
            where: { userId: dbUser.id },
            select: { preferences: true },
        })
        const prefs = (profile?.preferences ?? {}) as Record<string, unknown>
        if (prefs.selectedPlan === "ph-plus" || prefs.selectedPlan === "ph-pro") {
            carriedPlan = prefs.selectedPlan
            carriedBilling = prefs.selectedBilling === "annual" ? "annual" : "monthly"
        }
    }

    const now = new Date()
    const activePolicies = policies.filter((policy) => policy.status === "active")
    const insurerCount = new Set(
        activePolicies.map((policy) => policy.insurerName).filter(Boolean)
    ).size
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

    // Protection score: prefer cached gap engine score, fallback to legacy penalty-based calculation
    const cachedScore = await getProtectionScore(dbUser.id, 24 * 60 * 60 * 1000).catch(() => null)
    let healthScore: number
    if (cachedScore) {
        healthScore = cachedScore.overallScore
    } else {
        const criticalGaps = openGaps.filter(g => g.severity === "critical").length
        const highGaps = openGaps.filter(g => g.severity === "high").length
        const mediumGaps = openGaps.filter(g => g.severity === "medium").length
        const lowGaps = openGaps.filter(g => g.severity === "low").length
        healthScore = policies.length === 0
            ? 0
            : Math.max(0, Math.min(100, 100 - (criticalGaps * 25 + highGaps * 15 + mediumGaps * 8 + lowGaps * 3)))
    }

    // Getting Started checklist data
    const hasAnalysisRun = await db.policyAnalysisRun.findFirst({
        where: { userId: dbUser.id, status: { in: ["completed", "completed_with_warnings"] } },
        select: { id: true },
    })
    const hasNotificationPref = await db.notificationPreference.findFirst({
        where: { userId: dbUser.id, enabled: true },
        select: { id: true },
    })
    const isOnboardingComplete = Boolean(dbUser.updatedAt) && policies.length > 0

    return (
        <div className="pw-page-shell">
            <div className="mx-auto max-w-4xl px-4 py-6 pb-28 sm:px-6 lg:pb-6">
                <div className="mb-5">
                    <p className="pw-kicker">
                        {t("Αρχική", "Home")}
                    </p>
                    <h1 className="mt-1.5 text-xl font-semibold tracking-tight text-[#0F172A] dark:text-white">
                        {t("Χαρτοφυλάκιο προστασίας", "Protection portfolio")}
                    </h1>
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

                {/* Signup-selected plan continuity (never activated → offer checkout) */}
                {carriedPlan && (
                    <div className="mb-4">
                        <CarriedPlanCard planId={carriedPlan} billingPeriod={carriedBilling} />
                    </div>
                )}

                {/* Free-tier usage banner (Trigger A surface: approaching the policy cap) */}
                {isFreeTier && activePolicies.length >= 2 && (
                    <div className="mb-4">
                        <UpgradeTriggerCard
                            featureKey="policy_upload_limit"
                            triggerSource="home_usage_banner"
                            returnTo="/home"
                            dismissible
                            meter={{
                                label: t("Συμβόλαια στο δωρεάν πλάνο", "Policies on the free plan"),
                                used: activePolicies.length,
                                limit: FREE_POLICY_LIMIT,
                                hint: t(
                                    "Το Plus έχει χώρο για έως 10 συμβόλαια, το Pro απεριόριστα.",
                                    "Plus fits up to 10 policies, Pro is unlimited."
                                ),
                            }}
                        />
                    </div>
                )}

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <Link
                        href="/wallet"
                        className="pw-card p-5"
                    >
                        <p className="pw-kicker">
                            {t("Ενεργά συμβόλαια", "Active policies")}
                        </p>
                        <div className="mt-3 flex items-center justify-between">
                            <p className="text-4xl font-semibold text-black dark:text-white">{activePolicies.length}</p>
                            <Wallet className="h-6 w-6 text-primary dark:text-mint" />
                        </div>
                    </Link>

                    <Link
                        href="/coverage-insights"
                        className="pw-card p-5"
                    >
                        <p className="pw-kicker">
                            {t("Βαθμολογία προστασίας", "Protection score")}
                        </p>
                        <div className="mt-3 flex items-center gap-4">
                            <div className="relative h-14 w-14">
                                <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
                                    <path d="M18 2 a 16 16 0 1 1 0 32 a 16 16 0 1 1 0 -32" fill="none" className="stroke-black/10 dark:stroke-white/15" strokeWidth="3" />
                                    <path
                                        d="M18 2 a 16 16 0 1 1 0 32 a 16 16 0 1 1 0 -32"
                                        fill="none"
                                        className={healthScore >= 70 ? "stroke-primary dark:stroke-mint" : healthScore >= 40 ? "stroke-amber-500" : "stroke-red-500"}
                                        strokeWidth="3"
                                        strokeDasharray={`${healthScore}, 100`}
                                    />
                                </svg>
                                <span className="absolute inset-0 grid place-items-center text-xs font-semibold text-black dark:text-white">
                                    {healthScore}
                                </span>
                            </div>
                            <div>
                                <p className="text-sm text-black/80 dark:text-white/80 font-medium">
                                    {healthScore >= 70
                                        ? t("Καλή κάλυψη", "Good coverage")
                                        : healthScore >= 40
                                            ? t("Χρειάζεται βελτίωση", "Needs improvement")
                                            : t("Χρειάζεται προσοχή", "Needs attention")}
                                </p>
                                {openGapCount > 0 && (
                                    <p className="text-xs text-black/55 dark:text-white/60 mt-0.5">
                                        {openGapCount} {t("κενά κάλυψης", "coverage gaps")}
                                    </p>
                                )}
                            </div>
                        </div>
                    </Link>

                    {/* Portfolio Summary */}
                    {totalAnnualPremium > 0 && (
                        <div className="pw-card p-5 lg:col-span-3">
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
                                                    <LobIcon className="h-3.5 w-3.5 text-primary dark:text-mint" />
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

                    {/* Trigger G: multi-insurer portfolio insight for free tier */}
                    {isFreeTier && insurerCount >= 2 && (
                        <UpgradeTriggerCard
                            featureKey="multi_insurer_insights"
                            triggerSource="home_multi_insurer"
                            returnTo="/coverage-insights"
                            dismissible
                            className="lg:col-span-3"
                        />
                    )}

                    <div className="pw-card p-5">
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
                                <div className="flex items-start gap-3 rounded-xl border border-dashed border-black/10 bg-black/[0.02] p-3.5 dark:border-white/15 dark:bg-white/[0.03]">
                                    <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-[10px] bg-primary-soft dark:bg-primary/15">
                                        <CalendarClock className="h-4 w-4 text-primary dark:text-mint" />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        {policies.length === 0 ? (
                                            <>
                                                <p className="text-sm font-semibold text-black/75 dark:text-white/85">
                                                    {t("Παρακολουθούμε τις λήξεις για εσάς", "We track your expirations for you")}
                                                </p>
                                                <p className="mt-0.5 text-xs text-black/55 dark:text-white/65">
                                                    {t("Προσθέστε συμβόλαια και θα σας ειδοποιούμε 90 ημέρες πριν από κάθε ανανέωση.", "Add policies and we will alert you 90 days before every renewal.")}
                                                </p>
                                                <Link
                                                    href="/wallet/add"
                                                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline dark:text-mint"
                                                >
                                                    {t("Προσθήκη συμβολαίου", "Add a policy")}
                                                    <ArrowRight className="h-3 w-3" />
                                                </Link>
                                            </>
                                        ) : (
                                            <>
                                                <p className="text-sm font-semibold text-black/75 dark:text-white/85">
                                                    {t("Καμία λήξη τους επόμενους 6 μήνες", "No expirations in the next 6 months")}
                                                </p>
                                                <p className="mt-0.5 text-xs text-black/55 dark:text-white/65">
                                                    {t("Θα σας ειδοποιήσουμε εγκαίρως πριν από κάθε ανανέωση.", "We will alert you well before every renewal.")}
                                                </p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {upcomingRenewals.slice(0, 6).map((policy) => {
                                        const { icon: PolicyIcon, label } = getLineOfBusinessMeta(policy.lineOfBusiness)
                                        const premiumLabel = formatCurrencyValue(policy.premiumAmount, policy.premiumCurrency || "EUR")
                                        const days = daysUntil(policy.endDate)
                                        const urgencyColor = days <= 30 ? "bg-rose-500" : days <= 89 ? "bg-amber-500" : "bg-primary"
                                        const urgencyText = days <= 30
                                            ? "text-rose-700 dark:text-rose-300"
                                            : days <= 89
                                                ? "text-amber-700 dark:text-amber-300"
                                                : "text-primary dark:text-mint dark:text-primary dark:text-mint"

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
                            {/* Trigger D: smart renewal reminders teaser for free tier */}
                            {isFreeTier && upcomingRenewals.length > 0 && (
                                <UpgradeTriggerCard
                                    featureKey="advanced_renewal_reminders"
                                    triggerSource="home_renewals"
                                    returnTo="/home"
                                    variant="inline"
                                    className="mt-3"
                                />
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <Link
                        href="/coverage-insights"
                        className="pw-card p-5"
                    >
                        <p className="pw-kicker">
                            {t("Ανάλυση AI", "AI Analysis")}
                        </p>
                        <div className="mt-3 flex items-start gap-3">
                            <Sparkles className="mt-0.5 h-5 w-5 text-primary dark:text-mint" />
                            <div className="flex-1">
                                <p className="text-sm text-black/80 dark:text-white/80">
                                    {openGapCount > 0
                                        ? t(`Εντοπίστηκαν ${openGapCount} σημεία που αξίζουν έλεγχο.`, `${openGapCount} coverage points need review.`)
                                        : t("Η κάλυψή σας φαίνεται σταθερή σήμερα.", "Your coverage looks stable today.")}
                                </p>
                                {openGapCount > 0 && (
                                    <p className="mt-1.5 text-xs font-semibold text-primary dark:text-mint">
                                        {t("Δείτε λεπτομέρειες →", "View details →")}
                                    </p>
                                )}
                            </div>
                        </div>
                    </Link>

                    <Link
                        href="/wallet/add"
                        className="pw-card p-5"
                    >
                        <p className="pw-kicker">
                            {t("Γρήγορο Upload", "Quick upload")}
                        </p>
                        <div className="mt-3 flex items-center gap-3">
                            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-white dark:text-[#1A2420]">
                                <Upload className="h-5 w-5" />
                            </div>
                            <p className="text-sm text-black/80 dark:text-white/80">
                                {t("Προσθέστε νέο συμβόλαιο", "Add a new policy")}
                            </p>
                        </div>
                    </Link>

                    <div className="pw-card p-5">
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
                        className="pw-card p-5"
                    >
                        <p className="pw-kicker">
                            {t("Κατάσταση συμβούλου", "Agent link status")}
                        </p>
                        <div className="mt-3 flex items-center gap-3">
                            <span
                                className={`inline-block h-2.5 w-2.5 rounded-full ${
                                    customerRelationship ? "bg-primary" : "bg-black/30 dark:bg-white/30"
                                }`}
                            />
                            <p className="text-sm text-black/80 dark:text-white/80">
                                {customerRelationship
                                    ? t(`Συνδεδεμένος: ${customerRelationship.agent.name || customerRelationship.agent.email}`, `Connected: ${customerRelationship.agent.name || customerRelationship.agent.email}`)
                                    : t("Δεν υπάρχει σύνδεση συμβούλου.", "No agent connected yet.")}
                            </p>
                        </div>
                    </Link>

                    <div className="pw-card p-5">
                        <p className="pw-kicker">
                            {t("Υπενθύμιση check-up", "Health check-up reminder")}
                        </p>
                        <div className="mt-3 flex items-start gap-3">
                            <HeartPulse className="mt-0.5 h-5 w-5 text-primary dark:text-mint" />
                            <p className="text-sm text-black/80 dark:text-white/80">
                                {hasHealthPolicy
                                    ? t("Το ετήσιο check-up σας είναι διαθέσιμο.", "Your annual check-up benefit is available.")
                                    : t("Προσθέστε ασφάλεια υγείας για προληπτικές υπενθυμίσεις.", "Add a health policy to unlock preventive reminders.")}
                            </p>
                        </div>
                    </div>

                    <Link
                        href="/coverage-insights"
                        className="pw-card p-5"
                    >
                        <p className="pw-kicker">{t("Ευκαιρίες εξοικονόμησης", "Savings opportunities")}</p>
                        <div className="mt-3 flex items-center justify-between">
                            <p className="text-sm text-black/80 dark:text-white/80">
                                {savingsEstimate > 0
                                    ? t(`Δυνατότητα εξοικονόμησης ${formatCurrencyValue(savingsEstimate)}/έτος`, `Potential savings ${formatCurrencyValue(savingsEstimate)}/year`)
                                    : t("Δεν υπάρχουν ευκαιρίες εξοικονόμησης αυτή τη στιγμή.", "No immediate savings opportunities today.")}
                            </p>
                            {savingsEstimate > 0 && (
                                <span className="rounded-full bg-primary/15 px-2 py-1 text-xs font-semibold text-primary dark:text-mint">
                                    {formatCurrencyValue(savingsEstimate)}
                                </span>
                            )}
                        </div>
                    </Link>
                </div>

                <div className="mt-4">
                    <Link
                        href="/help"
                        className="pw-card flex items-center justify-between px-5 py-3.5"
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
                className="fixed bottom-24 left-1/2 z-30 grid h-14 w-14 -translate-x-1/2 place-items-center rounded-2xl bg-primary text-white dark:text-[#1A2420] shadow-xl transition hover:bg-primary-hover lg:bottom-6 lg:left-auto lg:right-6 lg:translate-x-0"
                aria-label={t("Γρήγορο upload", "Quick upload")}
            >
                <Upload className="h-6 w-6" />
            </Link>

        </div>
    )
}




