/**
 * The ten attention areas — the ONE vocabulary every protection surface speaks.
 *
 * Before this table the same idea lived in four places with three spellings:
 * the life-event registry's eight `EVENT_DOMAINS`; the protection map's nine
 * rows, which split `money` into `money:income` / `money:debt` /
 * `money:retirement`; the recommendation tie-break's private `PRIORITY_LOBS`
 * (area → lines, many-to-many, and silent on `group_health`, `roadside`,
 * `pension` and `cyber`); and the risk catalogue's `lineOfBusiness`. Each
 * drifted on its own. See docs/planning/PERSONAL_RISK_PROFILE.md §C.
 *
 * One row per area, and every row answers the same questions:
 *   - `domain`       which life-event sphere it belongs to. `money` carries three
 *                    areas (income, debt, retirement) because a person thinks of
 *                    them separately; the events panel still says «Οικονομικά».
 *   - `priorityId`   the id the protection map emits for the row and the
 *                    analytics snapshot stores (`protection_profiles.priorityAreas`):
 *                    the domain itself, or `money:<facet>`. Stable — it is data.
 *   - `riskIds`      the catalogue risks that live here. Every catalogue risk
 *                    belongs to exactly one area.
 *   - `lobFamilies`  the lines of business listed under it. Every writable line
 *                    (`WRITE_BRANCH_IDS`) belongs to exactly one area, plus the
 *                    catalogue-only lines the engine can name (`disability`,
 *                    `renters`, `gadget`, the `business_*` children).
 *   - `label`        the registry's own label where the area IS a domain; the
 *                    map's money-row wording otherwise.
 *
 * Placement is by what the cover ANSWERS, not by how the taxonomy aggregates
 * for display: the taxonomy files `personal_accident` and `disability` under
 * `life`, but the catalogue offers both as the like-for-like substitute for
 * `income_protection` (`income_interruption.alsoCoveredBy`), so they sit with
 * income, not with the household's life cover.
 *
 * The guard — tests/unit/protection-domains-single-source.test.ts — enumerates
 * the catalogue and the taxonomy from disk and fails on any risk or line that
 * is unplaced or placed twice, and on any other file under lib/ or components/
 * that grows its own line→area or risk→area literal table.
 */

import { getBranch, type ScoreCategoryKey } from "@/lib/insurance/taxonomy"
import { EVENT_DOMAIN_LABELS } from "@/lib/services/life-events/registry"
import type { Bilingual, EventDomain } from "@/lib/services/life-events/types"

/** The vocabulary, in the contract's order (§C). */
export const AREA_IDS = [
    "household",
    "income",
    "debt",
    "retirement",
    "residence",
    "property",
    "mobility",
    "work",
    "health",
    "lifestyle",
] as const
export type AttentionAreaId = (typeof AREA_IDS)[number]

/** The three faces of money — the only areas whose id is not also a domain. */
export type MoneyAreaId = Extract<AttentionAreaId, "income" | "debt" | "retirement">

export interface AttentionArea {
    id: AttentionAreaId
    domain: EventDomain
    /** Set only for the money areas; equals the area id. */
    facet?: MoneyAreaId
    /** The protection map's row id — `household`, `money:income`, … */
    priorityId: string
    /** Catalogue risk ids (lib/services/gap-engine/risk-catalog.ts). */
    riskIds: readonly string[]
    /** Taxonomy branch ids (lib/insurance/taxonomy.ts). */
    lobFamilies: readonly string[]
    /** The protection-score bucket the area's answering lines fall in. */
    scoreCategory: ScoreCategoryKey
    label: Bilingual
}

export const AREAS: Record<AttentionAreaId, AttentionArea> = {
    household: {
        id: "household",
        domain: "household",
        priorityId: "household",
        riskIds: ["life_dependents"],
        // `life` is the line that answers "others depend on my income and I am
        // gone"; `group_life` is the same promise bought through an employer.
        lobFamilies: ["life", "group_life"],
        scoreCategory: "life",
        label: EVENT_DOMAIN_LABELS.household,
    },
    income: {
        id: "income",
        domain: "money",
        facet: "income",
        priorityId: "money:income",
        riskIds: ["income_interruption"],
        // `personal_accident` is named by four risks across four areas; the one
        // place it stands beside `disability` as a like-for-like answer is
        // `income_interruption`, and in Greek practice it is the self-employed
        // person's stand-in for income protection — an income line, not a
        // bequest. `disability` is not writable (no branch to buy) but the
        // catalogue names it, so it resolves here rather than climbing to `life`.
        lobFamilies: ["income_protection", "personal_accident", "disability"],
        scoreCategory: "income",
        label: { el: "Εισόδημα", en: "Income" },
    },
    debt: {
        id: "debt",
        domain: "money",
        facet: "debt",
        priorityId: "money:debt",
        riskIds: ["life_debt"],
        // No writable line is sold as loan or mortgage protection in the taxonomy
        // today — no branch, no alias. `life_debt` is answered by `life` (listed
        // with household) and `personal_accident` (income). When a
        // mortgage-protection branch is authored, it belongs here.
        lobFamilies: [],
        scoreCategory: "life",
        label: { el: "Δάνειο και υποχρεώσεις", en: "Loans and commitments" },
    },
    retirement: {
        id: "retirement",
        domain: "money",
        facet: "retirement",
        priorityId: "money:retirement",
        riskIds: ["retirement_shortfall"],
        lobFamilies: ["pension", "group_pension"],
        scoreCategory: "income",
        label: { el: "Σύνταξη", en: "Retirement" },
    },
    residence: {
        id: "residence",
        domain: "residence",
        priorityId: "residence",
        // The home you live in — owned or rented — and the disputes and
        // liabilities that come with the building itself.
        riskIds: ["home_building_damage", "home_contents_tenant", "home_legal_disputes", "common_areas_liability"],
        // `legal_expenses` answers two residence risks and one mobility risk;
        // `renters` is the tenant's home line (catalogue-only, child of `home`).
        lobFamilies: ["home", "renters", "legal_expenses"],
        scoreCategory: "property",
        label: EVENT_DOMAIN_LABELS.residence,
    },
    property: {
        id: "property",
        domain: "property",
        priorityId: "property",
        // Property beyond the roof over your head: a let flat, valuables.
        riskIds: ["landlord_letting", "valuables_loss"],
        // `gadget` is `valuables_loss`'s own line — not writable and deliberately
        // parentless in the taxonomy (see the `fine_art` comment there), so it
        // is listed rather than climbed to.
        lobFamilies: ["fine_art", "gadget"],
        scoreCategory: "property",
        label: EVENT_DOMAIN_LABELS.property,
    },
    mobility: {
        id: "mobility",
        domain: "mobility",
        priorityId: "mobility",
        riskIds: ["motor_liability", "motor_legal_disputes"],
        lobFamilies: ["motor", "motorbike", "roadside"],
        scoreCategory: "property",
        label: EVENT_DOMAIN_LABELS.mobility,
    },
    work: {
        id: "work",
        domain: "work",
        priorityId: "work",
        riskIds: ["professional_liability", "employer_liability", "business_assets_interruption"],
        // `liability` is the catalogue's primary line for two work risks and one
        // residence risk (`common_areas_liability`); it stays with work, where
        // the tie-break always read it. The whole `business` family — the B2B
        // branches plus the catalogue-only `business_*` children — lives here.
        lobFamilies: [
            "liability",
            "business",
            "professional_liability",
            "employer_liability",
            "business_property",
            "business_interruption",
            "equipment",
            "stock",
            "transports",
            "marine_hull",
            "marine_cargo",
            "marine_crew",
            "money",
            "fidelity",
        ],
        scoreCategory: "liability",
        label: EVENT_DOMAIN_LABELS.work,
    },
    health: {
        id: "health",
        domain: "health",
        priorityId: "health",
        riskIds: ["health_access_delay", "chronic_condition_costs"],
        lobFamilies: ["health", "group_health"],
        scoreCategory: "health",
        label: EVENT_DOMAIN_LABELS.health,
    },
    lifestyle: {
        id: "lifestyle",
        domain: "lifestyle",
        priorityId: "lifestyle",
        // What you do, not what you own or owe: travel, activities, pets, being
        // online, a boat. `activity_injury`'s line is `personal_accident`, which
        // resolves to income — a policy that answers an activity risk is listed
        // where its cover is felt (a lost income), and the risk stays here.
        riskIds: ["travel_abroad", "activity_injury", "pet_costs", "cyber_fraud", "boat_liability"],
        // `other` is the residual line and lands in the residual sphere: a policy
        // nobody could classify is presence, never an answer to a named risk.
        lobFamilies: ["travel", "pet", "cyber", "boat", "boat_hull", "boat_tpl", "other"],
        scoreCategory: "other",
        label: EVENT_DOMAIN_LABELS.lifestyle,
    },
}

/**
 * The authored display order — the protection map's row order today
 * (derive-priorities), with the area the onboarding never asks about last.
 */
export const AREA_ORDER: readonly AttentionAreaId[] = [
    "household",
    "health",
    "income",
    "residence",
    "debt",
    "mobility",
    "work",
    "retirement",
    "property",
    "lifestyle",
]

const AREA_BY_RISK = new Map<string, AttentionArea>()
const AREA_BY_LOB = new Map<string, AttentionArea>()
for (const id of AREA_IDS) {
    const area = AREAS[id]
    for (const riskId of area.riskIds) AREA_BY_RISK.set(riskId, area)
    for (const lob of area.lobFamilies) AREA_BY_LOB.set(lob, area)
}

export function areaForRisk(riskId: string): AttentionArea | undefined {
    return AREA_BY_RISK.get(riskId)
}

/**
 * The area a line of business is listed under.
 *
 * Accepts a canonical branch id, optionally suffixed the way recommendations
 * carry it (`motor:own-damage`, `home/earthquake`), in any case. A line that
 * is not listed resolves through its taxonomy family root (`technical_works` →
 * `business` → work), so a child branch never falls through. A raw policy
 * string is not normalised here — fold it with `normalizeBranch(raw).id` first.
 */
export function areaForLob(lineOfBusiness: string | null | undefined): AttentionArea | undefined {
    const key = String(lineOfBusiness ?? "").trim().toLowerCase().split(/[:/]/)[0]
    if (!key) return undefined
    const listed = AREA_BY_LOB.get(key)
    if (listed) return listed
    const parent = getBranch(key)?.parentId
    return parent ? AREA_BY_LOB.get(parent) : undefined
}

/** The areas of one life-event sphere, in display order — three for `money`. */
export function areasForDomain(domain: EventDomain): AttentionArea[] {
    return AREA_ORDER.map((id) => AREAS[id]).filter((area) => area.domain === domain)
}
