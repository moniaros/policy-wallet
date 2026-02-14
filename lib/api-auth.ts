import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import { createApiError } from "@/lib/api-utils"
import { NextResponse } from "next/server"

export type AppRole = "admin" | "agent" | "policyholder"

type AuthResult = NonNullable<Awaited<ReturnType<typeof getAuthenticatedUserOrNull>>>

function isAppRole(role: string): role is AppRole {
    return role === "admin" || role === "agent" || role === "policyholder"
}

export function parseRoles(rolesRaw: string | null | undefined): AppRole[] {
    if (!rolesRaw) return []

    return rolesRaw
        .split(",")
        .map((role) => role.trim())
        .filter(isAppRole)
}

export function hasAnyRole(rolesRaw: string | null | undefined, requiredRoles: AppRole[]): boolean {
    if (requiredRoles.length === 0) return true
    const roleSet = new Set(parseRoles(rolesRaw))
    return requiredRoles.some((role) => roleSet.has(role))
}

export async function requireApiUser(options?: { roles?: AppRole[] }): Promise<
    | { auth: AuthResult; roles: AppRole[] }
    | { error: NextResponse }
> {
    const auth = await getAuthenticatedUserOrNull()
    if (!auth) {
        return { error: createApiError("UNAUTHORIZED", "Unauthorized", 401) }
    }

    const roles = parseRoles(auth.dbUser.roles)
    const requiredRoles = options?.roles ?? []
    if (requiredRoles.length > 0 && !hasAnyRole(auth.dbUser.roles, requiredRoles)) {
        return { error: createApiError("FORBIDDEN", "Insufficient role permissions", 403) }
    }

    return { auth, roles }
}
