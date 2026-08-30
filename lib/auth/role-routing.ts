export type AppRole = "policyholder" | "agent" | "admin"

export function getPrimaryRole(roleValue: string | null | undefined): AppRole {
    const normalized = (roleValue || "")
        .toLowerCase()
        .split(",")
        .map((part) => part.trim())
        .find(Boolean)

    if (normalized === "agent") return "agent"
    if (normalized === "admin") return "admin"
    return "policyholder"
}

export function getPostLoginRedirectByRole(roleValue: string | null | undefined): string {
    const role = getPrimaryRole(roleValue)
    if (role === "agent") return "/dashboard/agent"
    if (role === "admin") return "/admin/dashboard"
    // Grafí (G7): the policyholder home is `/` — the proxy rewrites it to the
    // app screen for a signed-in session; /dashboard 301s here.
    return "/"
}
