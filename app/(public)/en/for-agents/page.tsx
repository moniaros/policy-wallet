import { redirect } from "next/navigation"

// Mirrors the Greek /for-agents consolidation: the orphaned agent page was
// merged into /solutions/agents, so the English variant redirects to the
// English agent solution page (path is public via the /en/ proxy allowlist).
export default function ForAgentsPageEnglish() {
    redirect("/en/solutions/agents")
}
