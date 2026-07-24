import type { AcordData } from "@/types/domain"
import { branchFamilyId } from "@/lib/insurance/taxonomy"

/**
 * Which part of an extraction the policy page's coverage panels read.
 *
 * `lib/schemas/acord-data.ts` carries two names for three of the branches:
 * the canonical `vehicle`, `property` and `lifeAndInvestment` sections, and a
 * block of `motor` / `home` / `life` keys explicitly labelled "Legacy aliases
 * for backward compatibility with UI components — AI extraction should populate
 * the canonical sections". Nothing in the pipeline maps one onto the other:
 * `extraction-enrichment.ts` spreads the model's object through verbatim.
 *
 * The panels read the aliases. So on a freshly analysed motor, home or life
 * policy — the three biggest Greek retail branches — the extraction lands in
 * `vehicle` / `property` / `lifeAndInvestment` and the panel that exists to
 * display it reads a key nobody wrote, finds nothing, and returns null.
 *
 * What the reader loses is not decoration. On motor it is the coverage tier —
 * third-party versus comprehensive, the single most consequential fact about
 * the policy — plus the accident-declaration line they are meant to call from
 * the roadside, the green-card expiry they need to drive abroad, and who else
 * is actually named as a driver. On home it is the sum insured and the
 * fire/earthquake/flood grid. On life it is the fund and surrender values.
 *
 * The gap engine reads the canonical sections, so the halves disagreed in the
 * visible way: `home_no_earthquake` could tell a policyholder their house
 * appears to have no earthquake cover while the coverage panel on that same
 * policy — the grid built to show exactly that — rendered nothing at all.
 *
 * Resolved canonical-first with the alias as fallback, so stored data in either
 * shape displays. This mirrors `lib/insurance/content/action-resolvers.ts`,
 * which already reads both and documents "canonical first".
 */

/** Field names differ between the two shapes in only one place per branch. */
/** deductible (excess) and estimatedMarketValue are canonical `vehicle`-only,
 *  with no legacy `motor` counterpart — so they fell outside this resolver's type
 *  and never reached the panel, like life's death benefit. */
export type MotorSection = NonNullable<AcordData["motor"]> & {
    deductible?: number
    estimatedMarketValue?: number
}

export function motorSection(acord: AcordData | null | undefined): MotorSection | null {
    const canonical = acord?.vehicle
    const legacy = acord?.motor
    if (!canonical && !legacy) return null
    return {
        coverageTier: canonical?.coverageTier ?? legacy?.coverageTier,
        // canonical spells it `greenCardExpiryDate`.
        greenCardExpiry: canonical?.greenCardExpiryDate ?? legacy?.greenCardExpiry,
        namedDrivers: canonical?.namedDrivers ?? legacy?.namedDrivers,
        accidentDeclarationPhone: canonical?.accidentDeclarationPhone ?? legacy?.accidentDeclarationPhone,
        roadsideAssistancePhone: canonical?.roadsideAssistancePhone ?? legacy?.roadsideAssistancePhone,
        ownVehicleDamage: canonical?.ownVehicleDamage ?? legacy?.ownVehicleDamage,
        glassBreakage: canonical?.glassBreakage ?? legacy?.glassBreakage,
        // Canonical-only: the excess the holder pays per claim, and the market
        // value that caps a total-loss payout.
        deductible: canonical?.deductible,
        estimatedMarketValue: canonical?.estimatedMarketValue,
    }
}

/** estimatedRebuildCost is canonical `property`-only. The underinsurance gap is
 *  computed FROM it (insuredValue vs rebuild cost), yet the panel never showed
 *  the figure itself — same extracted-but-unrendered class. */
export type HomeSection = NonNullable<AcordData["home"]> & {
    estimatedRebuildCost?: number
}

export function homeSection(acord: AcordData | null | undefined): HomeSection | null {
    const canonical = acord?.property
    const legacy = acord?.home
    if (!canonical && !legacy) return null

    // canonical keeps the three perils as flat flags; the alias nests them.
    // Built only when at least one peril is actually stated — an all-undefined
    // block would render three red crosses, i.e. claim the house has no fire,
    // earthquake or flood cover, on an extraction that never mentioned them.
    const catastropheCoverage = (() => {
        const fire = canonical?.fireCoverageIncluded ?? legacy?.catastropheCoverage?.fire
        const earthquake = canonical?.earthquakeCoverageIncluded ?? legacy?.catastropheCoverage?.earthquake
        const flood = canonical?.floodCoverageIncluded ?? legacy?.catastropheCoverage?.flood
        if (fire === undefined && earthquake === undefined && flood === undefined) return undefined
        return { fire, earthquake, flood }
    })()

    return {
        enfiaEligible: canonical?.enfiaEligible ?? legacy?.enfiaEligible,
        catastropheCoverage,
        mortgageeBank: canonical?.mortgageeBank ?? legacy?.mortgageeBank,
        technicalAssistancePhone: canonical?.technicalAssistancePhone ?? legacy?.technicalAssistancePhone,
        theftCoverageLimit: canonical?.theftCoverageLimit ?? legacy?.theftCoverageLimit,
        insuredValue: canonical?.insuredValue ?? legacy?.insuredValue,
        replacementValue: canonical?.replacementValue ?? legacy?.replacementValue,
        contentsVsStructure: canonical?.contentsVsStructure ?? legacy?.contentsVsStructure,
        // Canonical-only: the rebuild cost the sum insured is measured against.
        estimatedRebuildCost: canonical?.estimatedRebuildCost,
    }
}

/**
 * The panel long showed only the INVESTMENT side of a life contract (fund value,
 * growth, surrender) and never the PROTECTION side. deathBenefit — the sum paid
 * to the beneficiaries on death, the entire point of a life policy — is a
 * canonical `lifeAndInvestment` field with no counterpart in the legacy `life`
 * alias, so it fell outside this resolver's type and never reached the panel. A
 * term-life policy (protection only, no fund) therefore rendered nothing.
 */
export type LifeSection = NonNullable<AcordData["life"]> & {
    deathBenefit?: number
    cashValue?: number
    maturityDate?: string
}

export function lifeSection(acord: AcordData | null | undefined): LifeSection | null {
    const canonical = acord?.lifeAndInvestment
    const legacy = acord?.life
    if (!canonical && !legacy) return null
    return {
        // Protection side — canonical-only (the legacy alias never modelled these).
        deathBenefit: canonical?.deathBenefit,
        cashValue: canonical?.cashValue,
        maturityDate: canonical?.maturityDate,
        // Investment side — present under both names, spelled the same.
        currentFundValue: canonical?.currentFundValue ?? legacy?.currentFundValue,
        ytdGrowth: canonical?.ytdGrowth ?? legacy?.ytdGrowth,
        taxFreeAtMaturity: canonical?.taxFreeAtMaturity ?? legacy?.taxFreeAtMaturity,
        guaranteedPercentage: canonical?.guaranteedPercentage ?? legacy?.guaranteedPercentage,
        unitLinkedPercentage: canonical?.unitLinkedPercentage ?? legacy?.unitLinkedPercentage,
        surrenderValue: canonical?.surrenderValue ?? legacy?.surrenderValue,
        lastPremiumDate: canonical?.lastPremiumDate ?? legacy?.lastPremiumDate,
        lastPremiumAmount: canonical?.lastPremiumAmount ?? legacy?.lastPremiumAmount,
    }
}

/**
 * The acordData keys that can hold a type-specific section for a branch —
 * both spellings, so the "is there anything to show?" gate agrees with what
 * the panels can actually render.
 *
 * Keyed by branch FAMILY. The page resolved this from the raw line of business,
 * so a motorbike, truck, renters, income-protection, disability or
 * personal-accident policy matched no entry: no panel, and — because the
 * re-analyse hint is gated on the same lookup — no explanation either. The
 * section simply wasn't there, which reads as "this policy has no cover
 * details" rather than "this page doesn't know your branch".
 */
const FAMILY_SECTION_KEYS: Record<string, readonly string[]> = {
    health: ["health"],
    motor: ["vehicle", "motor"],
    home: ["property", "home"],
    life: ["lifeAndInvestment", "life"],
    pet: ["pet"],
}

/** null when the branch has no type-specific panel (travel, cyber, business…). */
export function coverageSectionKeys(lineOfBusiness: string | null | undefined): readonly string[] | null {
    return FAMILY_SECTION_KEYS[branchFamilyId(lineOfBusiness)] ?? null
}
