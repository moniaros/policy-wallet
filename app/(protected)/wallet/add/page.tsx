import { getInsurers, getInsuranceTypes } from "../actions"
import { AddPolicyClient } from "@/components/wallet/AddPolicyClient"
import { getAuthenticatedUser } from "@/lib/auth-helpers"

export default async function AddPolicyPage() {
    const { dbUser } = await getAuthenticatedUser()
    const insurers = await getInsurers()
    const types = await getInsuranceTypes()

    return (
        <AddPolicyClient
            insurers={insurers}
            types={types}
            hasAiConsent={Boolean(dbUser.aiProcessingConsentVersion)}
        />
    )
}
