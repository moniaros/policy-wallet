"use client"

import { useState } from "react"
import { Dashboard, InviteModal } from "@/components/agent"
import { DashboardSummary, Priority, AccessScope } from "@/components/agent/types"
import { createAgentInvite } from "../agent/actions"
import { useRouter } from "next/navigation"

interface Props {
    initialSummary: DashboardSummary
    initialPriorities: Priority[]
}

export function DashboardClient({ initialSummary, initialPriorities }: Props) {
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
    const router = useRouter()

    const handleInvite = async (email: string, scope: AccessScope) => {
        const result = await createAgentInvite(email, scope)
        if (result.success) {
            router.refresh()
            alert("Invitation sent successfully!")
        } else {
            alert("Failed to send invitation.")
        }
    }

    const handlePriorityClick = (customerId: string) => {
        if (customerId) {
            router.push(`/customers/${customerId}`)
        }
    }

    return (
        <>
            <Dashboard
                summary={initialSummary}
                priorities={initialPriorities}
                onInviteCustomer={() => setIsInviteModalOpen(true)}
                onPriorityClick={handlePriorityClick}
            />
            <InviteModal
                isOpen={isInviteModalOpen}
                onClose={() => setIsInviteModalOpen(false)}
                onSendInvite={handleInvite}
            />
        </>
    )
}
