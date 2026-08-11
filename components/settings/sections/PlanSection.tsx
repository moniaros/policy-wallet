"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Check, ExternalLink, Loader2, Smartphone } from "lucide-react"
import { toast } from "sonner"
import { useLanguage } from "@/contexts/LanguageContext"
import { SettingsSection, SettingsRowList } from "@/components/settings/SettingsSection"
import { SettingRow } from "@/components/settings/SettingRow"
import { UsageMeter } from "@/components/monetization/UsageMeter"
import { TokenUsageCard } from "@/components/account/TokenUsageCard"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { Alert } from "@/components/ui/Alert"
import {
    cancelSubscription,
    createBillingPortalSession,
    upgradeSubscription,
} from "@/app/(protected)/account/actions"
import { trackJourneyEvent } from "@/lib/journey/funnel"
import type { PlanData } from "@/app/(protected)/account/data"
import type { EntitlementLimits } from "@/types/subscription-entitlements"

/**
 * Plan, usage and billing.
 *
 * Replaces the Overview and Billing tabs. Both of them rendered tables that
 * cannot fill: `Invoice` and `PaymentMethod` rows are written nowhere outside
 * the seed, so the invoice table and the saved-card panel were permanently
 * empty, and "add a payment method" led nowhere. Invoices and cards genuinely
 * live in the payment provider's portal, and that is now what this says.
 */

type FeatureKey = keyof typeof FEATURE_ORDER

const FEATURE_ORDER = {
    interactiveQA: 1,
    portfolioGapView: 2,
    advancedAnalytics: 3,
    agentCollaboration: 4,
    analysisComparison: 5,
    savingsReportExport: 6,
    priorityQueue: 7,
} as const

export function PlanSection({ data }: { data: PlanData }) {
    const { t, language } = useLanguage()
    const router = useRouter()
    const copy = t.settings.plan

    const [cancelOpen, setCancelOpen] = useState(false)
    const [busy, setBusy] = useState<null | "portal" | "annual" | "upgrade">(null)

    const locale = language === "el" ? "el-GR" : "en-GB"
    const formatDate = (iso: string) =>
        new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })
    const formatPrice = (eur: number) =>
        new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(eur)
    const formatCount = (value: number) => new Intl.NumberFormat(locale).format(value)

    // The store owns a RevenueCat subscription — we can neither change nor
    // cancel it, and saying otherwise would send the customer in a circle.
    const storeManaged = data.subscription?.provider === "revenue_cat"
    const isAnnual = data.subscription?.billingPeriod === "annual"
    const willRenew = Boolean(data.subscription?.autoRenew)

    const featureList = (limits: EntitlementLimits): string[] => {
        const lines: string[] = []

        if (limits.policies === null) lines.push(copy.features.policiesUnlimited)
        else if (limits.policies === 1) lines.push(copy.features.policiesOne)
        else lines.push(`${formatCount(limits.policies)} ${copy.features.policiesMany}`)

        if (limits.aiAnalysisPerMonth === null) lines.push(copy.features.analysesUnlimited)
        if (limits.notifications) lines.push(copy.features.notifications)

        for (const key of Object.keys(FEATURE_ORDER) as FeatureKey[]) {
            if (limits[key]) lines.push(copy.features[key])
        }
        return lines
    }

    const included = featureList(data.limits)

    const handleUpgrade = async () => {
        if (!data.upgradeTarget) return
        setBusy("upgrade")
        trackJourneyEvent("plan_selected", {
            plan: data.upgradeTarget.id,
            billing_period: "monthly",
            screen: "settings_plan",
        })
        const result = await upgradeSubscription(data.upgradeTarget.id, "monthly", "/account/plan")
        if ("url" in result && result.url) {
            window.location.href = result.url
            return
        }
        setBusy(null)
        toast.error(("error" in result && result.error) || t.errors.somethingWentWrong)
    }

    const handleAnnual = async () => {
        if (!data.plan) return
        setBusy("annual")
        trackJourneyEvent("billing_period_selected", {
            plan: data.plan.id,
            billing_period: "annual",
            screen: "settings_plan",
        })
        const result = await upgradeSubscription(data.plan.id, "annual", "/account/plan")
        if ("url" in result && result.url) {
            window.location.href = result.url
            return
        }
        setBusy(null)
        toast.error(("error" in result && result.error) || t.errors.somethingWentWrong)
    }

    const handlePortal = async () => {
        setBusy("portal")
        const result = await createBillingPortalSession()
        if ("url" in result && result.url) {
            window.location.href = result.url
            return
        }
        setBusy(null)
        toast.error(copy.portalFailed)
    }

    const handleCancel = async () => {
        setCancelOpen(false)
        const result = await cancelSubscription()
        if ("error" in result && result.error) {
            // Stripe refused — never report a cancellation that did not happen.
            toast.error(result.error)
            return
        }
        toast.success(t.settings.autoRenewalDisabled)
        router.refresh()
    }

    return (
        <>
            <SettingsSection title={copy.currentTitle} description={copy.currentDesc}>
                <div className="rounded-xl border border-black/8 bg-black/[0.03] p-4 dark:border-white/10 dark:bg-white/[0.03]">
                    <p className="text-h3 font-semibold tracking-tight text-black dark:text-white">
                        {data.plan?.displayName ?? copy.free}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {data.isPaid && data.plan
                            ? `${formatPrice(isAnnual ? data.plan.annualEur : data.plan.monthlyEur)} ${
                                  isAnnual ? copy.perYear : copy.perMonth
                              }`
                            : copy.freeForever}
                    </p>

                    {/* A cancelled subscription must never read "renews on": the
                        date is the same, the promise is the opposite. Gated on
                        isPaid because a free account carries a placeholder
                        subscription row with a period end. */}
                    {data.subscription && data.isPaid && (
                        <p className="mt-3 text-caption text-muted-foreground">
                            {willRenew ? (
                                <>
                                    {t.billing.renewsOn} {formatDate(data.subscription.currentPeriodEnd)}
                                </>
                            ) : (
                                <>
                                    {t.billing.endsOn} {formatDate(data.subscription.currentPeriodEnd)} —{" "}
                                    {copy.endsOnNote}
                                </>
                            )}
                        </p>
                    )}
                </div>

                <h3 className="pw-kicker mt-5">{copy.includedTitle}</h3>
                <ul className="mt-2 space-y-2">
                    {included.map((line) => (
                        <li key={line} className="flex items-start gap-2 text-sm text-black/80 dark:text-white/80">
                            <Check
                                aria-hidden="true"
                                className="mt-0.5 h-4 w-4 shrink-0 text-primary dark:text-mint"
                            />
                            <span>{line}</span>
                        </li>
                    ))}
                </ul>

                {data.upgradeTarget && (
                    <div className="mt-5 rounded-xl border border-primary/25 bg-primary-soft/40 p-4 dark:border-mint/25 dark:bg-primary/10">
                        <p className="text-sm font-semibold text-black dark:text-white">
                            {copy.upgradeAddsTitle} {data.upgradeTarget.displayName}
                        </p>
                        <p className="mt-1 text-caption text-muted-foreground">
                            {formatPrice(data.upgradeTarget.monthlyEur)} {copy.perMonth} · {copy.upgradeHint}
                        </p>
                        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                            <button
                                type="button"
                                onClick={handleUpgrade}
                                disabled={busy !== null || storeManaged}
                                className="pw-primary-button pw-btn-sm disabled:opacity-60"
                            >
                                {busy === "upgrade" && (
                                    <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
                                )}
                                {copy.upgradeTo} {data.upgradeTarget.displayName}
                            </button>
                            <Link href="/upgrade" className="pw-secondary-button pw-btn-sm">
                                {copy.upgradeCta}
                            </Link>
                        </div>
                    </div>
                )}
            </SettingsSection>

            <SettingsSection title={copy.usageTitle} description={copy.usageResets}>
                <div className="space-y-5">
                    <UsageMeter
                        label={copy.storedPolicies}
                        used={data.usage.policiesStored}
                        limit={data.usage.policiesLimit}
                        unlimitedLabel={copy.analysesUnlimited}
                        hint={data.usage.policiesLimit === null ? undefined : copy.storedPoliciesHint}
                    />

                    {data.usage.analysesLimit === null ? (
                        <SettingRow
                            label={copy.analyses}
                            value={copy.analysesUnlimited}
                            hint={`${formatCount(data.usage.analysesThisMonth)} ${copy.analysesUsed}`}
                        />
                    ) : (
                        <SettingRow
                            label={copy.analyses}
                            value={copy.noPaidFeatures}
                            muted
                            hint={data.upgradeTarget ? copy.upgradeHint : undefined}
                        />
                    )}

                    {/* The token budget is the limit that actually binds on the AI
                        tier — "unlimited analyses" is true, and this is what runs
                        out first. Tiers with no allowance are not shown a meter
                        that could only ever read zero of zero. */}
                    {data.usage.hasAiBudget && (
                        <p className="text-caption leading-snug text-muted-foreground">
                            {copy.aiBudgetExhausted}
                        </p>
                    )}
                </div>
            </SettingsSection>

            {/* Own card: it loads its own live balance and sells the top-up the
                line above refers to. */}
            {data.usage.hasAiBudget && <TokenUsageCard />}

            <SettingsSection title={copy.billingTitle} description={copy.billingDesc}>
                {storeManaged ? (
                    <Alert variant="info" title={t.settings.plan.billingTitle}>
                        <span className="inline-flex items-start gap-2">
                            <Smartphone aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                            {copy.storeManaged}
                        </span>
                    </Alert>
                ) : (
                    <SettingsRowList>
                        <SettingRow
                            label={copy.billingTitle}
                            value={data.hasBillingAccount ? undefined : copy.portalUnavailable}
                            muted={!data.hasBillingAccount}
                            action={
                                data.hasBillingAccount ? (
                                    <button
                                        type="button"
                                        onClick={handlePortal}
                                        disabled={busy !== null}
                                        className="pw-secondary-button pw-btn-sm disabled:opacity-60"
                                    >
                                        {busy === "portal" ? (
                                            <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                                        )}
                                        {copy.openPortal}
                                    </button>
                                ) : undefined
                            }
                        />

                        {data.isPaid && !isAnnual && willRenew && data.plan && (
                            <SettingRow
                                label={copy.switchToAnnual}
                                value={`${formatPrice(data.plan.annualEur)} ${copy.perYear}`}
                                hint={copy.switchToAnnualDesc}
                                action={
                                    <button
                                        type="button"
                                        onClick={handleAnnual}
                                        disabled={busy !== null}
                                        className="pw-secondary-button pw-btn-sm disabled:opacity-60"
                                    >
                                        {busy === "annual" && (
                                            <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
                                        )}
                                        {copy.switchToAnnual}
                                    </button>
                                }
                            />
                        )}

                        {data.isPaid && willRenew && (
                            <SettingRow
                                label={copy.cancelCta}
                                hint={copy.cancelDesc}
                                action={
                                    <button
                                        type="button"
                                        onClick={() => setCancelOpen(true)}
                                        className="pw-secondary-button pw-btn-sm border-red-500/40 text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/30"
                                    >
                                        {copy.cancelCta}
                                    </button>
                                }
                            />
                        )}
                    </SettingsRowList>
                )}
            </SettingsSection>

            <ConfirmDialog
                open={cancelOpen}
                onOpenChange={setCancelOpen}
                destructive
                title={t.billing.cancelConfirmTitle}
                description={t.billing.cancelConfirmBody}
                consequences={[copy.cancelDesc]}
                confirmLabel={t.billing.cancelConfirmCta}
                onConfirm={handleCancel}
            />
        </>
    )
}
