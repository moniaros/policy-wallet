export const runtime = "nodejs"

import { redirect } from "next/navigation"

/** /wallet/[id] → /policies/[id] (Grafí G8). /wallet/[id]/edit and /review keep serving. */
export default async function PolicyDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    redirect(`/policies/${id}`)
}
