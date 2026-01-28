"use client"

import { useRouter } from "next/navigation"
import { PolicyWallet } from "@/components/wallet"
import { MobileAppShell } from "@/components/layout/MobileAppShell"
import { useIsMobile } from "@/hooks/useResponsive"
import type { Policy } from "@/components/wallet/types"

interface WalletClientProps {
    policies: Policy[]
    user?: {
        id: string
        name: string
        email: string
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
    }
}

export function WalletClient({ policies, user, agent }: WalletClientProps) {
    const router = useRouter()
    const isMobile = useIsMobile()

    // Mobile view with full app shell (bottom nav + all screens)
    if (isMobile) {
        return (
            <MobileAppShell
                policies={policies}
                user={user}
                agent={agent}
            />
        )
    }

    // Desktop view with grid layout
    return (
        <PolicyWallet
            policies={policies}
            onViewPolicy={(id) => router.push(`/wallet/${id}`)}
            onAddManually={() => router.push('/wallet/add')}
            onUploadDocument={() => router.push('/wallet/add')}
            onAddToWallet={(id) => router.push(`/wallet/${id}?openWallet=true`)}
            onViewDocuments={(id) => router.push(`/wallet/${id}/documents`)}
        />
    )
}
