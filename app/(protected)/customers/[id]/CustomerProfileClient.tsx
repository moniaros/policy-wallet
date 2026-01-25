"use client"

import { useState } from "react"
import { CustomerProfile, QuestionnaireSender } from "@/components/agent"
import { Customer, OpportunityStatus } from "@/components/agent/types"
import { updateOpportunityStatus, sendReminder, createAgentInvite } from "../../agent/actions"
import { useRouter } from "next/navigation"
import { CreateTaskModal } from "@/components/agent/CreateTaskModal"
import { AddPolicyForCustomerModal } from "@/components/agent/AddPolicyForCustomerModal"

interface Props {
    initialCustomer: Customer
}

export function CustomerProfileClient({ initialCustomer }: Props) {
    const router = useRouter()
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
    const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false)

    const handleUpdateStatus = async (opportunityId: string, status: OpportunityStatus, notes?: string) => {
        const result = await updateOpportunityStatus(opportunityId, status, notes)
        if (result.success) {
            router.refresh()
        }
    }

    return (
        <>
            {/* Floating Action Buttons */}
            <div className="fixed bottom-8 right-8 z-[60]">
                <div className="flex flex-col gap-4 items-end">
                    {/* Add Policy Button */}
                    <button
                        onClick={() => setIsPolicyModalOpen(true)}
                        className="bg-teal-600 text-white rounded-full p-4 shadow-lg shadow-teal-600/20 hover:scale-105 transition-transform group flex items-center gap-3 pr-6"
                    >
                        <span className="w-6 h-6 flex items-center justify-center border-2 border-white/30 rounded-full">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                        </span>
                        <span className="font-bold text-sm">Add Policy</span>
                    </button>

                    {/* Create Task Button */}
                    <button
                        onClick={() => setIsTaskModalOpen(true)}
                        className="bg-stone-900 text-white rounded-full p-4 shadow-lg hover:scale-105 transition-transform group flex items-center gap-3 pr-6"
                    >
                        <span className="w-6 h-6 flex items-center justify-center border-2 border-white/30 rounded-full">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                        </span>
                        <span className="font-bold text-sm">Create Task</span>
                    </button>

                    <QuestionnaireSender
                        relationshipId={initialCustomer.relationshipId}
                        customerName={`${initialCustomer.name} ${initialCustomer.surname}`}
                    />
                </div>
            </div>

            {/* Create Task Modal */}
            <CreateTaskModal
                isOpen={isTaskModalOpen}
                onClose={() => setIsTaskModalOpen(false)}
                userId={initialCustomer.id}
                customerName={`${initialCustomer.name} ${initialCustomer.surname}`}
            />

            {/* Add Policy Modal */}
            <AddPolicyForCustomerModal
                isOpen={isPolicyModalOpen}
                onClose={() => setIsPolicyModalOpen(false)}
                customerId={initialCustomer.id}
                customerName={`${initialCustomer.name} ${initialCustomer.surname}`}
            />

            <CustomerProfile
                customer={initialCustomer}
                onUpdateOpportunityStatus={handleUpdateStatus}
                onBack={() => router.push('/customers')}
                onUploadPolicy={() => setIsPolicyModalOpen(true)}
                onSendQuestionnaire={() => {
                    // Logic already handled by the floating button or can be triggered via ref
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
                onViewPolicy={(customerId, policyId) => router.push(`/customers/${customerId}/policy/${policyId}`)}
            />
        </>
    )
}
