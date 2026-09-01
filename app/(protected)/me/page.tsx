export const runtime = "nodejs"

import { displayPersonName } from "@/lib/wallet/policy-identity"
import { redirect } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { getTranslations } from "@/lib/i18n"
import { formatPlural } from "@/lib/i18n/plural"
import { LEGACY_TAB_REDIRECTS, settingsSectionsFor } from "@/lib/settings/sections"
import { getPublicPartnerOffers } from "@/lib/partner-offers/catalog"
import { resolveUserEntitlements } from "@/lib/subscription-entitlements"
import { planTierName, subscriptionCopy } from "@/lib/subscription-copy"
import { loadLedgerCounts } from "@/lib/app/ledger"
import { loadHouseholdModel } from "@/lib/app/household-model"
import { MeScreen } from "./MeScreen"

/**
 * /me — «Εσείς» (§8.9). The ledger («Τι έκανα για εσάς φέτος», a BusinessEvent
 * projection), the household, the settings list. Legacy `?tab=` deep links
 * still land on their sections.
 */
export default async function MePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
    const { tab } = await searchParams
    const legacyTarget = tab ? LEGACY_TAB_REDIRECTS[tab] : undefined
    if (legacyTarget && legacyTarget !== "/me") redirect(legacyTarget)

    const { dbUser } = await getAuthenticatedUser()
    const lang = (dbUser.preferredLanguage as "el" | "en") || "el"
    const t = getTranslations(lang)
    const [ledger, household, entitlements, hasLiveOffers] = await Promise.all([
        loadLedgerCounts(dbUser.id),
        loadHouseholdModel(dbUser.id, lang),
        resolveUserEntitlements(dbUser.id),
        getPublicPartnerOffers().then((o) => o.length > 0).catch(() => false),
    ])
    const sections = settingsSectionsFor(dbUser.roles ?? "", { hasLiveOffers })
        .filter((s) => s.id !== "household")
        .map((s) => ({ id: s.id, href: s.href, label: t.settings.nav[s.labelKey].label, description: t.settings.nav[s.labelKey].description }))
    return <MeScreen ledger={ledger} household={household} sections={sections} user={displayPersonName(dbUser.name) ? { name: displayPersonName(dbUser.name) } : undefined} planLine={formatPlural(t.app.me.planLine, { plan: planTierName(entitlements.tier, lang), price: subscriptionCopy.tiers[entitlements.tier as "free" | "plus" | "pro"].price[lang], period: subscriptionCopy.tiers[entitlements.tier as "free" | "plus" | "pro"].period[lang] }, lang)} />
}
