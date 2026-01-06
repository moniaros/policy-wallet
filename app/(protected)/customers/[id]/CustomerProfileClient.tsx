"use client"

import { CustomerProfile, QuestionnaireSender } from "@/components/agent"
import { Customer, OpportunityStatus } from "@/components/agent/types"
import { updateOpportunityStatus, sendReminder, createAgentInvite } from "../../agent/actions"
import { useRouter } from "next/navigation"

interface Props {
    initialCustomer: Customer
}

export function CustomerProfileClient({ initialCustomer }: Props) {
    const router = useRouter()

    const handleUpdateStatus = async (opportunityId: string, status: OpportunityStatus, notes?: string) => {
        const result = await updateOpportunityStatus(opportunityId, status, notes)
        if (result.success) {
            router.refresh()
        }
    }

    return (
        <>
            <div className="fixed bottom-8 right-8 z-[60]">
                <QuestionnaireSender
                    relationshipId={initialCustomer.relationshipId}
                    customerName={`${initialCustomer.name} ${initialCustomer.surname}`}
                />
            </div>
            <CustomerProfile
                customer={initialCustomer}
                onUpdateOpportunityStatus={handleUpdateStatus}
                onBack={() => router.push('/customers')}
                onUploadPolicy={() => alert('Redirecting to upload...')}
                onSendQuestionnaire={() => {
                    // Logic already handled by the floating button or can be triggered via ref
                    // For now, let's just keep the floating button for visibility
                }}
                onSendReminder={async (customerId: string) => {
                    const result = await sendReminder(customerId)
                    if (result.success) {
                        router.refresh()
                        alert('Reminder dispatched to customer.')
                    }
                }}
                onInviteCustomer={async (customerId: string, email: string) => {
                    const result = await createAgentInvite(email, 'portfolio')
                    if (result.success) {
                        router.refresh()
                        alert('Invitation sent successfully!')
                    }
                }}
            />
        </>
    )
}
