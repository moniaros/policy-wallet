"use client"

import { useState } from "react"
import { CustomerList, AddCustomerModal } from "@/components/agent"
import { Customer } from "@/components/agent/types"
import { getCustomers } from "../agent/actions"
import { useRouter } from "next/navigation"

interface Props {
    initialCustomers: Customer[]
}

export function CustomersClient({ initialCustomers }: Props) {
    const [customers, setCustomers] = useState(initialCustomers)
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const router = useRouter()

    const handleSearch = async (query: string) => {
        const results = await getCustomers(query)
        setCustomers(results)
    }

    const handleSuccess = () => {
        router.refresh()
    }

    return (
        <>
            <CustomerList
                customers={customers}
                onSearch={handleSearch}
                onCustomerClick={(id: string) => router.push(`/customers/${id}`)}
                onAddCustomer={() => setIsAddModalOpen(true)}
            />
            <AddCustomerModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={handleSuccess}
            />
        </>
    )
}
