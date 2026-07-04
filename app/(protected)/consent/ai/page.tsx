import { redirect } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { AiConsentApprovalClient } from "./AiConsentApprovalClient"

export default async function AiConsentApprovalPage() {
    const { dbUser } = await getAuthenticatedUser()
    if (dbUser.aiProcessingConsentVersion) {
        redirect("/home")
    }
    return <AiConsentApprovalClient />
}
