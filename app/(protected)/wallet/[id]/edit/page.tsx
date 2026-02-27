export const runtime = 'nodejs'

import { db } from "@/lib/db"
import { notFound, redirect } from "next/navigation"
import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import { EditPolicyForm } from "@/components/wallet/EditPolicyForm"
import { getTranslations } from "@/lib/i18n"
import { ChevronLeft } from "lucide-react"
import Link from "next/link"

interface Props {
    params: Promise<{ id: string }>
}

export default async function EditPolicyPage({ params }: Props) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) redirect("/auth/signin")

    const { id } = await params
    const policy = await db.policy.findUnique({
        where: { id }
    })

    if (!policy) notFound()

    // Authorization check: Only owner can edit
    if (policy.ownerUserId !== authResult.dbUser.id) {
        redirect("/wallet")
    }

    const preferredLanguage = (authResult.dbUser.preferredLanguage as "en" | "el") || "en"
    const t = getTranslations(preferredLanguage)
    const isGreek = preferredLanguage === "el"

    // Sanitize Decimal to number/string for client component
    const sanitizedPolicy = {
        ...policy,
        premiumAmount: policy.premiumAmount ? Number(policy.premiumAmount) : undefined,
    }

    return (
        <div className="min-h-screen bg-stone-50 pb-20">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white border-b border-stone-200 px-4 py-3 flex items-center gap-3">
                <Link href={`/wallet/${id}`} className="p-2 -ml-2 hover:bg-stone-100 rounded-full">
                    <ChevronLeft className="w-5 h-5 text-stone-600" />
                </Link>
                <h1 className="text-lg font-bold text-stone-900">
                    {isGreek ? "Επεξεργασία Συμβολαίου" : "Edit Policy"}
                </h1>
            </div>

            <main className="max-w-md mx-auto p-4">
                <EditPolicyForm
                    policy={sanitizedPolicy}
                    t={t}
                />
            </main>
        </div>
    )
}
