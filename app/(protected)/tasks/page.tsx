import { getPendingActionItems } from "./actions"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { TasksClient } from "@/components/tasks/TasksClient"
import { PageHeader } from "@/components/ui/PageHeader"
import { getTranslations } from "@/lib/i18n"

export default async function TasksPage() {
    const { dbUser } = await getAuthenticatedUser()
    const actionItems = await getPendingActionItems()

    // Serialize dates for client component
    const serializedItems = actionItems.map(item => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
        dueDate: item.dueDate?.toISOString()
    }))

    const t = getTranslations(dbUser.preferredLanguage as 'en' | 'el' || 'el')

    return (
        <div className="min-h-screen bg-transparent">
            <PageHeader
                title={t.tasks.actionCenter || "Action Center"}
                subtitle={t.tasks.manageTasks || "Review and complete your pending insurance requirements."}
            />
            <TasksClient
                actionItems={serializedItems}
                userLanguage={dbUser.preferredLanguage || 'en'}
            />
        </div>
    )
}
