export const runtime = 'nodejs'

import { getCustomerProfile } from "../../agent/actions"
import { CustomerProfileClient } from "./CustomerProfileClient"
import { AiDisclaimer } from "@/components/ui/AiDisclaimer"
import { notFound } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { canAgentUseFeature, resolveAgentEntitlements } from "@/lib/subscription-entitlements"
import { db } from "@/lib/db"
import { deriveAiConsentState, type CandidateAiConsent } from "@/lib/services/customer-resolution.service"

interface Props {
    // Next 16: route params arrive as a Promise. Read synchronously, `id` was
    // undefined, and getCustomerProfile(undefined) resolved to an ARBITRARY
    // customer of this agent (Prisma drops an undefined where-condition), so
    // per-customer uploads attached to the wrong person.
    params: Promise<{ id: string }>
}

export default async function CustomerProfilePage({ params }: Props) {
    const { id } = await params
    if (!id) notFound()
    const { dbUser } = await getAuthenticatedUser()

    const customer = await getCustomerProfile(id)
    if (!customer) notFound()

    // Compute data for ClientDetailView
    const agentEntitlements = await resolveAgentEntitlements(dbUser.id)
    const canBrandedReport = await canAgentUseFeature(dbUser.id, "brandedReport")

    // Whether an AI analysis can run if the advisor uploads for this customer
    // now — the SAME derivation the resolution path applies per candidate
    // (deriveAiConsentState), so the per-customer upload renders the same
    // three states (granted / attestable / blocked) instead of an attestation
    // checkbox that the server correctly ignores for a live account. Four
    // columns, read after getCustomerProfile has already established the
    // relationship; nothing else about the account is loaded. Unknown is
    // treated as blocked: an advisor never attests on an account we could not
    // classify.
    const consentSubject = await db.user.findUnique({
        where: { id: customer.id },
        select: { aiProcessingConsentVersion: true, password: true, emailVerified: true, lastActiveAt: true },
    })
    const customerAiConsent: CandidateAiConsent = consentSubject ? deriveAiConsentState(consentSubject) : "blocked"

    return (
        <>
            <CustomerProfileClient
                initialCustomer={customer}
                agentTier={agentEntitlements.tier}
                canBrandedReport={canBrandedReport}
                customerAiConsent={customerAiConsent}
            />
            {/* The health score, gaps and cross-sell shown here are AI-generated. */}
            <div className="mx-auto max-w-6xl px-4 pb-10">
                <AiDisclaimer />
            </div>
        </>
    )
}
