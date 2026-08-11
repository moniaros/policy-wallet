export const runtime = 'nodejs'

import type { Metadata } from "next"
import { PlanSection } from "@/components/settings/sections/PlanSection"
import { getPlanData } from "../data"

export const metadata: Metadata = { title: "Plan & billing · Settings" }

export default async function PlanSettingsPage() {
    return <PlanSection data={await getPlanData()} />
}
