export const runtime = 'nodejs'
import { getActivityFeed } from './actions'
import { ActivityClient } from './ActivityClient'
import { getAuthenticatedUser } from '@/lib/auth-helpers'

export default async function ActivityPage() {
    const { dbUser } = await getAuthenticatedUser()
    const feed = await getActivityFeed()
    const isAgent = (dbUser.roles || '').includes('agent') || (dbUser.roles || '').includes('admin')
    return <ActivityClient events={feed} language={dbUser.preferredLanguage || 'en'} isAgent={isAgent} />
}
