"use client"

import { PolicyWallet } from "@/components/wallet/PolicyWallet"
import React, { useEffect } from "react"
import type { Policy } from "@/components/wallet/types"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/ui/PageHeader"
import { useLanguage } from "@/contexts/LanguageContext"
import { toast } from "sonner"
import { deletePolicy, runPolicyAnalysis } from "@/app/(protected)/wallet/actions"
import DashboardTour from '@/components/onboarding/DashboardTour'
import { dismissTour } from '@/app/onboarding/actions'

interface PolicyWalletClientProps {
    policies: Policy[]
    user?: {
        name: string
    }
    showTour?: boolean
}

export function PolicyWalletClient({ policies, user, showTour = false }: PolicyWalletClientProps) {
    const router = useRouter()

    const { t } = useLanguage()

    // Auto-refresh when policies are analyzing
    React.useEffect(() => {
        const hasAnalyzing = policies.some(p => p.status === 'analyzing')
        if (hasAnalyzing) {
            const interval = setInterval(() => {
                router.refresh()
            }, 3000)

            // Prompt for notifications if supported
            if ('Notification' in window && Notification.permission === 'default') {
                toast("Policy analysis in progress", {
                    description: "Would you like to be notified when it's ready?",
                    action: {
                        label: "Notify Me",
                        onClick: () => {
                            Notification.requestPermission().then(permission => {
                                if (permission === 'granted') {
                                    toast.success("Notifications enabled!")
                                }
                            })
                        }
                    },
                    duration: 8000
                })
            }

            return () => clearInterval(interval)
        }
    }, [policies, router])

    return (
        <div className="min-h-screen bg-transparent relative isolate">
            {/* Background Blobs for Liquid Glass Effect */}
            <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 -right-20 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[100px] opacity-40 mix-blend-multiply dark:mix-blend-normal animate-blob" />
                <div className="absolute -bottom-20 -left-20 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[100px] opacity-40 mix-blend-multiply dark:mix-blend-normal animate-blob animation-delay-2000" />
                <div className="absolute top-1/3 left-1/3 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] opacity-30 animate-pulse delay-700" />
            </div>

            <PageHeader
                title={user?.name ? `${t.auth.welcomeBack}, ${user.name.split(' ')[0]}!` : t.wallet.title}
                subtitle={t.wallet.manageTrack}
            />
            <PolicyWallet
                policies={policies}
                user={user}
                onViewPolicy={(policyId) => {
                    router.push(`/wallet/${policyId}`)
                }}
                onAddManually={() => {
                    router.push('/wallet/add')
                }}
                onUploadDocument={() => {
                    router.push('/wallet/add?method=upload')
                }}
                onShareWithAgent={(policyId) => {
                    router.push(`/wallet/${policyId}/share`)
                }}
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
