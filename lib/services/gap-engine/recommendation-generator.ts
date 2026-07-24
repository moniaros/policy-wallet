/**
 * Recommendation Generator
 *
 * Converts detected profile gaps and policy gaps into prioritized,
 * personalized recommendation instances. Handles deduplication,
 * persistence, and lifecycle management.
 */

import { db } from "@/lib/db"
import { resolveGapConcept, resolveGapContent } from "@/lib/wallet/gap-report"
import type { ProfileGap, GapSeverity } from "./profile-gap-rules"
import { lobProtectionWeight } from "./protection-score"

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

export interface RecommendationInput {
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

export interface MatchedProduct {
    id: string
    name: { en: string; el: string }
    premiumRangeLow: number | null
    premiumRangeHigh: number | null
    keyBenefits: Array<{ en: string; el: string }> | null
    greekMarketPopularity: number
}

export interface RecommendationOutput {
    id: string
    lineOfBusiness: string
    ruleId: string | null
    title: { en: string; el: string }
    description: { en: string; el: string }
    urgency: GapSeverity
    estimatedCostEur: number | null
    personalReason: { en: string; el: string }
    status: string
    createdAt: Date
    matchedProduct: MatchedProduct | null
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
}

export function getEstimatedPremium(lob: string): number | null {
    return ESTIMATED_ANNUAL_PREMIUMS[lob.toLowerCase()] ?? null
}

// ── Conversion ───────────────────────────────────────────────────────

/**
 * Convert profile gaps into recommendation inputs.
 */
export function profileGapsToRecommendations(
    userId: string,
    gaps: ProfileGap[]
): RecommendationInput[] {
    return gaps.map((gap) => ({
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
        // Same resolver as the gap report, so a finding reads identically
        // wherever it surfaces — and the pipeline's raw English slug titles
        // ("Own-Vehicle-Damage") never reach the card.
        const content = resolveGapContent(gi.definition.slug, {
            lineOfBusiness: lob,
            aiExplanationEl: gi.aiExplanationEl,
            aiExplanation: gi.aiExplanation,
        })

        return {
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
                en: gi.aiSuggestion || `Review your ${gi.policy?.insurerName ?? ""} policy for this coverage gap.`,
                el: gi.aiSuggestionEl || `Ελέγξτε το ασφαλιστήριο ${gi.policy?.insurerName ?? ""} για αυτό το κενό κάλυψης.`,
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
        const isMoreUrgent =
            existing != null &&
            (SEVERITY_ORDER[rec.urgency] ?? 3) < (SEVERITY_ORDER[existing.urgency] ?? 3)
        if (!existing || isMoreUrgent) {
            byKey.set(key, { ...rec, ruleId: key })
        }
    }

    return [...byKey.values(), ...keyless]
}

// ── Prioritization ───────────────────────────────────────────────────

const SEVERITY_ORDER: Record<GapSeverity, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
}

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
export function prioritizeRecommendations(
    recs: RecommendationInput[]
): RecommendationInput[] {
    return [...recs].sort((a, b) => {
        const sevDiff =
            (SEVERITY_ORDER[a.urgency] ?? 3) -
            (SEVERITY_ORDER[b.urgency] ?? 3)
        if (sevDiff !== 0) return sevDiff

        const weightDiff =
            lobProtectionWeight(b.lineOfBusiness) - lobProtectionWeight(a.lineOfBusiness)
        if (weightDiff !== 0) return weightDiff

        return String(a.ruleId || "").localeCompare(String(b.ruleId || ""))
    })
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
            }

            const current = existingByRuleId.get(ruleId)
            if (!current) {
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
 */
export async function getActiveRecommendations(
    userId: string
): Promise<RecommendationOutput[]> {
    const recs = await db.recommendationInstance.findMany({
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
        },
        orderBy: [{ createdAt: "desc" }],
    })

    // Same order as prioritizeRecommendations — urgency, then how much the
    // missing cover matters, never what it costs to buy.
    const sorted = recs.sort((a, b) => {
        const sevDiff =
            (SEVERITY_ORDER[(a.urgency as GapSeverity)] ?? 3) -
            (SEVERITY_ORDER[(b.urgency as GapSeverity)] ?? 3)
        if (sevDiff !== 0) return sevDiff
        const weightDiff =
            lobProtectionWeight(b.lineOfBusiness) - lobProtectionWeight(a.lineOfBusiness)
        if (weightDiff !== 0) return weightDiff
        return String(a.ruleId || "").localeCompare(String(b.ruleId || ""))
    })

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
        estimatedCostEur: r.estimatedCostEur ? Number(r.estimatedCostEur) : null,
        personalReason: r.personalReason as { en: string; el: string },
        status: r.status,
        createdAt: r.createdAt,
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
