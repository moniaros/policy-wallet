/**
 * Example integration page showing how to use mobile UI components
 * This demonstrates responsive design with mobile/desktop views
 */

"use client"

import { useIsMobile } from '@/hooks/useResponsive'
import { MobileWalletView } from '@/components/wallet/MobileWalletView'
import { PolicyWallet } from '@/components/wallet/PolicyWallet'
import type { Policy } from '@/components/wallet/types'

interface WalletPageProps {
    policies: Policy[]
}

export default function ResponsiveWalletPage({ policies }: WalletPageProps) {
    const isMobile = useIsMobile()

    // Mobile view
    if (isMobile) {
        return (
            <MobileWalletView
                policies={policies}
                onViewPolicy={(id) => {
                    // Navigate to policy details
                    window.location.href = `/wallet/${id}`
                }}
                onAddManually={() => {
                    // Navigate to add policy
                    window.location.href = '/wallet/add'
                }}
                onShareWithAgent={(id) => {
                    // Open share modal
                    console.log('Share policy:', id)
                }}
                onViewDocuments={(id) => {
                    // Navigate to documents
                    window.location.href = `/wallet/${id}/documents`
                }}
            />
        )
    }

    // Desktop view
    return (
        <PolicyWallet
            policies={policies}
            onViewPolicy={(id) => window.location.href = `/wallet/${id}`}
            onAddManually={() => window.location.href = '/wallet/add'}
            onShareWithAgent={(id) => console.log('Share:', id)}
            onViewDocuments={(id) => window.location.href = `/wallet/${id}/documents`}
        />
    )
}
