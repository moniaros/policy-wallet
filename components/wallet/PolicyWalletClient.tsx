"use client"

import { PolicyWallet } from "@/components/wallet/PolicyWallet"
import type { Policy } from "@/components/wallet/types"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/ui/PageHeader"
import { useLanguage } from "@/contexts/LanguageContext"

interface PolicyWalletClientProps {
    policies: Policy[]
    user?: {
        name: string
    }
}

export function PolicyWalletClient({ policies, user }: PolicyWalletClientProps) {
    const router = useRouter()

    const { t } = useLanguage()

    return (
        <div className="min-h-screen bg-transparent">
            <PageHeader
                title={t.wallet.title}
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
            />
        </div>
    )
}
