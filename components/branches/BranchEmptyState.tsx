"use client"

import { EmptyState } from '@/components/ui/EmptyState'
import { getBranchIcon } from '@/lib/insurance/branch-icons'

/**
 * Client wrapper so the server branch page never passes an icon component
 * across the RSC boundary — the icon resolves from the branch id in here.
 */
export function BranchEmptyState({
    branchId,
    headline,
    description,
    ctaLabel,
}: {
    branchId: string
    headline: string
    description: string
    ctaLabel: string
}) {
    return (
        <EmptyState
            icon={getBranchIcon(branchId)}
            headline={headline}
            description={description}
            cta={{ label: ctaLabel, href: '/wallet/add' }}
        />
    )
}
