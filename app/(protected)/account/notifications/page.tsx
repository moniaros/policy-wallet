export const runtime = 'nodejs'

import type { Metadata } from "next"
import { NotificationsSection } from "@/components/settings/sections/NotificationsSection"
import { getNotificationSettingsData } from "../data"

export const metadata: Metadata = { title: "Notifications · Settings" }

export default async function NotificationSettingsPage() {
    return <NotificationsSection data={await getNotificationSettingsData()} />
}
