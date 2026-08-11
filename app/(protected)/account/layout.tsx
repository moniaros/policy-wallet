import type { Metadata } from "next"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { SettingsShell } from "@/components/settings/SettingsShell"

/**
 * Settings is private. `robots.ts` already disallows `/account`, but a
 * disallow only asks a crawler not to fetch — a page that leaks by another
 * route (a shared link, a preview deployment) should still carry the header.
 */
export const metadata: Metadata = {
    robots: { index: false, follow: false, nocache: true },
}

export default async function AccountSettingsLayout({ children }: { children: React.ReactNode }) {
    const { dbUser } = await getAuthenticatedUser()

    return <SettingsShell roles={dbUser.roles}>{children}</SettingsShell>
}
