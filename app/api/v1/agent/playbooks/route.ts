import { createApiResponse } from "@/lib/api-utils"
import { withApiGuard } from "@/lib/api-guard"
import { generateAgentPlaybooks, generatePlaybook } from "@/lib/services/gap-engine/agent-playbook"

/**
 * GET /api/v1/agent/playbooks
 *
 * Returns action playbooks for all open opportunities of the authenticated agent.
 *
 * Query params:
 *   ?clientId=xxx&lob=motor&severity=high — Generate a single playbook for a specific client/gap
 */
export const GET = withApiGuard(
    {
        // Declarative role gate uses the canonical hasAnyRole/parseRoles path
        // (was a naive roles.includes("agent") substring check).
        auth: { mode: "user", roles: ["agent"] },
        rateLimit: {
            limit: 15,
            windowMs: 60 * 1000,
            key: ({ auth }) =>
                `agent-playbooks:${auth?.dbUser.id || "anonymous"}`,
        },
    },
    async ({ auth, req }) => {
        const agentId = auth!.dbUser.id

        const url = new URL(req.url)
        const clientId = url.searchParams.get("clientId")
        const lob = url.searchParams.get("lob")
        const severity = url.searchParams.get("severity")

        // Single playbook for a specific client/gap
        if (clientId && lob) {
            const playbook = await generatePlaybook(
                agentId,
                clientId,
                lob,
                severity || "medium"
            )
            return createApiResponse({ playbook })
        }

        // All playbooks for agent's open opportunities
        const playbooks = await generateAgentPlaybooks(agentId)
        return createApiResponse({
            playbooks,
            total: playbooks.length,
        })
    }
)
