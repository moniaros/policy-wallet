export const runtime = 'nodejs'

import type { Metadata } from "next"
import { SecuritySection } from "@/components/settings/sections/SecuritySection"
import { getSecurityData } from "../data"

export const metadata: Metadata = { title: "Security · Settings" }

export default async function SecuritySettingsPage() {
    return <SecuritySection data={await getSecurityData()} />
}
