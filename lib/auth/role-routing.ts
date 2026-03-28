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
    return "/dashboard"
}
