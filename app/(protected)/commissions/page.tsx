export const runtime = "nodejs"

import { getCommissionDashboard } from "./actions"
import { CommissionsClient } from "./CommissionsClient"

export default async function CommissionsPage() {
    const data = await getCommissionDashboard()
    if (!data) return null

    return <CommissionsClient data={data} />
}
