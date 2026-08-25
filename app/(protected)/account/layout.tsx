import type { Metadata } from "next"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { getPublicPartnerOffers } from "@/lib/partner-offers/catalog"
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

    // §4.2: the partner-benefits entry lives inside Ρυθμίσεις, and only while
    // ≥1 offer is live (cached read — no extra DB round-trip per request).
    const hasLiveOffers = (await getPublicPartnerOffers()).length > 0

    return <SettingsShell roles={dbUser.roles} hasLiveOffers={hasLiveOffers}>{children}</SettingsShell>
}
