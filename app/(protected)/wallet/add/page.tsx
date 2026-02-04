import { getInsurers, getInsuranceTypes } from "../actions"
import { AddPolicyClient } from "@/components/wallet/AddPolicyClient"

export default async function AddPolicyPage() {
    const insurers = await getInsurers()
    const types = await getInsuranceTypes()

    return <AddPolicyClient insurers={insurers} types={types} />
}
