import { parseRoles } from "@/lib/api-auth"

/**
 * Is this user an agent (or admin)?
 *
 * The agent server actions all trust `dbUser.id` as the agent identity and
 * scope their queries by it — but authentication is not the agent ROLE.
 * Without this check, any authenticated policyholder can invoke agent write
 * actions (create invites, add customers, mint opportunities) acting as their
 * own "agent". Call it right after the auth guard in every agent action.
 */
export function isAgentRole(roles: string | null | undefined): boolean {
    const parsed = parseRoles(roles)
    return parsed.includes("agent") || parsed.includes("admin")
}
