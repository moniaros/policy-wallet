import { getPendingActionItems } from "./actions"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { TasksClient } from "@/components/tasks/TasksClient"

export default async function TasksPage() {
    const { dbUser } = await getAuthenticatedUser()
    const actionItems = await getPendingActionItems()

    // Serialize dates for client component
    const serializedItems = actionItems.map(item => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
        dueDate: item.dueDate?.toISOString()
    }))

    return (
        <TasksClient
            actionItems={serializedItems}
            userLanguage={dbUser.preferredLanguage || 'en'}
        />
    )
}
