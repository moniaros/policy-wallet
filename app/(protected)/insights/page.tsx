export const runtime = 'nodejs'
import { getInsightsData } from './actions'
import { InsightsClient } from './InsightsClient'
import { getAuthenticatedUser } from '@/lib/auth-helpers'

export default async function AgentInsightsPage() {
    const { dbUser } = await getAuthenticatedUser()
    const data = await getInsightsData()
    if (!data) return <div>Access Denied</div>
    return <InsightsClient data={data} language={dbUser.preferredLanguage || 'en'} />
}
