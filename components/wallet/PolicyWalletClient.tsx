"use client"

import { PolicyWallet } from "@/components/wallet/PolicyWallet"
import React, { useEffect } from "react"
import type { Policy } from "@/components/wallet/types"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/ui/PageHeader"
import { useLanguage } from "@/contexts/LanguageContext"
import { toast } from "sonner"
import { deletePolicy, runPolicyAnalysis } from "@/app/(protected)/wallet/actions"

interface PolicyWalletClientProps {
    policies: Policy[]
    user?: {
        name: string
    }
}

export function PolicyWalletClient({ policies, user }: PolicyWalletClientProps) {
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
        <div className="min-h-screen bg-transparent">
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
        </div>
    )
}
