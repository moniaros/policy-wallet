export const runtime = "nodejs"

import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { getInsurers, getInsuranceTypes } from "@/app/(protected)/wallet/actions"
import { AddGate } from "./AddGate"

/** /add (§8.12) — the FAB's target. /wallet/add 301s here. */
export default async function AddPage() {
    const { dbUser } = await getAuthenticatedUser()
    const [insurers, types] = await Promise.all([getInsurers(), getInsuranceTypes()])
    return <AddGate insurers={insurers} types={types} hasAccountConsent={Boolean(dbUser.aiProcessingConsentVersion)} />
}
