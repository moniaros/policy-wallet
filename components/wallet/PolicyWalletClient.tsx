"use client"

import { PolicyWallet } from "@/components/wallet/PolicyWallet"
import React, { useRef } from "react"
import type { Policy } from "@/components/wallet/types"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/ui/PageHeader"
import { useLanguage } from "@/contexts/LanguageContext"
import { toast } from "sonner"
import { deletePolicy, runPolicyAnalysis } from "@/app/(protected)/wallet/actions"
import DashboardTour from '@/components/onboarding/DashboardTour'
import { dismissTour } from '@/app/onboarding/actions'
import { useIsMobile } from "@/hooks/useResponsive"
import { MobileAppShell } from "@/components/layout/MobileAppShell"

interface PolicyWalletClientProps {
    policies: Policy[]
    user?: {
        id?: string
        name: string
        email?: string
        photoUrl?: string
        isOnline?: boolean
    }
    agent?: {
        id: string
        name: string
        phone: string
        email: string
        company?: string
        photoUrl?: string
        isOnline?: boolean
    }
    showTour?: boolean
}

export function PolicyWalletClient({ policies, user, agent, showTour = false }: PolicyWalletClientProps) {
    const router = useRouter()
    const { t, language } = useLanguage()
    const isMobile = useIsMobile()
    const previousStatusesRef = useRef<Map<string, string>>(new Map())
    const announcedRef = useRef<Set<string>>(new Set())

    const copy = {
        analysisProgress: language === 'el' ? 'Η ανάλυση συμβολαίου εκτελείται' : 'Policy analysis is in progress',
        notifyPrompt: language === 'el' ? 'Θέλετε ειδοποίηση όταν ολοκληρωθεί;' : 'Would you like a notification when it completes?',
        notifyMe: language === 'el' ? 'Ειδοποίησέ με' : 'Notify me',
        notificationsEnabled: language === 'el' ? 'Οι ειδοποιήσεις ενεργοποιήθηκαν.' : 'Notifications enabled.',
        analysisComplete: language === 'el' ? 'Η ανάλυση συμβολαίου ολοκληρώθηκε' : 'Policy analysis completed',
        view: language === 'el' ? 'Προβολή' : 'View',
    }

    const fireBrowserNotification = (title: string, message: string, policyId: string) => {
        if (typeof window === 'undefined' || !('Notification' in window)) return
        if (Notification.permission !== 'granted') return

        const notification = new Notification(title, { body: message })
        notification.onclick = () => {
            window.focus()
            router.push(`/wallet/${policyId}`)
        }
    }

    React.useEffect(() => {
        const hasAnalyzing = policies.some((p) => p.status === 'analyzing')
        if (!hasAnalyzing) return

        const interval = setInterval(() => {
            router.refresh()
        }, 3000)

        if ('Notification' in window && Notification.permission === 'default') {
            toast(copy.analysisProgress, {
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

        return () => clearInterval(interval)
    }, [policies, router])

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
                toast.success(copy.analysisComplete, {
                    description: summary,
                    action: {
                        label: copy.view,
                        onClick: () => router.push(`/wallet/${policy.id}`),
                    },
                })

                fireBrowserNotification(copy.analysisComplete, summary, policy.id)
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

                    toast.success(completion.title || copy.analysisComplete, {
                        description: completion.message,
                        action: {
                            label: copy.view,
                            onClick: () => router.push(`/wallet/${completion.related_object_id}`),
                        },
                    })

                    fireBrowserNotification(completion.title || copy.analysisComplete, completion.message || '', completion.related_object_id)
                })
                .catch(() => {
                    // Silent fallback: status update remains visible in wallet.
                })
        }

        previousStatusesRef.current = currentStatuses
    }, [policies, router, copy.analysisComplete, copy.view])

    if (isMobile) {
        return (
            <MobileAppShell
                policies={policies}
                user={user as any}
                agent={agent}
            />
        )
    }

    return (
        <div className="min-h-screen bg-transparent relative isolate">
            <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 -right-20 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[100px] opacity-40 mix-blend-multiply dark:mix-blend-normal animate-blob" />
                <div className="absolute -bottom-20 -left-20 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[100px] opacity-40 mix-blend-multiply dark:mix-blend-normal animate-blob animation-delay-2000" />
                <div className="absolute top-1/3 left-1/3 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] opacity-30 animate-pulse delay-700" />
            </div>

            <PageHeader title={user?.name ? `${t.auth.welcomeBack}, ${user.name.split(' ')[0]}!` : t.wallet.title} subtitle={t.wallet.manageTrack} />

            <PolicyWallet
                policies={policies}
                user={user}
                onViewPolicy={(policyId) => router.push(`/wallet/${policyId}`)}
                onAddManually={() => router.push('/wallet/add')}
                onUploadDocument={() => router.push('/wallet/add?method=upload')}
                onShareWithAgent={(policyId) => router.push(`/wallet/${policyId}/share`)}
                onRunAnalysis={async (policyId) => {
                    const toastId = toast.loading(t.toast.analysisStarting)
                    const result = await runPolicyAnalysis(policyId)
                    if (result.error) {
                        toast.error(result.error, { id: toastId })
                    } else {
                        toast.success(t.toast.analysisStarted, { id: toastId })
                    }
                }}
                onDeletePolicy={async (policyId) => {
                    if (confirm(t.toast.confirmDelete)) {
                        const toastId = toast.loading(t.toast.policyDeleting)
                        const result = await deletePolicy(policyId)
                        if (result.error) {
                            toast.error(result.error, { id: toastId })
                        } else {
                            toast.success(t.toast.policyDeleted, { id: toastId })
                            router.refresh()
                        }
                    }
                }}
            />

            {showTour && <DashboardTour onComplete={() => dismissTour()} />}
        </div>
    )
}
