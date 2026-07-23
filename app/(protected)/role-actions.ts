"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { parseRoles, type AppRole } from "@/lib/api-auth"
import { ACTIVE_ROLE_COOKIE } from "@/lib/auth/active-role"

/**
 * Switch which role's navigation the shell renders.
 *
 * The RoleSwitcher used to call an `onRoleSwitch` prop that the protected layout
 * never passed, then show a "viewing as X" toast — so it reported a switch that
 * never happened. Meanwhile the layout built navigation from `roles[0]` only, so
 * a "policyholder,agent" user (which the advisor-invite flow now creates) had no
 * way to reach the other role's tools at all.
 *
 * This is navigation state ONLY. It is validated against the roles the user
 * actually holds, so it can never surface a role they lack — and every page and
 * API keeps its own server-side guard regardless of what this cookie says.
 */
export async function setActiveRole(role: AppRole): Promise<{ ok: true } | { error: string }> {
    const { dbUser } = await getAuthenticatedUser()

    const userRoles = parseRoles(dbUser.roles)
    if (!userRoles.includes(role)) {
        return { error: "ROLE_NOT_HELD" }
    }

    const store = await cookies()
    store.set(ACTIVE_ROLE_COOKIE, role, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
    })

    // The shell is rendered by the protected layout, so the whole subtree needs
    // to re-render for the new navigation to appear.
    revalidatePath("/", "layout")
    return { ok: true }
}
