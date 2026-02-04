import { getPendingActionItems } from "./actions"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { TasksClient } from "@/components/tasks/TasksClient"

export default async function TasksPage() {
    const { dbUser } = await getAuthenticatedUser()
    const actionItems = await getPendingActionItems()

    return (
        <TasksClient
            actionItems={actionItems}
            userLanguage={dbUser.preferred_language || 'en'}
        />
    )
}
