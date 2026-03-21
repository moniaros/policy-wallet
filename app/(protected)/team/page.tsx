export const runtime = "nodejs"

import { getTeamData, getTeamPipeline } from "./actions"
import { TeamClient } from "./TeamClient"

export default async function TeamPage() {
    const [team, pipeline] = await Promise.all([
        getTeamData(),
        getTeamPipeline(),
    ])

    return <TeamClient team={team} pipeline={pipeline} />
}
