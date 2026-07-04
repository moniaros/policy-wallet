"use client"

import { useState, useEffect } from "react"
import type { PlanTier } from "@/types/subscription-entitlements"
import { TOKEN_PACKAGES as SHARED_TOKEN_PACKAGES } from "@/lib/billing/token-packages"

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
    price: `€${pkg.priceEur.toFixed(2)}`,
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

export function TokenUsageCard({ language = "en", className = "" }: Props) {
    const [data, setData] = useState<TokenUsageData | null>(null)
    const [loading, setLoading] = useState(true)
    const [purchasing, setPurchasing] = useState<string | null>(null)
    const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null)
    const [purchaseError, setPurchaseError] = useState<string | null>(null)
    const [showPackages, setShowPackages] = useState(false)

    const I18N = {
        el: {
            title: "Χρήση AI Tokens",
            monthlyUsage: "Μηνιαία Χρήση",
            extraTokens: "Επιπλέον Tokens",
            buyExtra: "Αγορά Επιπλέον Tokens",
            freeTierNote: "Αναβαθμίστε για αγορά επιπλέον tokens",
            mostPopular: "Πιο Δημοφιλές",
            cancel: "Ακύρωση",
            remaining: "διαθέσιμα",
            used: "χρησιμοποιήθηκαν",
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

        try {
            const res = await fetch("/api/v1/tokens/purchase", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ package: pkgKey }),
            })
            const json = await res.json()

            if (!res.ok) {
                setPurchaseError(json.message || "Purchase failed")
                return
            }

            // In a real app you'd open a Stripe Payment Element here.
            // For now, show success state indicating the payment intent was created.
            setPurchaseSuccess(
                language === "el"
                    ? "Αίτημα αγοράς δημιουργήθηκε. Ολοκληρώστε την πληρωμή."
                    : "Purchase initiated. Complete your payment."
            )
            setShowPackages(false)
        } catch {
            setPurchaseError(
                language === "el"
                    ? "Σφάλμα κατά την αγορά. Δοκιμάστε ξανά."
                    : "Purchase failed. Please try again."
            )
        } finally {
            setPurchasing(null)
        }
    }

    if (loading) {
        return (
            <div className={`arc-card p-6 ${className}`}>
                <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-full" />
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
                ? "bg-orange-500"
                : "bg-blue-600"

    return (
        <div className={`arc-card p-6 space-y-5 ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-base font-bold arc-text">{i18n.title}</h3>
                <span className="text-xs font-semibold uppercase tracking-wider arc-text-muted">
                    {tier.toUpperCase()}
                </span>
            </div>

            {/* Monthly subscription usage */}
            <div className="space-y-2">
                <div className="flex justify-between text-sm">
                    <span className="arc-text-muted font-medium">{i18n.monthlyUsage}</span>
                    <span className="arc-text font-bold tabular-nums">
                        {formatTokens(subscription.tokens_used)} / {formatTokens(subscription.monthly_limit)}
                    </span>
                </div>
                <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                        style={{ width: `${usagePct}%` }}
                    />
                </div>
                <p className="text-xs arc-text-muted text-right">
                    {formatTokens(subscription.tokens_remaining)} {i18n.remaining}
                </p>
            </div>

            {/* Purchased token balance */}
            {isPaid && (
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/40">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                            {i18n.extraTokens}
                        </span>
                        <span className="text-lg font-black text-blue-600 dark:text-blue-400 tabular-nums">
                            {formatTokens(purchased.remaining)}
                        </span>
                    </div>
                    {purchased.total_used > 0 && (
                        <p className="text-xs text-blue-700/70 dark:text-blue-400/60 mt-0.5">
                            {formatTokens(purchased.total_used)} {i18n.used}
                        </p>
                    )}
                </div>
            )}

            {/* Success/Error messages */}
            {purchaseSuccess && (
                <p className="text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 p-3 rounded-lg border border-green-200/50 dark:border-green-800/40">
                    {purchaseSuccess}
                </p>
            )}
            {purchaseError && (
                <p className="text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 p-3 rounded-lg border border-red-200/50 dark:border-red-800/40">
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
                            className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors text-sm arc-text disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <div className="flex items-center gap-3">
                                <span className="font-bold">{pkg.label}</span>
                                {pkg.popular && (
                                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-semibold">
                                        {i18n.mostPopular}
                                    </span>
                                )}
                            </div>
                            <span className="font-bold tabular-nums">
                                {purchasing === pkg.key ? "..." : pkg.price}
                            </span>
                        </button>
                    ))}
                    <button
                        onClick={() => setShowPackages(false)}
                        className="w-full text-sm arc-text-muted hover:arc-text mt-1 py-1 transition-colors"
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
                            onClick={() => setShowPackages(true)}
                            className="arc-btn arc-btn-primary w-full text-sm"
                        >
                            {i18n.buyExtra}
                        </button>
                    ) : (
                        <p className="text-xs arc-text-muted text-center">{i18n.freeTierNote}</p>
                    )}
                </>
            )}
        </div>
    )
}

export default TokenUsageCard
