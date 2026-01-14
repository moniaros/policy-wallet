"use client"

import { useRouter } from "next/navigation"
import { PolicyWallet } from "@/components/wallet"
import type { Policy } from "@/components/wallet/types"

export function WalletClient({ policies }: { policies: Policy[] }) {
    const router = useRouter()

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
