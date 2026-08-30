import { policyLabel } from "@/lib/wallet/policy-identity"
import { selectPremiumBearingPolicies, calculatePremiumFootprintDetailed, type PremiumPolicyLike } from "@/lib/wallet/premium-footprint"
import { getOffersForUser } from "@/lib/partner-offers/catalog"
import { computeMoneyLine, type MoneyPolicy, type MoneyLine } from "./money"
import { assetLabelFor } from "./compose"
import { lineOf, LINES } from "./lines"
import { loadFindingsContext } from "./home-model"

export interface MoneyModel {
    lang: "el" | "en"
    money: MoneyLine
    footprint: { total: number; countedPolicies: number; otherCurrencyCount: number; unknownPremiumCount: number; unknownDurationCount: number }
    /** «Πού πάνε τα N €» — the in-force premiums by line, largest first. */
    byLine: Array<{ id: string; label: string; amount: number }>
    /** «Ίσως πληρώνετε δύο φορές» — the pairs, named; a figure only when insurer tariff data exists (it does not yet). */
    paidTwice: Array<{ label: string; partnerLabel: string; asset: string | null; amountPerYear: number | null }>
    /** «Πληρώνετε και δεν το χρησιμοποιείτε» — benefits the documents state, plus live partner offers in the plan. */
    benefits: Array<{ id: string; name: string; policyLabel: string | null; contact: string | null }>
    offers: Array<{ id: string; title: string; vendor: string; href: string }>
    /** A live home policy makes the sourced ΕΝΦΙΑ guide worth a look — never a claim of eligibility. */
    enfiaGuideHref: string | null
    policyCount: number
}

const ENFIA_GUIDE = "/guides/ekptosi-enfia-asfalisi-katoikias"

/**
 * /money (§8.5): every figure is either read from a document, computed from
 * figures the documents state, or absent with the reason. Nothing here
 * suggests buying, switching or cutting anything.
 */
export async function loadMoneyModel(userId: string, lang: "el" | "en", now: Date = new Date()): Promise<MoneyModel> {
    const [ctx, offers] = await Promise.all([
        loadFindingsContext(userId, lang, now),
        getOffersForUser(userId).catch(() => ({ tier: "free", unlocked: [], locked: [] })),
    ])
    const rows = [...ctx.policyRows.values()]
    const moneyPolicies: MoneyPolicy[] = rows.map((p) => ({
        id: p.id, lineOfBusiness: p.lineOfBusiness, status: p.status, insurerName: p.insurerName, policyNumber: p.policyNumber,
        startDate: p.startDate, endDate: p.endDate, premiumAmount: p.premiumAmount, premiumCurrency: p.premiumCurrency, acordData: p.acordData,
        coverages: ((p.acordData as { coverages?: MoneyPolicy["coverages"] } | null)?.coverages) ?? [],
    }))
    const money = computeMoneyLine(moneyPolicies, new Map(), now)
    const footprint = calculatePremiumFootprintDetailed(moneyPolicies as PremiumPolicyLike[], now)
    const { policies: inForce } = selectPremiumBearingPolicies(moneyPolicies as (PremiumPolicyLike & MoneyPolicy)[], now)

    const lineLabels = Object.fromEntries(LINES.map((l) => [l.id, l.label[lang]]))
    const sums = new Map<string, number>()
    for (const p of inForce) {
        const premium = Number(p.premiumAmount ?? 0)
        if (!Number.isFinite(premium) || premium <= 0) continue
        const line = lineOf((p as MoneyPolicy).lineOfBusiness) ?? "business"
        sums.set(line, (sums.get(line) ?? 0) + premium)
    }
    const byLine = [...sums.entries()].map(([id, amount]) => ({ id, label: lineLabels[id], amount })).sort((a, b) => b.amount - a.amount)

    const paidTwice = money.paidTwice.flatMap((pair) => {
        const a = ctx.rawById.get(pair.policyId)
        const b = ctx.rawById.get(pair.partnerPolicyId)
        if (!a || !b) return []
        // Two documents of the SAME contract (same insurer + number) are a
        // re-upload, not double cover — the reader-pass caught self-paired rows.
        if ((a.policyNumber ?? "") === (b.policyNumber ?? "") && (a.insurerName ?? "") === (b.insurerName ?? "")) return []
        const label = policyLabel(a, "")
        const partnerLabel = policyLabel(b, "")
        if (!label || !partnerLabel) return []
        return [{ label, partnerLabel, asset: assetLabelFor(a, lang), amountPerYear: pair.amountPerYear ?? null }]
    })

    const live = ctx.composed.filter((p) => p.lifecycle !== "expired" && p.lifecycle !== "cancelled")
    const liveIds = new Set(live.map((p) => p.id))
    const benefits: MoneyModel["benefits"] = []
    for (const p of rows) {
        if (!liveIds.has(p.id)) continue
        const perks = (p.acordData as { perksAndBenefits?: Array<{ name?: { el?: string; en?: string }; contactPhone?: string; contactUrl?: string }> } | null)?.perksAndBenefits
        if (!Array.isArray(perks)) continue
        for (const [i, perk] of perks.entries()) {
            const name = (lang === "el" ? perk?.name?.el : perk?.name?.en) || perk?.name?.el || ""
            if (!name.trim()) continue
            benefits.push({ id: `${p.id}-${i}`, name: name.trim(), policyLabel: policyLabel(p, "") || null, contact: perk?.contactPhone || perk?.contactUrl || null })
        }
    }
    const hasLiveHome = live.some((p) => lineOf(p.lineOfBusiness) === "property")

    return {
        lang,
        money,
        footprint: { total: footprint.total, countedPolicies: footprint.countedPolicies, otherCurrencyCount: footprint.otherCurrencyCount, unknownPremiumCount: footprint.unknownPremiumCount, unknownDurationCount: footprint.unknownDurationCount },
        byLine,
        paidTwice,
        benefits: benefits.slice(0, 12),
        offers: (offers.unlocked ?? []).slice(0, 6).map((o) => ({ id: o.id, title: lang === "el" ? o.title.el : o.title.en, vendor: o.vendorName, href: "/benefits" })),
        enfiaGuideHref: hasLiveHome ? ENFIA_GUIDE : null,
        policyCount: live.length,
    }
}
