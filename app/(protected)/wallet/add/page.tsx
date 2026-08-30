export const runtime = "nodejs"

import { redirect } from "next/navigation"

/** /wallet/add → /add (Grafí G12). Proxy 301 first; this is the dead-link guard's arm. */
export default function LegacyAddPolicyPage() {
    redirect("/add")
}
