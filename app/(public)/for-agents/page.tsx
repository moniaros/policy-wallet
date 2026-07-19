import { redirect } from "next/navigation"

// /for-agents was an orphaned duplicate of the agent story (off-brand palette,
// English-only body, tier names that contradicted /pricing). Consolidated into
// /solutions/agents — the path stays on the proxy.ts public allowlist so
// anonymous visitors and crawlers reach this redirect instead of a login wall.
export default function ForAgentsPage() {
    redirect("/solutions/agents")
}
