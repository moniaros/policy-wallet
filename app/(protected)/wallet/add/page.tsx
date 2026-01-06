import { getInsurers, getInsuranceTypes } from "../actions"
import { AddPolicyForm } from "./AddPolicyForm"

export default async function AddPolicyPage() {
    const insurers = await getInsurers()
    const types = await getInsuranceTypes()

    return (
        <div className="max-w-2xl mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-6 text-stone-900 dark:text-stone-100">Add Policy</h1>
            <AddPolicyForm insurers={insurers} types={types} />
        </div>
    )
}
