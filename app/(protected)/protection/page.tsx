export const runtime = "nodejs"

import { redirect } from "next/navigation"

/**
 * /protection → /see (Grafí G8). The proxy 301s first; this page-level
 * redirect is the second line and what the dead-link guard checks. The
 * `?lens=` parameter is dropped on purpose: /see has one list, three tiers.
 * /protection/[branch] keeps serving.
 */
export default function ProtectionPage() {
    redirect("/see")
}
