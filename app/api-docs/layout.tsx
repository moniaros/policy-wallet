import { redirect } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { hasAnyRole } from "@/lib/api-auth"

// /api/doc (the OpenAPI spec this page embeds) is admin-only in production —
// gate the page the same way so non-admins don't land on a broken SwaggerUI.
export default async function ApiDocsLayout({ children }: { children: React.ReactNode }) {
    if (process.env.NODE_ENV === "production") {
        const { dbUser } = await getAuthenticatedUser()
        if (!hasAnyRole(dbUser.roles, ["admin"])) {
            redirect("/")
        }
    }
    return <>{children}</>
}
