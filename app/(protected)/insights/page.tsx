export const runtime = 'nodejs'
import { redirect } from 'next/navigation'
import { getInsightsData } from './actions'
import { InsightsClient } from './InsightsClient'
import { getAuthenticatedUser } from '@/lib/auth-helpers'
import { AiDisclaimer } from '@/components/ui/AiDisclaimer'
import { resolveUserLanguage } from "@/lib/i18n/resolve-language"

export default async function AgentInsightsPage() {
    const { dbUser } = await getAuthenticatedUser()
    const data = await getInsightsData()
    // Non-agents get null from the data layer — redirect to a safe surface
    // rather than rendering a raw, unstyled "Access Denied" string.
    if (!data) redirect('/dashboard')
    return (
        <>
            <InsightsClient data={data} language={resolveUserLanguage(dbUser.preferredLanguage)} />
            {/* Portfolio health scores and detected gaps above are AI-generated. */}
            <div className="mx-auto max-w-6xl px-4 pb-10">
                <AiDisclaimer />
            </div>
        </>
    )
}
