import type { Metadata } from "next"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { SettingsShell } from "@/components/settings/SettingsShell"

/**
 * The agency profile is a settings section, so it renders in the settings
 * shell. Before this, an advisor had two unrelated settings experiences — a
 * one-item sidebar here and a three-tab page at `/account` — and no route
 * acknowledged the other existed.
 */
export const metadata: Metadata = {
    robots: { index: false, follow: false, nocache: true },
}

export default async function AgentSettingsLayout({ children }: { children: React.ReactNode }) {
    const { dbUser } = await getAuthenticatedUser()

    return <SettingsShell roles={dbUser.roles}>{children}</SettingsShell>
}
