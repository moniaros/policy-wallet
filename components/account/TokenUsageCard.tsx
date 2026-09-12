"use client"

import { useState, useEffect } from "react"
import type { PlanTier } from "@/types/subscription-entitlements"
import { TOKEN_PACKAGES as SHARED_TOKEN_PACKAGES } from "@/lib/billing/token-packages"
import { formatEur } from "@/lib/pricing/pricing-view-model"
import { trackJourneyEvent } from "@/lib/journey/funnel"
import { UpgradeTriggerCard } from "@/components/monetization/UpgradeTriggerCard"
import { CardHead } from "@/components/dashboard/home/CardHead"
import { Coins } from "lucide-react"

interface TokenUsageData {
    tier: PlanTier
    subscription: {
        monthly_limit: number
        tokens_used: number
        tokens_remaining: number
        usage_percent: number
        cost_eur: number
    }
    purchased: {
        total_purchased: number
        total_used: number
        remaining: number
    }
}

const TOKEN_PACKAGE_LIST = Object.entries(SHARED_TOKEN_PACKAGES).map(([key, pkg]) => ({
    key,
    tokens: pkg.tokens,
    price: formatEur(pkg.priceEur),
    label: pkg.tokens >= 1_000_000 ? `${pkg.tokens / 1_000_000}M` : `${pkg.tokens / 1_000}K`,
    popular: "popular" in pkg && Boolean((pkg as { popular?: boolean }).popular),
}))

function formatTokens(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${Math.round(n / 1_000)}K`
    return String(n)
}

interface Props {
    language?: "en" | "el"
    className?: string
}

export function TokenUsageCard({ language = "el", className = "" }: Props) {
    const [data, setData] = useState<TokenUsageData | null>(null)
    const [loading, setLoading] = useState(true)
    const [purchasing, setPurchasing] = useState<string | null>(null)
    const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null)
    const [purchaseError, setPurchaseError] = useState<string | null>(null)
    const [showPackages, setShowPackages] = useState(false)

    const I18N = {
        el: {
            title: "Χρήση tokens AI",
            monthlyUsage: "Μηνιαία χρήση",
            extraTokens: "Επιπλέον tokens",
            buyExtra: "Αγορά επιπλέον tokens",
            freeTierNote: "Αναβαθμίστε για αγορά επιπλέον tokens",
            mostPopular: "Πιο δημοφιλές",
            cancel: "Ακύρωση",
            remaining: "διαθέσιμα",
            used: "χρησιμοποιήθηκαν",
            purchaseFailed: "Σφάλμα κατά την αγορά. Δοκιμάστε ξανά.",
        },
        en: {
            title: "AI Token Usage",
            monthlyUsage: "Monthly Usage",
            extraTokens: "Extra Tokens",
            buyExtra: "Buy Extra Tokens",
            freeTierNote: "Upgrade to purchase extra tokens",
            mostPopular: "Most Popular",
            cancel: "Cancel",
            remaining: "remaining",
            used: "used",
            purchaseFailed: "Purchase failed. Please try again.",
        },
    } as const
    const i18n = I18N[language === "el" ? "el" : "en"]

    useEffect(() => {
        fetch("/api/v1/tokens/usage")
            .then((r) => r.json())
            .then((json) => setData(json.data ?? null))
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    async function handlePurchase(pkgKey: string) {
        setPurchasing(pkgKey)
        setPurchaseError(null)
        setPurchaseSuccess(null)

        trackJourneyEvent("checkout_started", {
            trigger_source: "token_usage_card",
            feature_requested: "token_topup",
            locale: language,
        })

        try {
            const res = await fetch("/api/v1/tokens/purchase", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ package: pkgKey, returnTo: "/account" }),
            })
            const json = await res.json()
            const checkoutUrl = json?.data?.checkout_url || json?.checkout_url

            if (!res.ok || !checkoutUrl) {
                setPurchaseError(json.message || i18n.purchaseFailed)
                return
            }

            // Hosted Stripe Checkout completes the payment; /upgrade/success
            // credits the tokens on return.
            window.location.href = checkoutUrl
        } catch {
            setPurchaseError(i18n.purchaseFailed)
        } finally {
            setPurchasing(null)
        }
    }

    if (loading) {
        return (
            <div className={`pw-card pw-pad ${className}`}>
                <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-muted rounded w-1/2" />
                    <div className="h-3 bg-muted rounded w-full" />
                    <div className="h-8 bg-muted rounded-full" />
                </div>
            </div>
        )
    }

    if (!data) return null

    const { tier, subscription, purchased } = data
    const isPaid = tier !== "free"

    const usagePct = Math.min(subscription.usage_percent, 100)
    const barColor =
        usagePct >= 90
            ? "bg-red-600"
            : usagePct >= 75
                ? "bg-amber-500"
                : "bg-primary"

    return (
        <div className={`pw-card pw-pad space-y-5 ${className}`}>
            {/* The one card head, with the tier as its meta. */}
            <CardHead
                icon={Coins}
                title={i18n.title}
                as="h3"
                meta={
                    <span className="rounded-full bg-muted px-2 py-0.5 text-caption font-semibold text-muted-foreground">
                        {tier.charAt(0).toUpperCase() + tier.slice(1)}
                    </span>
                }
            />

            {/* Monthly subscription usage */}
            <div className="space-y-2">
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground font-medium">{i18n.monthlyUsage}</span>
                    <span className="font-semibold tabular-nums text-foreground">
                        {formatTokens(subscription.tokens_used)} / {formatTokens(subscription.monthly_limit)}
                    </span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                        style={{ width: `${usagePct}%` }}
                    />
                </div>
                <p className="text-right text-caption text-muted-foreground">
                    {formatTokens(subscription.tokens_remaining)} {i18n.remaining}
                </p>
            </div>

            {/* Purchased token balance */}
            {/* A fact cell on a sub-card — words over the number — not a
                fourth plane: the mint box with a green hairline was the one
                surface in the app outside the three-plane ladder. */}
            {isPaid && (
                <div className="pw-subcard p-3">
                    <p className="text-caption leading-snug text-muted-foreground">{i18n.extraTokens}</p>
                    <p className="mt-1 text-title font-semibold leading-none tracking-tight tabular-nums text-foreground">
                        {formatTokens(purchased.remaining)}
                    </p>
                    {purchased.total_used > 0 && (
                        <p className="mt-1.5 text-caption text-muted-foreground">
                            {formatTokens(purchased.total_used)} {i18n.used}
                        </p>
                    )}
                </div>
            )}

            {/* Success/Error messages */}
            {purchaseSuccess && (
                <p className="pw-subcard p-3 text-sm text-status-success">
                    {purchaseSuccess}
                </p>
            )}
            {purchaseError && (
                <p className="rounded-[10px] bg-status-danger-tint p-3 text-sm text-status-danger">
                    {purchaseError}
                </p>
            )}

            {/* Token package selector */}
            {showPackages && isPaid && (
                <div className="space-y-2">
                    {TOKEN_PACKAGE_LIST.map((pkg) => (
                        <button
                            key={pkg.key}
                            onClick={() => handlePurchase(pkg.key)}
                            disabled={purchasing !== null}
                            className="pw-subcard flex w-full cursor-pointer items-center justify-between px-4 py-3 text-sm text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <div className="flex items-center gap-3">
                                <span className="font-semibold">{pkg.label}</span>
                                {pkg.popular && (
                                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary-soft dark:bg-primary/15 text-primary dark:text-mint font-semibold">
                                        {i18n.mostPopular}
                                    </span>
                                )}
                            </div>
                            <span className="font-semibold tabular-nums">
                                {purchasing === pkg.key ? "..." : pkg.price}
                            </span>
                        </button>
                    ))}
                    <button
                        onClick={() => setShowPackages(false)}
                        className="pw-soft-button mt-1 cursor-pointer !text-caption"
                    >
                        {i18n.cancel}
                    </button>
                </div>
            )}

            {/* CTA */}
            {!showPackages && (
                <>
                    {isPaid ? (
                        <button
                            type="button"
                            onClick={() => setShowPackages(true)}
                            className="pw-primary-button pw-btn-sm cursor-pointer"
                        >
                            {i18n.buyExtra}
                        </button>
                    ) : (
                        <UpgradeTriggerCard
                            featureKey="token_topup"
                            triggerSource="token_usage_card"
                            returnTo="/account"
                            variant="inline"
                        />
                    )}
                </>
            )}
        </div>
    )
}

export default TokenUsageCard
