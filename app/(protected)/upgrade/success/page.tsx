export const runtime = 'nodejs'

import Link from "next/link"
import { CheckCircle2, ShieldCheck } from "lucide-react"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { stripe } from "@/lib/stripe"
import { fulfillReportUnlockSession, fulfillTokenPurchaseSession, handleSubscriptionSuccess, sanitizeReturnPath } from "@/lib/billing"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"
import { FEATURE_GATES, getUpgradeCopy, type FeatureKey } from "@/lib/monetization"
import { UpgradeSuccessAnalytics } from "@/components/monetization/UpgradeSuccessAnalytics"

/**
 * Post-checkout landing. Verifies the Stripe session server-side and
 * activates the subscription immediately (idempotent with the webhook —
 * whichever fires first wins), then deep-links back to the feature the
 * user upgraded from. This page is the fix for the old dead-end
 * success_url (/wallet?session_id=… consumed by nothing).
 */

const COPY = {
    title: { el: "Η αναβάθμιση ολοκληρώθηκε", en: "Upgrade complete" },
    body: {
        el: "Το πλάνο σας είναι ενεργό. Ξεκλειδώσατε πλήρη ανάλυση, περισσότερα συμβόλαια και απεριόριστες ερωτήσεις AI.",
        en: "Your plan is active. You unlocked full analysis, more policies and unlimited AI questions.",
    },
    pendingTitle: { el: "Η πληρωμή επεξεργάζεται", en: "Payment processing" },
    pendingBody: {
        el: "Η συνδρομή σας ενεργοποιείται. Αν δεν εμφανιστεί σε λίγα λεπτά, επικοινωνήστε μαζί μας.",
        en: "Your subscription is being activated. If it doesn't appear within a few minutes, contact us.",
    },
    cta: { el: "Συνέχεια", en: "Continue" },
    ctaHome: { el: "Μετάβαση στο πορτοφόλι", en: "Go to wallet" },
    trust: {
        el: "Ασφαλής πληρωμή με Stripe · Ακύρωση ανά πάσα στιγμή",
        en: "Secure payment with Stripe · Cancel anytime",
    },
    tokensTitle: { el: "Η αγορά ολοκληρώθηκε", en: "Purchase complete" },
    tokensBody: {
        el: "Τα επιπλέον tokens προστέθηκαν στον λογαριασμό σας και είναι άμεσα διαθέσιμα.",
        en: "Your extra tokens were added to your account and are available immediately.",
    },
    reportTitle: { el: "Η αναφορά ξεκλειδώθηκε", en: "Report unlocked" },
    reportBody: {
        el: "Όλα τα κενά κάλυψης του συμβολαίου σας είναι πλέον ορατά, μαζί με τις πλήρεις εξηγήσεις και προτάσεις.",
        en: "All coverage gaps of your policy are now visible, with full explanations and recommendations.",
    },
} as const

const pick = (pair: { el: string; en: string }, language: string) =>
    language === "el" ? pair.el : pair.en

export default async function UpgradeSuccessPage({
    searchParams,
}: {
    searchParams: Promise<{ session_id?: string; return?: string }>
}) {
    const { session_id: sessionId, return: returnParam } = await searchParams
    const { dbUser } = await getAuthenticatedUser()
    const language = dbUser.preferredLanguage === "en" ? "en" : "el"
    const returnPath = sanitizeReturnPath(returnParam) || "/wallet"

    let activated = false
    let tokenPurchase = false
    let reportUnlock = false
    // Gate the user upgraded from (checkout metadata) — drives the per-feature
    // success copy and the client-side funnel events.
    let featureKey: FeatureKey | null = null
    let purchasedPlan: string | undefined
    let purchasedPeriod: "monthly" | "annual" | undefined
    if (sessionId) {
        try {
            const session = await stripe.checkout.sessions.retrieve(sessionId)
            const paid =
                session.payment_status === "paid" ||
                session.payment_status === "no_payment_required" // trials
            const belongsToUser = session.metadata?.userId === dbUser.id

            if (paid && belongsToUser && session.metadata?.type === "report_unlock" && session.metadata?.policyId) {
                // One-off €3 gap-report unlock (mode: payment)
                await fulfillReportUnlockSession(session.id, dbUser.id, session.metadata.policyId)
                activated = true
                reportUnlock = true
            } else if (paid && belongsToUser && session.metadata?.tokensPurchased) {
                // One-off token-pack checkout (mode: payment)
                await fulfillTokenPurchaseSession(
                    session.id,
                    dbUser.id,
                    parseInt(session.metadata.tokensPurchased, 10)
                )
                activated = true
                tokenPurchase = true
            } else if (paid && belongsToUser && session.metadata?.planId) {
                await handleSubscriptionSuccess(
                    dbUser.id,
                    session.metadata.planId,
                    (session.subscription as string) || ""
                )
                activated = true
                purchasedPlan = session.metadata.planId
                purchasedPeriod = session.metadata.billingPeriod === "annual" ? "annual" : "monthly"
                const metaFeature = session.metadata.featureKey
                if (metaFeature && metaFeature in FEATURE_GATES) {
                    featureKey = metaFeature as FeatureKey
                }
            } else if (paid && !belongsToUser) {
                logger("warn", "Upgrade success page: session user mismatch", {
                    sessionId,
                    userId: dbUser.id,
                })
            }
        } catch (error) {
            logger("error", "Upgrade success page: session verify failed", {
                sessionId,
                error: error instanceof Error ? error.message : String(error),
            })
        }
    }

    // Fall back to checking the DB directly (webhook may have beaten us)
    if (!activated && !tokenPurchase && !reportUnlock) {
        const sub = await db.subscription.findFirst({
            where: { userId: dbUser.id, status: "active", plan: { price: { gt: 0 } } },
            orderBy: { createdAt: "desc" },
            select: { id: true },
        })
        activated = Boolean(sub)
    }

    // Per-feature success copy when we know which gate sent the user to
    // checkout; the generic subscription copy stays the fallback.
    const featureCopy = activated && featureKey ? getUpgradeCopy(featureKey, language) : null

    const bodyText = reportUnlock
        ? pick(COPY.reportBody, language)
        : tokenPurchase
            ? pick(COPY.tokensBody, language)
            : activated
                ? featureCopy?.successMessage || pick(COPY.body, language)
                : pick(COPY.pendingBody, language)

    const ctaLabel = featureCopy?.successCta
        || (returnPath === "/wallet" ? pick(COPY.ctaHome, language) : pick(COPY.cta, language))

    return (
        <div className="flex min-h-[70vh] items-center justify-center px-4">
            <div className="pw-card w-full max-w-md rounded-3xl p-8 text-center">
                <div className={`mx-auto grid h-16 w-16 place-items-center rounded-full ${activated ? "bg-primary-soft dark:bg-primary/15" : "bg-amber-100 dark:bg-amber-900/30"}`}>
                    <CheckCircle2 className={`h-8 w-8 ${activated ? "text-primary dark:text-mint" : "text-amber-600 dark:text-amber-400"}`} />
                </div>
                <h1 className="mt-5 text-2xl font-black text-black dark:text-white">
                    {reportUnlock
                        ? pick(COPY.reportTitle, language)
                        : tokenPurchase
                            ? pick(COPY.tokensTitle, language)
                            : activated
                                ? pick(COPY.title, language)
                                : pick(COPY.pendingTitle, language)}
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-black/60 dark:text-white/65">
                    {bodyText}
                </p>
                <Link
                    href={returnPath}
                    className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-primary py-3.5 text-sm font-bold uppercase tracking-widest text-white shadow-xl shadow-primary/25 transition-all hover:bg-primary-hover dark:text-[#1A2420]"
                >
                    {ctaLabel}
                </Link>
                <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-black/45 dark:text-white/50">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary dark:text-mint" />
                    {pick(COPY.trust, language)}
                </p>
                {activated && !tokenPurchase && !reportUnlock && (
                    <UpgradeSuccessAnalytics
                        plan={purchasedPlan}
                        featureKey={featureKey || undefined}
                        billingPeriod={purchasedPeriod}
                    />
                )}
            </div>
        </div>
    )
}
