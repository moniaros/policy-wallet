/**
 * Recommendation Generator
 *
 * Converts detected profile gaps and policy gaps into prioritized,
 * personalized recommendation instances. Handles deduplication,
 * persistence, and lifecycle management.
 */

import { db } from "@/lib/db"
import { areaForLob } from "@/lib/protection/domains"
import { displayInsurerName } from "@/lib/wallet/policy-identity"
import { resolveGapConcept, resolveGapContent } from "@/lib/wallet/gap-report"
import { classifiedRecommendations, recommendationCitation } from "@/lib/gaps/gap-rows"
import type { ProvenanceCitation } from "@/lib/gaps/provenance"
import type { ProfileGap, GapSeverity } from "./profile-gap-rules"
import { lobProtectionWeight } from "./protection-score"
import type { Mitigation, RiskAssessment, RiskConfidence, RiskStatus } from "./risk-types"
import type {
    RecommendationEvidence,
    UrgencyVerdict,
} from "./recommendation-context"
import { openFindings } from "./risk-assessment"

// ── Rule identity ────────────────────────────────────────────────────

export const POLICY_GAP_RULE_PREFIX = "policy_gap:"

/**
 * Rule id for an AI-detected policy gap: `policy_gap:<lob>:<concept>`.
 *
 * The (userId, ruleId) uniqueness below stops the same rule being written
 * twice — but only if one finding has one rule id. It doesn't: the pipeline
 * mints rule ids from UNCONSTRAINED AI slugs, so one finding arrives spelled
 * several ways (`theft` from the AI, `motor-theft` from the seeded rules,
 * `own-damage` / `own-vehicle-damage`) and each spelling claims its own row.
 * Keying on the CONCEPT is what makes the uniqueness mean anything. The line
 * of business rides along because a missing theft cover on the car and on the
 * house are different findings that happen to share a word.
 */
export function policyGapRuleId(lineOfBusiness: string, rawSlug: string): string {
    const lob = String(lineOfBusiness || "other").trim().toLowerCase()
    return `${POLICY_GAP_RULE_PREFIX}${lob}:${resolveGapConcept(rawSlug)}`
}

/**
 * The gap concept behind a rule id, or null for profile/portfolio rules.
 * Accepts the legacy two-segment form (`policy_gap:<raw-slug>`, written before
 * rule ids carried a concept) so old rows collapse onto their new twins
 * instead of rendering beside them.
 */
export function policyGapConcept(ruleId: string | null | undefined): string | null {
    const id = String(ruleId || "")
    if (!id.startsWith(POLICY_GAP_RULE_PREFIX)) return null
    const rest = id.slice(POLICY_GAP_RULE_PREFIX.length)
    const parts = rest.split(":")
    const slug = parts.length > 1 ? parts.slice(1).join(":") : rest
    return resolveGapConcept(slug)
}

/**
 * One key per distinct finding — the identity every dedupe here uses.
 * Policy-gap rules collapse onto `<lob>:<concept>`; profile and portfolio
 * rules already have stable ids and pass through.
 */
export function recommendationDedupeKey(rec: {
    ruleId: string | null
    lineOfBusiness: string
}): string | null {
    const ruleId = String(rec.ruleId || "").trim()
    if (!ruleId) return null
    const concept = policyGapConcept(ruleId)
    if (!concept) return ruleId
    return policyGapRuleId(rec.lineOfBusiness, concept)
}

/** Fallback identity for rows that carry no rule id: two cards that READ the
 *  same are the same card, whatever the database thinks. */
function readableTitleKey(title: unknown): string {
    const value = (title ?? {}) as { el?: string; en?: string }
    return String(value.el || value.en || "").trim().toLowerCase()
}

// ── Types ────────────────────────────────────────────────────────────

/**
 * The assessment payload every recommendation carries.
 *
 * A recommendation has to be able to answer, on the card, why this risk exists
 * for this person and what it would cost them. Splitting it out keeps the shape
 * identical between the input written to the DB and the output read back.
 */
export interface RecommendationAssessment {
    /** Catalog risk id, when the recommendation came from the risk engine. */
    riskId: string | null
    /** One of the six RiskStatus values; null on rows written by the old engine. */
    riskStatus: RiskStatus | null
    confidence: RiskConfidence | null
    expectedImpact: { en: string; el: string } | null
    /** Avoid / reduce / retain / transfer. Insurance is one entry, not the frame. */
    mitigations: Mitigation[] | null
    suggestedSolution: { en: string; el: string } | null
    eligibilityNote: { en: string; el: string } | null
    /** Lines already answering this risk — renders as "Current protection". */
    coveredBy: string[] | null
}

/**
 * Optional on the way IN, always present on the way OUT. A caller producing a
 * portfolio or policy-gap recommendation has no assessment to report and should
 * not have to spell out six nulls to say so; the persistence layer normalises.
 */
export interface RecommendationInput extends Partial<RecommendationAssessment> {
    userId: string
    lineOfBusiness: string
    ruleId: string | null
    gapInstanceId: string | null
    title: { en: string; el: string }
    description: { en: string; el: string }
    urgency: GapSeverity
    estimatedCostEur: number | null
    personalReason: { en: string; el: string }
    matchedProductId?: string | null
}

/** Rows produced outside the risk catalog (policy + portfolio gaps) carry no assessment. */
const NO_ASSESSMENT: RecommendationAssessment = {
    riskId: null,
    riskStatus: null,
    confidence: null,
    expectedImpact: null,
    mitigations: null,
    suggestedSolution: null,
    eligibilityNote: null,
    coveredBy: null,
}

export interface MatchedProduct {
    id: string
    name: { en: string; el: string }
    premiumRangeLow: number | null
    premiumRangeHigh: number | null
    keyBenefits: Array<{ en: string; el: string }> | null
    greekMarketPopularity: number
}

export interface RecommendationOutput extends RecommendationAssessment {
    id: string
    lineOfBusiness: string
    ruleId: string | null
    title: { en: string; el: string }
    description: { en: string; el: string }
    /**
     * @deprecated Misnamed: this is the SEVERITY axis — how much the loss would
     * hurt — not how soon it needs attention. Read `priority` in new code. The
     * name is kept because fifteen surfaces (agent dashboards, the action queue,
     * the weekly digest email) and the persisted column both speak it; both
     * fields are assigned from one expression at one site, and a test pins them
     * equal so they cannot drift while the rename waits.
     */
    urgency: GapSeverity
    /** How much this matters. Same value as `urgency`, correctly named. */
    priority: GapSeverity
    /**
     * How SOON — the axis `urgency` never carried. Null on rows with no
     * assessment behind them (policy and portfolio findings).
     */
    timing: UrgencyVerdict | null
    /**
     * What this rests on: the things in their life that produce the risk, and
     * the policies that do or do not answer it. From the risk graph.
     */
    evidence: RecommendationEvidence[] | null
    /** What a licensed advisor adds here. Null when nothing is unresolved. */
    advisorOpportunity: { en: string; el: string } | null
    /** What changes for the customer if they act. */
    customerBenefit: { en: string; el: string } | null
    /**
     * The change that put this on the screen.
     *
     * Recovered from the risk-profile version in which this risk opened, which
     * records the trigger and any declared life event behind it. Null is a real
     * answer — a finding read out of a policy document was not caused by
     * anything in the customer's life, and no version history reaches back
     * before versioning existed. Attaching the nearest-looking event instead
     * would teach the reader that the explanations are decorative.
     */
    cause: {
        source: "version_event" | "version_trigger" | "exposing_event"
        explanation: { en: string; el: string }
    } | null
    estimatedCostEur: number | null
    personalReason: { en: string; el: string }
    status: string
    createdAt: Date
    matchedProduct: MatchedProduct | null
    /**
     * Evidence ladder of the linked gap (MEDIC): confirmed/validated lets the
     * card show that an advisor stands behind the finding; null/probable stays
     * a hedged informational suggestion. Never gates B2C display — it adds
     * advisor weight, it does not remove information.
     */
    gapValidationState: 'probable' | 'confirmed' | 'validated' | null
    /**
     * F5: the law/article behind the requirement this recommendation derives
     * from. Absent or null when it is not gap-derived or the requirement is
     * still under review. A render site that shows the recommendation shows this.
     */
    citation?: ProvenanceCitation | null
}

// ── Greek market premium estimates ───────────────────────────────────

/**
 * Order-of-magnitude annual premiums, so a recommendation can say roughly what
 * the missing cover costs rather than nothing at all.
 *
 * They are flat per line of business, which means they ignore every factor that
 * actually prices a policy: age for health and life, vehicle and driver history
 * for motor, sum insured and construction for home. So they are a starting
 * point, not a quote and not a market average — and the UI now says so rather
 * than presenting them as the "typical market cost".
 *
 * They are also no longer used to RANK anything. Premium is not exposure; see
 * prioritizeRecommendations.
 */
const ESTIMATED_ANNUAL_PREMIUMS: Record<string, number> = {
    motor: 400,
    home: 250,
    health: 800,
    life: 600,
    travel: 80,
    pet: 150,
    liability: 200,
    legal_expenses: 120,
    income_protection: 500,
    disability: 400,
    cyber: 100,
    // Lines the life-context catalog can now reach. Without an entry the card
    // silently shows no indicative cost at all, which reads as "we don't know
    // what this is" rather than "we didn't estimate".
    renters: 90,
    gadget: 120,
    personal_accident: 150,
    pension: 600,
    business: 700,
    // Consumer specialty lines. Wide ranges in the market, so these sit at the
    // low end of what a small craft or a modest collection costs to insure —
    // an indicative floor is more useful than a blank, and less misleading than
    // a midpoint drawn from superyachts.
    boat: 400,
    boat_tpl: 150,
    boat_hull: 900,
    fine_art: 250,
    // Commercial specialty lines are deliberately ABSENT. A cargo premium is a
    // function of shipment value and route, a fidelity premium of headcount and
    // controls; any single number here would be fiction, and `getEstimatedPremium`
    // returning null renders as "not estimated" rather than as a wrong figure.
}

export function getEstimatedPremium(lob: string): number | null {
    return ESTIMATED_ANNUAL_PREMIUMS[lob.toLowerCase()] ?? null
}

// ── Conversion ───────────────────────────────────────────────────────

/**
 * Convert profile gaps into recommendation inputs.
 *
 * @deprecated Superseded by `assessmentsToRecommendations`. Kept because the
 * legacy `ProfileGap` shape is still what `buildProfileGapEvidence` and several
 * tests speak; it carries no assessment payload, so cards built from it render
 * without a status chip rather than with a guessed one.
 */
export function profileGapsToRecommendations(
    userId: string,
    gaps: ProfileGap[]
): RecommendationInput[] {
    return gaps.map((gap) => ({
        ...NO_ASSESSMENT,
        userId,
        lineOfBusiness: gap.lineOfBusiness,
        ruleId: gap.ruleId,
        gapInstanceId: null,
        title: gap.name,
        description: gap.reason,
        urgency: gap.severity,
        estimatedCostEur: getEstimatedPremium(gap.lineOfBusiness),
        personalReason: gap.reason,
    }))
}

/**
 * Convert assessed risks into recommendation inputs.
 *
 * **Only open findings become recommendations.** `not_applicable`,
 * `needs_review` and `already_covered` are deliberately not persisted: a
 * recommendation is something we are asking the customer to consider, and none
 * of those three is. They are still returned by the engine for the dashboard,
 * which needs to be able to say "we checked this and it is not your risk" —
 * that is a statement about coverage of the assessment, not a suggestion.
 *
 * The mapping onto existing columns is deliberate rather than a parallel set:
 *   title           ← the risk's name
 *   description     ← what can go wrong (riskExplanation)
 *   personalReason  ← why it applies to THIS customer
 * with impact, solution, confidence and status in the new columns.
 */
export function assessmentsToRecommendations(
    userId: string,
    assessments: RiskAssessment[]
): RecommendationInput[] {
    return openFindings(assessments).map((a) => ({
        userId,
        lineOfBusiness: a.lineOfBusiness,
        ruleId: `risk:${a.riskId}`,
        gapInstanceId: null,
        title: a.name,
        description: a.riskExplanation,
        urgency: a.priority,
        estimatedCostEur: getEstimatedPremium(a.lineOfBusiness),
        personalReason: a.whyItApplies,
        riskId: a.riskId,
        riskStatus: a.status,
        confidence: a.confidence,
        expectedImpact: a.expectedImpact,
        mitigations: a.mitigations,
        suggestedSolution: a.suggestedSolution,
        eligibilityNote: a.eligibilityNote,
        coveredBy: a.coveredBy,
    }))
}

/**
 * Convert policy-level gap instances into recommendation inputs.
 */
export function policyGapsToRecommendations(
    userId: string,
    gapInstances: Array<{
        id: string
        severity: string
        aiExplanation: string | null
        aiExplanationEl: string | null
        aiSuggestion: string | null
        aiSuggestionEl: string | null
        policy: {
            lineOfBusiness: string
            insurerName: string
        } | null
        definition: {
            name: string
            slug: string
            description: string | null
        }
    }>
): RecommendationInput[] {
    const recs = gapInstances.map((gi) => {
        const lob = gi.policy?.lineOfBusiness ?? "other"
        const insurer = displayInsurerName(gi.policy?.insurerName)
        // Same resolver as the gap report, so a finding reads identically
        // wherever it surfaces — and the pipeline's raw English slug titles
        // ("Own-Vehicle-Damage") never reach the card.
        const content = resolveGapContent(gi.definition.slug, {
            lineOfBusiness: lob,
            aiExplanationEl: gi.aiExplanationEl,
            aiExplanation: gi.aiExplanation,
        })

        return {
            ...NO_ASSESSMENT,
            userId,
            lineOfBusiness: lob,
            ruleId: policyGapRuleId(lob, gi.definition.slug),
            gapInstanceId: gi.id,
            title: {
                en: content.titleEn,
                el: content.titleEl,
            },
            description: {
                en: gi.aiExplanation || gi.definition.description || content.titleEn,
                el: gi.aiExplanationEl || gi.definition.description || content.titleEl,
            },
            urgency: (gi.severity as GapSeverity) || "medium",
            estimatedCostEur: getEstimatedPremium(lob),
            personalReason: {
                // Through the primitive: `insurerName` can hold an extraction
                // sentinel ("Unknown Insurer") on a healthy policy, and this
                // fallback is STORED prose the dashboard renders — no downstream
                // scrub exists on this path (unlike notifications, which pass
                // dispatch). A placeholder degrades to naming no insurer at all.
                en: gi.aiSuggestion || (insurer
                    ? `Review your ${insurer} policy for this coverage gap.`
                    : `Review this policy for this coverage gap.`),
                el: gi.aiSuggestionEl || (insurer
                    ? `Ελέγξτε το ασφαλιστήριο ${insurer} για αυτό το κενό κάλυψης.`
                    : `Ελέγξτε το ασφαλιστήριό σας για αυτό το κενό κάλυψης.`),
            },
        }
    })

    // Two policies can carry the same gap, and one policy can carry the same
    // finding under two slugs — either way the user wants to read it once.
    return dedupeRecommendationInputs(recs)
}

/**
 * One recommendation per finding, keeping the most urgent of a colliding set.
 * Order-independent: the winner is chosen by severity, not by arrival.
 */
export function dedupeRecommendationInputs(
    recs: RecommendationInput[]
): RecommendationInput[] {
    const byKey = new Map<string, RecommendationInput>()
    const keyless: RecommendationInput[] = []

    for (const rec of recs) {
        const key = recommendationDedupeKey(rec)
        if (!key) {
            keyless.push(rec)
            continue
        }
        const existing = byKey.get(key)
        // The first rule wins: severity does not decide which duplicate survives (B1).
        if (!existing) {
            byKey.set(key, { ...rec, ruleId: key })
        }
    }

    return [...byKey.values(), ...keyless]
}

// ── Prioritization ───────────────────────────────────────────────────


/**
 * Sort recommendations by urgency, then by how much the missing cover matters.
 *
 * The tiebreak used to be `estimatedCostEur` descending, under the comment
 * "higher estimated cost = higher priority (bigger gap)". Premium is not
 * exposure — often it runs the other way. Liability cover is cheap precisely
 * because claims are rare, and the loss it stands between you and is the kind
 * that ends a household; ranking by price pushed it below health every single
 * time, for every user, because the price list is static.
 *
 * The protection model already states what matters (health 25, life 25,
 * property 20, income 15, liability 10, other 5). Ranking by that at least ranks
 * by an insurance judgement, and one the rest of the product already stands
 * behind. Ties fall back to the rule id so the order is stable between renders.
 */
/**
 * Layer 1 as a TIE-BREAK, and only a tie-break. Urgency and the protection
 * model still decide; among findings they cannot separate, the one touching a
 * domain the customer said matters comes first. A stated priority never
 * promotes a finding past a more urgent one, and never demotes anything —
 * it only orders equals, which is the only thing a self-report is evidence of.
 *
 * Which area a line belongs to is the attention-area table's answer
 * (lib/protection/domains.ts), not a private list here: every writable line
 * resolves to exactly one area, so `group_health`, `roadside`, `pension` and
 * `cyber` rank like any other line instead of falling through. `stated` holds
 * the protection map's row ids — what `topPriorityIds` emits and
 * `protection_profiles.priorityAreas` stores — so the match is on the area's
 * `priorityId` (`money:income`), which keeps the three faces of money apart.
 */
export function statedPriorityRank(lineOfBusiness: string, stated: readonly string[] | null | undefined): number {
    if (!stated || stated.length === 0) return Number.MAX_SAFE_INTEGER
    const area = areaForLob(lineOfBusiness)
    if (!area) return Number.MAX_SAFE_INTEGER
    const index = stated.indexOf(area.priorityId)
    return index === -1 ? Number.MAX_SAFE_INTEGER : index
}

type Orderable = { urgency: string; lineOfBusiness: string; ruleId?: string | null }

/** The ONE comparator both read paths use — protection weight, stated priority, rule id. Urgency is not an input (PW-TRANSPARENCY-02 B1). */
export function recommendationOrder(stated: readonly string[] | null | undefined = null) {
    return (a: Orderable, b: Orderable): number => {
        const weightDiff =
            lobProtectionWeight(b.lineOfBusiness) - lobProtectionWeight(a.lineOfBusiness)
        if (weightDiff !== 0) return weightDiff

        const statedDiff = statedPriorityRank(a.lineOfBusiness, stated) - statedPriorityRank(b.lineOfBusiness, stated)
        if (statedDiff !== 0) return statedDiff

        return String(a.ruleId || "").localeCompare(String(b.ruleId || ""))
    }
}

export function prioritizeRecommendations(
    recs: RecommendationInput[],
    stated: readonly string[] | null = null
): RecommendationInput[] {
    return [...recs].sort(recommendationOrder(stated))
}

// ── Product Matching ─────────────────────────────────────────────────

/**
 * Match recommendations to insurance products from the catalog.
 * Uses lineOfBusiness + idealProfileTags for best-fit matching.
 */
export async function matchProductsToRecommendations(
    recs: RecommendationInput[],
    profileTags: string[] = []
): Promise<RecommendationInput[]> {
    if (recs.length === 0) return recs

    const lobs = [...new Set(recs.map((r) => r.lineOfBusiness.toLowerCase()))]

    const products = await db.insuranceProduct.findMany({
        where: {
            lineOfBusiness: { in: lobs },
            isActive: true,
        },
        orderBy: [{ greekMarketPopularity: "desc" }, { sortOrder: "asc" }],
    })

    if (products.length === 0) return recs

    // Build a map: lob -> best product (prefer products whose idealProfileTags overlap with user tags)
    const productByLob = new Map<string, string>()
    for (const lob of lobs) {
        const lobProducts = products.filter(
            (p) => p.lineOfBusiness.toLowerCase() === lob
        )
        if (lobProducts.length === 0) continue

        // Score each product by tag overlap
        let best = lobProducts[0]
        let bestScore = 0
        for (const p of lobProducts) {
            const tags = p.idealProfileTags || []
            const overlap = tags.filter((t) => profileTags.includes(t)).length
            if (overlap > bestScore) {
                bestScore = overlap
                best = p
            }
        }
        productByLob.set(lob, best.id)
    }

    return recs.map((rec) => ({
        ...rec,
        matchedProductId:
            productByLob.get(rec.lineOfBusiness.toLowerCase()) ?? null,
    }))
}

/**
 * The complete profile-tag vocabulary deriveProfileTags can emit. The partner-
 * offer admin validates offer targeting against this list so a typo'd tag can
 * never silently match nothing.
 */
export const PROFILE_TAG_VALUES = [
    "homeowner",
    "has_pets",
    "has_vehicles",
    "has_dependents",
    "self_employed",
    "travels_frequently",
    "has_loans",
    "has_mortgage",
] as const

/**
 * Derive profile tags from profile fields for product matching.
 */
export function deriveProfileTags(profile: {
    ownsHome?: boolean
    hasPets?: boolean
    vehiclesCount?: number
    dependentsCount?: number
    employmentStatus?: string | null
    travelsFrequently?: boolean
    hasLoans?: boolean
    mortgageAmount?: number | null
}): string[] {
    const tags: string[] = []
    if (profile.ownsHome) tags.push("homeowner")
    if (profile.hasPets) tags.push("has_pets")
    if ((profile.vehiclesCount ?? 0) > 0) tags.push("has_vehicles")
    if ((profile.dependentsCount ?? 0) > 0) tags.push("has_dependents")
    if (profile.employmentStatus === "self_employed") tags.push("self_employed")
    if (profile.travelsFrequently) tags.push("travels_frequently")
    if (profile.hasLoans) tags.push("has_loans")
    if (profile.mortgageAmount && Number(profile.mortgageAmount) > 0) tags.push("has_mortgage")
    return tags
}

// ── Persistence ──────────────────────────────────────────────────────

/** A user dismissal we must respect; auto:* dismissals are ours to reverse. */
function isUserDismissal(dismissReason: string | null): boolean {
    return Boolean(dismissReason && !dismissReason.startsWith("auto:"))
}

/**
 * Legacy profile-rule ids and the catalog risk that replaced each one.
 *
 * A dismissal is the clearest signal a customer ever gives us: "I have
 * considered this and it is not for me." When the profile rules became catalog
 * risks every rule id changed, so on the first run after the switch every
 * dismissed card would have come back under a new id — the product forgetting,
 * on upgrade, the one thing the user took the trouble to tell it.
 *
 * Mapped only where the new risk is the SAME finding better expressed. The
 * deliberate omissions are `no_health` and `family_history_no_life`: those were
 * withdrawn as wrong, not renamed, and `health_access_delay` /
 * `chronic_condition_costs` ask a different question. Someone who dismissed a
 * claim we no longer make has not dismissed the one we now make.
 */
const LEGACY_RULE_REPLACEMENTS: Record<string, string> = {
    mortgage_no_life: "risk:life_debt",
    loans_no_life: "risk:life_debt",
    dependents_no_life: "risk:life_dependents",
    income_no_protection: "risk:income_interruption",
    vehicles_no_motor: "risk:motor_liability",
    homeowner_no_home: "risk:home_building_damage",
    pets_no_pet: "risk:pet_costs",
    travels_no_travel: "risk:travel_abroad",
    self_employed_no_liability: "risk:professional_liability",
    poor_driving_record_needs_legal: "risk:motor_legal_disputes",
    no_legal_expenses: "risk:home_legal_disputes",
}

/**
 * Sync recommendations to the database — exactly ONE row per (user, rule).
 *
 * The old read-then-write ("SELECT active → loop INSERT") had no transaction
 * and the table had no uniqueness, so the ten call sites — five of them
 * unawaited background promises — raced each other: a profile save plus a
 * home render plus a finished analysis produced THREE identical active rows
 * for the same rule, and «18 προτάσεις» counted them all. It also never
 * updated its in-loop seen-set (so duplicate ruleIds inside one batch each
 * inserted a row) and only looked at active rows (so a user's dismissal was
 * resurrected on the next run).
 *
 * Now: dedupe the batch by ruleId, upsert on the (userId, ruleId) unique key,
 * respect user dismissals, and run it all in one transaction.
 */
export async function syncRecommendations(
    userId: string,
    newRecs: RecommendationInput[]
): Promise<{ created: number; dismissed: number }> {
    // One entry per FINDING, not per spelling of it. dedupeRecommendationInputs
    // rewrites each rule id to its canonical `policy_gap:<lob>:<concept>` form
    // and keeps the most urgent of a colliding set — without it the (userId,
    // ruleId) uniqueness below is toothless, because one gap arriving under two
    // AI spellings is two rule ids, and two rule ids claim two rows.
    const byRuleId = new Map<string, RecommendationInput>()
    const unkeyed: RecommendationInput[] = []
    for (const rec of dedupeRecommendationInputs(newRecs)) {
        if (!rec.ruleId) {
            unkeyed.push(rec)
            continue
        }
        byRuleId.set(rec.ruleId, rec)
    }

    let created = 0
    let dismissed = 0

    const applySync = async () => {
        created = 0
        dismissed = 0
        await db.$transaction(async (tx) => {
        const existing = await tx.recommendationInstance.findMany({
            where: { userId },
            select: { id: true, ruleId: true, status: true, dismissReason: true },
        })
        const existingByRuleId = new Map(
            existing.filter((row) => row.ruleId).map((row) => [row.ruleId as string, row])
        )
        // Rule ids the customer dismissed under the old engine, translated to the
        // risk that replaced them, so an upgrade does not resurrect a card they
        // already told us to put away.
        const dismissedByReplacement = new Map<string, (typeof existing)[number]>()
        for (const row of existing) {
            const replacement = row.ruleId ? LEGACY_RULE_REPLACEMENTS[row.ruleId] : undefined
            if (!replacement) continue
            if (row.status === "dismissed" && isUserDismissal(row.dismissReason)) {
                dismissedByReplacement.set(replacement, row)
            }
        }

        for (const [ruleId, rec] of byRuleId) {
            const data = {
                gapInstanceId: rec.gapInstanceId,
                lineOfBusiness: rec.lineOfBusiness,
                title: rec.title as any,
                description: rec.description as any,
                urgency: rec.urgency,
                estimatedCostEur: rec.estimatedCostEur,
                personalReason: rec.personalReason as any,
                productId: rec.matchedProductId ?? null,
                riskId: rec.riskId ?? null,
                riskStatus: rec.riskStatus ?? null,
                confidence: rec.confidence ?? null,
                expectedImpact: (rec.expectedImpact ?? undefined) as any,
                mitigations: (rec.mitigations ?? undefined) as any,
                suggestedSolution: (rec.suggestedSolution ?? undefined) as any,
                eligibilityNote: (rec.eligibilityNote ?? undefined) as any,
            }

            const current = existingByRuleId.get(ruleId)
            if (!current) {
                // Carry a dismissal across the rename rather than re-asking.
                const dismissedPredecessor = dismissedByReplacement.get(ruleId)
                if (dismissedPredecessor) {
                    await tx.recommendationInstance.create({
                        data: {
                            userId,
                            ruleId,
                            status: "dismissed",
                            dismissReason: dismissedPredecessor.dismissReason,
                            ...data,
                        },
                    })
                    continue
                }
                await tx.recommendationInstance.create({
                    data: { userId, ruleId, status: "active", ...data },
                })
                created++
                continue
            }

            // The user said "not relevant" — do not resurrect it.
            if (current.status === "dismissed" && isUserDismissal(current.dismissReason)) {
                continue
            }

            await tx.recommendationInstance.update({
                where: { id: current.id },
                data: {
                    ...data,
                    ...(current.status === "active"
                        ? {}
                        : { status: "active", dismissReason: null }),
                },
            })
            if (current.status !== "active") created++
        }

        for (const rec of unkeyed) {
            await tx.recommendationInstance.create({
                data: {
                    userId,
                    gapInstanceId: rec.gapInstanceId,
                    lineOfBusiness: rec.lineOfBusiness,
                    ruleId: null,
                    title: rec.title as any,
                    description: rec.description as any,
                    urgency: rec.urgency,
                    estimatedCostEur: rec.estimatedCostEur,
                    personalReason: rec.personalReason as any,
                    status: "active",
                    productId: rec.matchedProductId ?? null,
                    riskId: rec.riskId ?? null,
                    riskStatus: rec.riskStatus ?? null,
                    confidence: rec.confidence ?? null,
                    expectedImpact: (rec.expectedImpact ?? undefined) as any,
                    mitigations: (rec.mitigations ?? undefined) as any,
                    suggestedSolution: (rec.suggestedSolution ?? undefined) as any,
                    eligibilityNote: (rec.eligibilityNote ?? undefined) as any,
                },
            })
            created++
        }

        // Rules that no longer fire: auto-dismiss (user dismissals stay put).
        // Rows written under a legacy rule id — before ids carried a concept —
        // land here too, which is how the table heals itself.
        const stale = existing.filter(
            (row) => row.status === "active" && row.ruleId && !byRuleId.has(row.ruleId)
        )
        if (stale.length > 0) {
            await tx.recommendationInstance.updateMany({
                where: { id: { in: stale.map((row) => row.id) } },
                data: { status: "dismissed", dismissReason: "auto:gap_resolved" },
            })
            dismissed = stale.length
        }
        })
    }

    try {
        await applySync()
    } catch (err: any) {
        // Two engine runs can pass the same existence check and race to the
        // insert — five of the ten call sites are unawaited background
        // promises. The unique constraint stops the duplicate row, but it does
        // so by aborting one transaction (P2002), and a poisoned transaction
        // cannot be caught from the inside. Run it again: the loser now SEES
        // the winner's row and updates it instead.
        if (err?.code !== "P2002") throw err
        await applySync()
    }

    // ONE notification for the run, never one per card. Someone who gains six
    // recommendations has learned one thing, not six, and six separate pings
    // is how a useful signal becomes something people switch off.
    if (created > 0) {
        const { emit } = await import("@/lib/notifications/dispatch")
        await emit({
            event: "recommendation_generated",
            userId,
            title:
                created === 1
                    ? { el: "Νέα πρόταση για εσάς", en: "A new recommendation for you" }
                    : { el: `${created} νέες προτάσεις για εσάς`, en: `${created} new recommendations for you` },
            message: {
                el: "Με βάση όσα ξέρουμε για τη ζωή σας και τα ασφαλιστήριά σας.",
                en: "Based on what we know about your life and your policies.",
            },
            relatedObjectType: "recommendation",
        })
    }

    return { created, dismissed }
}

/**
 * Dismiss a specific recommendation.
 */
export async function dismissRecommendation(
    recommendationId: string,
    userId: string,
    reason: string
): Promise<{ count: number }> {
    const result = await db.recommendationInstance.updateMany({
        where: {
            id: recommendationId,
            userId,
            status: "active",
        },
        data: {
            status: "dismissed",
            dismissReason: reason,
        },
    })
    return { count: result.count }
}

/**
 * Mark a recommendation as actioned (user took action).
 */
export async function actionRecommendation(
    recommendationId: string,
    userId: string
): Promise<{ count: number }> {
    const result = await db.recommendationInstance.updateMany({
        where: {
            id: recommendationId,
            userId,
            status: "active",
        },
        data: {
            status: "actioned",
            actionedAt: new Date(),
        },
    })
    return { count: result.count }
}

/**
 * Get active recommendations for a user, sorted by priority.
 *
 * `stated` is what the customer said matters — the tie-break for the order,
 * nothing more — as the protection map's row ids, derived LIVE by the caller
 * (`statedPriorityIds` in ./index.ts, from the facts and statements it already
 * loads). This function never reads `protection_profiles.priorityAreas`: that
 * column is the analytics snapshot taken at completion, frozen at that
 * moment, and it was ordering recommendations against a map the customer's
 * later answers had already redrawn.
 */
export async function getActiveRecommendations(
    userId: string,
    stated: readonly string[] | null = null
): Promise<RecommendationOutput[]> {
    const statedIds = stated
    // R3: a recommendation derived from an under-review finding is that finding
    // under another name — it leaves the list here, at the read.
    const recs = classifiedRecommendations(await db.recommendationInstance.findMany({
        where: {
            userId,
            status: "active",
        },
        include: {
            product: {
                select: {
                    id: true,
                    name: true,
                    premiumRangeLow: true,
                    premiumRangeHigh: true,
                    keyBenefits: true,
                    greekMarketPopularity: true,
                },
            },
            // Evidence ladder passthrough — lets the card show advisor weight.
            gapInstance: { select: { validationState: true, definition: { select: { slug: true } } } },
        },
        orderBy: [{ createdAt: "desc" }],
    }))

    // Same order as prioritizeRecommendations — urgency, then how much the
    // missing cover matters, never what it costs to buy.
    const sorted = recs.sort(recommendationOrder(statedIds))

    // Belt to the unique constraint's suspender: never render the same FINDING
    // twice, whatever legacy rows survive in the table. The constraint only
    // guards the rule id it is given, so rows written before rule ids carried a
    // concept (`policy_gap:own_vehicle_damage` beside `policy_gap:motor:own-damage`)
    // are distinct to the database and identical to the reader — they collapse
    // here on the next page load, and the next engine run retires them for good.
    // Most urgent survives: the list is already sorted by urgency.
    const seen = new Set<string>()
    const unique = sorted.filter((r) => {
        const key =
            recommendationDedupeKey({ ruleId: r.ruleId, lineOfBusiness: r.lineOfBusiness }) ??
            `${r.lineOfBusiness}:${readableTitleKey(r.title)}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
    })

    return unique.map((r) => ({
        id: r.id,
        lineOfBusiness: r.lineOfBusiness,
        ruleId: r.ruleId,
        title: r.title as { en: string; el: string },
        description: r.description as { en: string; el: string },
        urgency: r.urgency as GapSeverity,
        // One expression, both names — see the deprecation note on `urgency`.
        priority: r.urgency as GapSeverity,
        // Filled by `withRecommendationContext` from the LIVE assessment, not
        // from this row: the four context fields must reflect the profile as it
        // is now, even when the persisted row was written before the last change.
        timing: null,
        evidence: null,
        advisorOpportunity: null,
        customerBenefit: null,
        cause: null,
        estimatedCostEur: r.estimatedCostEur ? Number(r.estimatedCostEur) : null,
        personalReason: r.personalReason as { en: string; el: string },
        status: r.status,
        createdAt: r.createdAt,
        gapValidationState: r.gapInstance?.validationState ?? null,
        citation: recommendationCitation(r),
        // Null on rows written by the pre-assessment engine; the card renders
        // without a status chip rather than inventing one.
        riskId: r.riskId ?? null,
        riskStatus: (r.riskStatus as RiskStatus | null) ?? null,
        confidence: (r.confidence as RiskConfidence | null) ?? null,
        expectedImpact: (r.expectedImpact as { en: string; el: string } | null) ?? null,
        mitigations: (r.mitigations as Mitigation[] | null) ?? null,
        coveredBy: null,
        suggestedSolution: (r.suggestedSolution as { en: string; el: string } | null) ?? null,
        eligibilityNote: (r.eligibilityNote as { en: string; el: string } | null) ?? null,
        matchedProduct: r.product
            ? {
                  id: r.product.id,
                  name: r.product.name as { en: string; el: string },
                  premiumRangeLow: r.product.premiumRangeLow ? Number(r.product.premiumRangeLow) : null,
                  premiumRangeHigh: r.product.premiumRangeHigh ? Number(r.product.premiumRangeHigh) : null,
                  keyBenefits: r.product.keyBenefits as Array<{ en: string; el: string }> | null,
                  greekMarketPopularity: r.product.greekMarketPopularity,
              }
            : null,
    }))
}
