export const runtime = 'nodejs'

import { redirect } from "next/navigation"
import { LEGACY_TAB_REDIRECTS } from "@/lib/settings/sections"
import { getPublicPartnerOffers } from "@/lib/partner-offers/catalog"
import { SettingsNav } from "@/components/settings/SettingsNav"
import { ProfileSection } from "@/components/settings/sections/ProfileSection"
import { getProfileData } from "./data"

/**
 * The settings index.
 *
 * On a phone this is the menu you drill into; on a wide screen the rail is
 * already beside you, so a menu here would just repeat it — the pane shows
 * Profile instead, and `activeSectionFor` marks Profile active for both
 * `/account` and `/account/profile`. Which one you see is decided in CSS, not
 * by measuring the viewport.
 */
export default async function AccountPage({
    searchParams,
}: {
    searchParams: Promise<{ tab?: string }>
}) {
    // The three tabs this section replaced were addressable, and every email
    // footer PolicyWallet has ever sent links to `?tab=settings`.
    const { tab } = await searchParams
    const legacyTarget = tab ? LEGACY_TAB_REDIRECTS[tab] : undefined
    if (legacyTarget && legacyTarget !== "/account") redirect(legacyTarget)

    const profile = await getProfileData()
    const hasLiveOffers = (await getPublicPartnerOffers()).length > 0

    return (
        <>
            <div className="lg:hidden">
                <SettingsNav roles={profile.roles} hasLiveOffers={hasLiveOffers} variant="index" />
            </div>
            <div className="hidden space-y-4 lg:block">
                <ProfileSection data={profile} />
            </div>
        </>
    )
}
