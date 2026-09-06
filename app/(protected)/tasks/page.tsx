export const runtime = 'nodejs'

import { getPendingActionItems } from "./actions"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { TasksClient } from "@/components/tasks/TasksClient"
import { getTranslations } from "@/lib/i18n"
import { resolveUserLanguage } from "@/lib/i18n/resolve-language"

export default async function TasksPage() {
    const { dbUser } = await getAuthenticatedUser()
    const actionItems = await getPendingActionItems()

    // Serialize dates for client component
    const serializedItems = actionItems.map(item => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
        dueDate: item.dueDate?.toISOString()
    }))

    const t =getTranslations(resolveUserLanguage(dbUser.preferredLanguage))

    return (
        <div className="pw-page-shell">
            <div className="mx-auto max-w-4xl space-y-4 px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pt-8">
                {/* The sticky white PageHeader bar is gone: the page names itself
                    on the canvas, the way every Direction A surface does. */}
                <div className="min-w-0">
                    <h1 className="text-h3 font-semibold tracking-tight text-foreground">{t.tasks.actionCenter}</h1>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t.tasks.manageTasks}</p>
                </div>
                <TasksClient
                    actionItems={serializedItems}
                    userLanguage={resolveUserLanguage(dbUser.preferredLanguage)}
                />
            </div>
        </div>
    )
}
