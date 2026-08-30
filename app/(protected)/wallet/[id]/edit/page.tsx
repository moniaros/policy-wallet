export const runtime = 'nodejs'

import { db } from "@/lib/db"
import { notFound, redirect } from "next/navigation"
import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import { sanitizeReturnPath } from "@/lib/navigation/return-to"
import { EditPolicyForm } from "@/components/wallet/EditPolicyForm"
import { getTranslations } from "@/lib/i18n"
import { ChevronLeft } from "lucide-react"
import Link from "next/link"

interface Props {
    params: Promise<{ id: string }>
    searchParams?: Promise<{ returnTo?: string }>
}

export default async function EditPolicyPage({ params, searchParams }: Props) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) redirect("/auth/signin")

    const { id } = await params
    const { returnTo } = (await searchParams) ?? {}
    const policy = await db.policy.findUnique({
        where: { id }
    })

    if (!policy) notFound()

    // Authorization: owner, or an active policy-scoped edit/manage grant
    // (agent-managed policies).
    const { getPolicyAccess } = await import("@/lib/policy-access")
    const access = await getPolicyAccess(id, {
        id: authResult.dbUser.id,
        roles: authResult.dbUser.roles,
    })
    if (!access.canWrite) {
        redirect("/wallet")
    }

    // Only allow same-origin relative return targets (shared guard).
    const safeReturnTo = sanitizeReturnPath(returnTo) ?? undefined

    const preferredLanguage = (authResult.dbUser.preferredLanguage as "en" | "el") || "en"
    const t = getTranslations(preferredLanguage)
    
    // Sanitize Decimal to number/string for client component
    const sanitizedPolicy = {
        ...policy,
        premiumAmount: policy.premiumAmount ? Number(policy.premiumAmount) : undefined,
    }

    return (
        <div className="pb-20">
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-border-hair px-4 py-3">
                <Link href={safeReturnTo ?? `/wallet/${id}`} aria-label={t.common.back} className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
                    <ChevronLeft className="w-5 h-5 text-muted-foreground" />
                </Link>
                <h1 className="text-lg font-bold text-foreground">
                    {t.wallet.editPolicyForm.title}
                </h1>
            </div>

            <main className="max-w-md mx-auto p-4">
                <EditPolicyForm
                    policy={sanitizedPolicy}
                    t={t}
                    returnTo={safeReturnTo}
                />
            </main>
        </div>
    )
}

