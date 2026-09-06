export const runtime = 'nodejs'
import { getActivityFeed } from './actions'
import { ActivityClient } from './ActivityClient'
import { getAuthenticatedUser } from '@/lib/auth-helpers'
import { resolveUserLanguage } from "@/lib/i18n/resolve-language"

export default async function ActivityPage() {
    const { dbUser } = await getAuthenticatedUser()
    const feed = await getActivityFeed()
    const isAgent = (dbUser.roles || '').includes('agent') || (dbUser.roles || '').includes('admin')
    return <ActivityClient events={feed} language={resolveUserLanguage(dbUser.preferredLanguage)} isAgent={isAgent} />
}
