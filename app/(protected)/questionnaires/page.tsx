export const runtime = "nodejs"

import { getTemplates, getSentQuestionnaires } from "./actions"
import { QuestionnairesClient } from "./QuestionnairesClient"

export default async function QuestionnairesPage() {
    const [templates, instances] = await Promise.all([
        getTemplates(),
        getSentQuestionnaires(),
    ])

    return <QuestionnairesClient templates={templates} instances={instances} />
}
