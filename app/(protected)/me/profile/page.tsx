export const runtime = 'nodejs'

import type { Metadata } from "next"
import { ProfileSection } from "@/components/settings/sections/ProfileSection"
import { getProfileData } from "../data"

export const metadata: Metadata = { title: "Profile · Settings" }

export default async function ProfileSettingsPage() {
    return <ProfileSection data={await getProfileData()} />
}
