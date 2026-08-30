export const runtime = "nodejs"

import { redirect } from "next/navigation"

/**
 * /agent → /adviser (Grafí G10). The proxy 301s policyholders first; this
 * page-level redirect is the dead-link guard's arm. The route is
 * policyholder-owned (proxy ROUTE_OWNERSHIP), so nobody else ever renders it;
 * the agent's own tools live at /agent/settings and /agent/pricing.
 */
export default function AgentPage() {
    redirect("/adviser")
}
