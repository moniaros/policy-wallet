"use client"

import { PolicyWallet } from "@/components/wallet/PolicyWallet"
import React, { useRef } from "react"
import type { Policy } from "@/components/wallet/types"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/ui/PageHeader"
import { useLanguage } from "@/contexts/LanguageContext"
import { isInForceKey, resolvePolicyStatusKey } from "@/lib/wallet/policy-status-view"
import { toast } from "sonner"
import { runPolicyAnalysis } from "@/app/(protected)/wallet/actions"
import DashboardTour from '@/components/onboarding/DashboardTour'
import { dismissTour } from '@/app/onboarding/actions'
import { BatchUploadModal } from "@/components/wallet/BatchUploadModal"
import { mapWalletErrorToMessage } from "@/lib/i18n/wallet-error"
import { DeletePolicyDialog } from "@/components/wallet/DeletePolicy"
import { PolicyComparison } from "@/components/wallet/PolicyComparison"
import { AiConsentModal } from "@/components/ui/AiConsentModal"
import { UpgradeModal } from "@/components/monetization/UpgradeModal"
import { UpgradeTriggerCard } from "@/components/monetization/UpgradeTriggerCard"
import { usePolling } from "@/hooks/usePolling"
import { getOrRegisterServiceWorker } from "@/lib/push/register"

interface PolicyWalletClientProps {
    policies: Policy[]
    user?: {
        id?: string
        name: string
        email?: string
        photoUrl?: string
        isOnline?: boolean
    }
    showTour?: boolean
    tier?: 'free' | 'plus' | 'pro'
}

export function PolicyWalletClient({ policies, user, showTour = false, tier = 'free' }: PolicyWalletClientProps) {
    const router = useRouter()
    const { t } = useLanguage()
    const previousStatusesRef = useRef<Map<string, string>>(new Map())
    const announcedRef = useRef<Set<string>>(new Set())
    const [isBatchUploadOpen, setIsBatchUploadOpen] = React.useState(false)
    const [isCompareOpen, setIsCompareOpen] = React.useState(false)
    // AI-processing consent: policy awaiting analysis while the consent modal is open
    const [consentPendingPolicyId, setConsentPendingPolicyId] = React.useState<string | null>(null)
    const [analysisUpgradeOpen, setAnalysisUpgradeOpen] = React.useState(false)
    // Policy pending deletion — drives the branded confirm dialog (replaced a
    // native confirm() that had no loading state and ignored the design system).
    const [deletePolicyId, setDeletePolicyId] = React.useState<string | null>(null)

    const runAnalysis = async (policyId: string) => {
        const toastId = toast.loading(t.toast.analysisStarting)
        const result = await runPolicyAnalysis(policyId)
        if (result.error) {
            if (result.error === "AI_CONSENT_REQUIRED") {
                toast.dismiss(toastId)
                setConsentPendingPolicyId(policyId)
                return
            }
            if (result.error === "UPGRADE_REQUIRED") {
                // In-place upgrade modal instead of the generic pricing-page
                // detour — keeps the user in context and offers annual+trial.
                toast.dismiss(toastId)
                setAnalysisUpgradeOpen(true)
                return
            }
            const friendlyError = mapWalletErrorToMessage(result.error, t, "analysis")
            toast.error(friendlyError, { id: toastId })
        } else {
            toast.success(t.toast.analysisStarted, { id: toastId })
        }
    }

    // Check if any LOB has 2+ in-force policies (comparison eligible). The stored
    // status is never recomputed, so `status === 'active'` also matched policies
    // that expired years ago — they were offered up for "comparison" as live cover.
    const comparablePolicies = React.useMemo(
        () => policies.filter((p) => isInForceKey(resolvePolicyStatusKey(p))),
        [policies]
    )
    const hasComparablePolicies = React.useMemo(() => {
        const lobCounts = new Map<string, number>()
        for (const p of comparablePolicies) {
            lobCounts.set(p.lineOfBusiness, (lobCounts.get(p.lineOfBusiness) || 0) + 1)
        }
        return [...lobCounts.values()].some(count => count >= 2)
    }, [comparablePolicies])

    const copy = t.wallet.analysisNotifications

    /**
     * Raise the "your analysis finished" notification.
     *
     * Android forbids `new Notification()` outright — Chrome there throws
     * `TypeError: Failed to construct 'Notification': Illegal constructor. Use
     * ServiceWorkerRegistration.showNotification() instead.` (Sentry
     * POLICYWALLET-11, Chrome Mobile on Android 10). So on the platform where
     * most of this product's customers actually are, we asked them to turn
     * notifications on, they granted permission, and then every completed
     * analysis threw instead of telling them. The promise was made and silently
     * broken on exactly the devices it mattered for.
     *
     * The service worker is the supported path, and it is better anyway: the
     * notification survives the tab being closed, and `sw.js` already handles
     * `notificationclick` by focusing an existing tab and navigating it rather
     * than opening a tenth copy of the app.
     *
     * The constructor stays as a fallback for desktop browsers with no service
     * worker registered, wrapped — a notification failing to appear must never
     * take out the poll that renders the wallet.
     */
    const fireBrowserNotification = (title: string, message: string, policyId: string) => {
        if (typeof window === 'undefined' || !('Notification' in window)) return
        if (Notification.permission !== 'granted') return

        const url = `/wallet/${policyId}`

        void (async () => {
            try {
                const registration = await getOrRegisterServiceWorker()
                if (registration?.showNotification) {
                    await registration.showNotification(title, {
                        body: message,
                        icon: '/icons/icon-192x192.png',
                        badge: '/icons/icon-192x192.png',
                        // One notification per policy: a poll that fires twice
                        // should replace, not stack.
                        tag: `analysis:${policyId}`,
                        data: { url },
                    })
                    return
                }

                const notification = new Notification(title, { body: message })
                notification.onclick = () => {
                    window.focus()
                    router.push(url)
                }
            } catch {
                // Every platform refuses this somewhere. The in-app toast has
                // already told them, so there is nothing worth surfacing.
            }
        })()
    }

    // The poll below calls router.refresh(), which yields a new `policies`
    // reference and re-runs this effect every 2–10s. Without this guard the
    // browser-notification prompt toast re-fired on every poll (a fresh copy
    // stacking every few seconds). Fires once per analyzing run; resets when
    // nothing is analyzing so a later upload can prompt again.
    const notifyPromptShownRef = useRef(false)

    const hasAnalyzing = policies.some((p) => p.status === 'analyzing')

    // Backoff + hidden-tab pause now live in the shared hook. This poll calls
    // router.refresh(), which re-runs the whole server tree, so polling a
    // backgrounded phone was pure waste.
    usePolling(() => router.refresh(), { enabled: hasAnalyzing })

    React.useEffect(() => {
        if (!hasAnalyzing) {
            notifyPromptShownRef.current = false
            return
        }

        if (!notifyPromptShownRef.current && 'Notification' in window && Notification.permission === 'default') {
            notifyPromptShownRef.current = true
            toast(copy.inProgress, {
                // Stable id: any residual re-trigger updates this toast in place
                // instead of stacking a new one.
                id: 'analysis-notify-prompt',
                description: copy.notifyPrompt,
                action: {
                    label: copy.notifyMe,
                    onClick: () => {
                        Notification.requestPermission().then((permission) => {
                            if (permission === 'granted') {
                                toast.success(copy.notificationsEnabled)
                            }
                        })
                    },
                },
                duration: 8000,
            })
        }

    }, [hasAnalyzing, copy.inProgress, copy.notifyPrompt, copy.notifyMe, copy.notificationsEnabled])

    React.useEffect(() => {
        const previousStatuses = previousStatusesRef.current
        const currentStatuses = new Map(policies.map((p) => [p.id, p.status]))

        for (const policy of policies) {
            const previousStatus = previousStatuses.get(policy.id)
            if (previousStatus === 'analyzing' && policy.status !== 'analyzing') {
                const key = `${policy.id}-${policy.status}`
                if (announcedRef.current.has(key)) continue
                announcedRef.current.add(key)

                const summary = `${policy.insurerName} • ${policy.policyNumber}`

                if (policy.status === 'action_needed') {
                    toast.error(copy.failed, {
                        description: copy.failedDesc,
                        action: {
                            label: copy.view,
                            onClick: () => router.push(`/wallet/${policy.id}`),
                        },
                    })
                    fireBrowserNotification(copy.failed, copy.failedDesc, policy.id)
                } else if (policy.status === 'incomplete') {
                    toast.warning(copy.incomplete, {
                        description: copy.incompleteDesc,
                        action: {
                            label: copy.view,
                            onClick: () => router.push(`/wallet/${policy.id}`),
                        },
                    })
                    fireBrowserNotification(copy.incomplete, copy.incompleteDesc, policy.id)
                } else {
                    toast.success(copy.completed, {
                        description: summary,
                        action: {
                            label: copy.view,
                            onClick: () => router.push(`/wallet/${policy.id}`),
                        },
                    })
                    fireBrowserNotification(copy.completed, summary, policy.id)
                }
            }
        }

        const disappearedAnalyzingIds = [...previousStatuses.entries()]
            .filter(([id, status]) => status === 'analyzing' && !currentStatuses.has(id))
            .map(([id]) => id)

        if (disappearedAnalyzingIds.length > 0) {
            fetch('/api/v1/notifications?limit=10')
                .then((res) => (res.ok ? res.json() : null))
                .then((data) => {
                    const notifications = data?.data?.notifications || []
                    const completion = notifications.find(
                        (n: any) =>
                            (n.event_type === 'policy_analyzed' || n.event_type === 'policy_merged') &&
                            n.related_object_type === 'policy' &&
                            n.related_object_id
                    )
                    if (!completion) return

                    const key = `notif-${completion.id}`
                    if (announcedRef.current.has(key)) return
                    announcedRef.current.add(key)

                    toast.success(completion.title || copy.completed, {
                        description: completion.message,
                        action: {
                            label: copy.view,
                            onClick: () => router.push(`/wallet/${completion.related_object_id}`),
                        },
                    })

                    fireBrowserNotification(completion.title || copy.completed, completion.message || '', completion.related_object_id)
                })
                .catch(() => {
                    // Silent fallback: status update remains visible in wallet.
                })
        }

        previousStatusesRef.current = currentStatuses
    }, [policies, router, copy.completed, copy.failed, copy.failedDesc, copy.view])

    return (
        <div className="pw-page-shell relative isolate">
            <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none pw-app-canvas" />

            <PageHeader title={user?.name ? `${t.auth.welcomeBack}, ${user.name.split(' ')[0]}!` : t.wallet.title} subtitle={t.wallet.manageTrack} />

            {hasComparablePolicies && (
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mb-4">
                    <button
                        type="button"
                        onClick={() => setIsCompareOpen(true)}
                        className="inline-flex items-center gap-2 rounded-full border border-black/15 bg-white px-4 py-2.5 text-sm font-bold text-black transition-colors hover:bg-black/5 dark:border-white/20 dark:bg-black dark:text-white dark:hover:bg-white/10 cursor-pointer"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        {t.wallet.comparePolicies}
                    </button>
                </div>
            )}

            <PolicyWallet
                policies={policies}
                user={user}
                onViewPolicy={(policyId) => router.push(`/wallet/${policyId}`)}
                onAddManually={() => router.push('/wallet/add')}
                onUploadDocument={() => router.push('/wallet/add?method=upload')}
                onBatchUpload={() => setIsBatchUploadOpen(true)}
                onShareWithAgent={(policyId) => router.push(`/wallet/${policyId}/share`)}
                onRunAnalysis={runAnalysis}
                onDeletePolicy={(policyId) => setDeletePolicyId(policyId)}
            />

            {/* The wallet's upgrade trigger. It used to live ONLY in the mobile tree
                (MyPoliciesScreen), so free users on desktop never saw one on /wallet
                at all. With one responsive tree it renders at every width. */}
            {tier === 'free' && policies.length > 0 && (
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-6">
                    <UpgradeTriggerCard
                        featureKey="full_ai_policy_analysis"
                        triggerSource="wallet_tile"
                        returnTo="/wallet"
                    />
                </div>
            )}

            <DeletePolicyDialog
                policyId={deletePolicyId ?? ''}
                open={deletePolicyId !== null}
                onOpenChange={(o) => { if (!o) setDeletePolicyId(null) }}
            />

            <BatchUploadModal
                isOpen={isBatchUploadOpen}
                onClose={() => setIsBatchUploadOpen(false)}
                onSuccess={() => {
                    setIsBatchUploadOpen(false)
                    router.refresh()
                }}
            />

            <AiConsentModal
                isOpen={consentPendingPolicyId !== null}
                onClose={() => setConsentPendingPolicyId(null)}
                onConsented={() => {
                    const policyId = consentPendingPolicyId
                    setConsentPendingPolicyId(null)
                    if (policyId) runAnalysis(policyId)
                }}
                source="wallet_policy_list"
            />

            {hasComparablePolicies && (
                <PolicyComparison
                    policies={comparablePolicies.map(p => ({
                        id: p.id,
                        policyNumber: p.policyNumber,
                        insurerName: p.insurerName,
                        lineOfBusiness: p.lineOfBusiness,
                        status: p.status,
                        startDate: p.startDate,
                        endDate: p.endDate,
                        premiumAmount: p.premiumAmount,
                        premiumCurrency: p.premiumCurrency,
                        acordData: p.acordData as any,
                    }))}
                    isOpen={isCompareOpen}
                    onClose={() => setIsCompareOpen(false)}
                />
            )}

            {showTour && <DashboardTour onComplete={() => dismissTour()} />}

            <UpgradeModal
                isOpen={analysisUpgradeOpen}
                onClose={() => setAnalysisUpgradeOpen(false)}
                featureKey="full_ai_policy_analysis"
                triggerSource="wallet_run_analysis"
                returnTo="/wallet"
            />
        </div>
    )
}
