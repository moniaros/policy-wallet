export const runtime = "nodejs"

import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { getTranslations } from "@/lib/i18n"
import { formatCurrency } from "@/lib/i18n/format"
import { formatPlural } from "@/lib/i18n/plural"
import { calculatePremiumFootprint } from "@/lib/wallet/premium-footprint"
import { LargeTitleNav } from "@/src/design-system/shell"

/**
 * /money — «Τα χρήματά σας» (§8.5). G3 ships the route with the ONE figure the
 * wallet already computes honestly (the premium footprint of in-force
 * policies); G9 adds the triad, the duplicates and the unused benefits. No
 * figure here is invented: what is not computed yet is not shown.
 */
export default async function MoneyPage() {
    const { dbUser } = await getAuthenticatedUser()
    const lang = (dbUser.preferredLanguage as "el" | "en") || "el"
    const t = getTranslations(lang)
    const policies = await db.policy.findMany({
        where: { ownerUserId: dbUser.id, status: { not: "deleted" } },
        select: { id: true, policyNumber: true, insurerName: true, status: true, endDate: true, premiumAmount: true, premiumCurrency: true, acordData: true },
    })
    const paid = calculatePremiumFootprint(policies)
    return (
        <>
            <LargeTitleNav title={t.app.money.title} brand={{ href: "/dashboard", label: t.app.nav.brand }} />
            <section id="money" className="px-g-4 pt-g-6 tablet:px-0">
                <p className="text-g-app-body text-fg-primary" data-fact="money.paidPerYear">
                    {formatPlural(t.app.money.interim, { amount: formatCurrency(paid, lang) }, lang)}
                </p>
                <p className="mt-g-2 text-g-app-body-sm text-fg-faint">{t.app.money.interimNote}</p>
            </section>
        </>
    )
}
