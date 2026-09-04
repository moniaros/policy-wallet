/**
 * The protection map — Layer 1 turned into "areas to check", on read.
 *
 * Deterministic rules over two stores: the FACTS the engine knows
 * (`LifeContext`) and the person's own STATEMENTS (`ProtectionProfile`). It
 * emits no score, no verdict and no coverage word: an entry says why an area
 * deserves attention and how well we know the input, and `requiresValidation`
 * is always true because nothing here has seen a policy. Layer 3's vocabulary
 * (protected / unprotected) is unrepresentable by type on purpose.
 *
 * Never persisted — computed on every read, so it cannot go stale — and never
 * summed: three high-priority areas are three sentences, not a number.
 */

import { AREAS, AREA_IDS, AREA_ORDER, type AttentionAreaId } from "@/lib/protection/domains"
import type { LifeContext } from "@/lib/services/gap-engine/life-context"
import { totalDependents } from "@/lib/services/gap-engine/life-context"
import type { Bilingual } from "@/lib/services/gap-engine/risk-types"
import type { MoneyFacet, PriorityDomain } from "./vocabulary"

export type PriorityImportance = "high" | "medium" | "watch" | "needs_review"
export type PriorityConfidence = "known" | "partial" | "unknown"

export interface ProtectionPriority {
    /** `household` | `residence` | `money:income` | … — the stable row id. */
    id: string
    domain: PriorityDomain
    facet?: MoneyFacet
    importance: PriorityImportance
    reason: { id: PriorityReasonId; text: Bilingual }
    /** How well we know the INPUT — never how well the person is covered. */
    confidence: PriorityConfidence
    /** Always true at Layer 1: no policy has been read yet. */
    requiresValidation: true
    /** needs_review = a fact we could not settle; unverified = a statement. */
    status: "needs_review" | "unverified"
    source: "declared_fact" | "stated_priority" | "both"
}

export type PriorityReasonId =
    | "stated_primary"
    | "stated_secondary"
    | "changed_recently"
    | "planned"
    | "dependants"
    | "income_dependency"
    | "owned_home"
    | "renting"
    | "debt"
    | "business"
    | "vehicle"
    | "health_everyone"
    | "mentioned_not_present"
    | "unsure"

/** Singular register — the onboarding's voice; the dashboard card wraps its own. */
const REASON_TEXT: Record<PriorityReasonId, Bilingual> = {
    stated_primary: { el: "Το ανέφερες ως αυτό που θα σε επηρέαζε περισσότερο.", en: "You named it as what would affect you most." },
    stated_secondary: { el: "Το ξεχώρισες κι εσύ.", en: "You singled it out too." },
    changed_recently: { el: "Άλλαξε πρόσφατα — αξίζει να το δούμε πρώτο.", en: "It changed recently — worth looking at first." },
    planned: { el: "Έρχεται σύντομα — καλύτερα να το προλάβουμε.", en: "It is coming up — better to get ahead of it." },
    dependants: { el: "Άλλοι βασίζονται σε σένα.", en: "Others depend on you." },
    income_dependency: { el: "Είπες ότι άλλοι βασίζονται στο εισόδημά σου.", en: "You said others rely on your income." },
    owned_home: { el: "Είπες ότι το σπίτι είναι δικό σου.", en: "You said the home is yours." },
    renting: { el: "Είπες ότι νοικιάζεις — τα πράγματά σου και η ευθύνη σου είναι δικά σου.", en: "You said you rent — your things and your liability are still yours." },
    debt: { el: "Είπες ότι τρέχει δάνειο ή άλλη υποχρέωση.", en: "You said a loan or another commitment is running." },
    business: { el: "Είπες ότι η δουλειά είναι δική σου.", en: "You said the work is your own." },
    vehicle: { el: "Είπες ότι οδηγείς.", en: "You said you drive." },
    health_everyone: { el: "Αφορά όλους — και αξίζει να ξέρεις τι ισχύει για σένα.", en: "It concerns everyone — and it is worth knowing what applies to you." },
    mentioned_not_present: { el: "Το ανέφερες εσύ — δεν φαίνεται να ισχύει σήμερα, αλλά το κρατάμε.", en: "You mentioned it — it does not seem to apply today, but we keep it." },
    unsure: { el: "Δεν το ξεκαθαρίσαμε — θα το δούμε όταν δούμε τις καλύψεις σου.", en: "We did not settle it — we will when we see your cover." },
}

export interface ProtectionStatementsLike {
    riskConcerns?: unknown
    commitments?: unknown
    recentChanges?: unknown
    futureConsiderations?: unknown
    unsureSteps?: unknown
}

type Presence = "yes" | "no" | "unsure"
type Concern = "primary" | "secondary" | "none"
type Change = "recent" | "planned" | "none"

/** What the facts and statements say about one area — the rule inputs. */
interface AreaRule {
    presence: Presence
    /** Reason used when the area is present and essential. */
    essential: PriorityReasonId | null
    confidence: PriorityConfidence
}

/** A rule joined to its row identity, which comes from the attention-area table. */
interface Area extends AreaRule {
    id: string
    domain: PriorityDomain
    facet?: MoneyFacet
}

function list(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : []
}

/** The map's row id for an attention area — `money:income` for the faces of money, the domain otherwise. */
const ROW = (area: AttentionAreaId): string => AREAS[area].priorityId

/** concern id → row id */
const CONCERN_AREA: Record<string, string> = {
    health: ROW("health"),
    family: ROW("household"),
    income: ROW("income"),
    home: ROW("residence"),
    obligation: ROW("debt"),
    vehicle: ROW("mobility"),
    business: ROW("work"),
}

/** recent change id → row id */
const CHANGE_AREA: Record<string, string> = {
    new_child: ROW("household"),
    married: ROW("household"),
    separated: ROW("household"),
    bought_home: ROW("residence"),
    started_renting: ROW("residence"),
    took_mortgage: ROW("debt"),
    income_changed: ROW("income"),
    started_business: ROW("work"),
    retired: ROW("retirement"),
    new_vehicle: ROW("mobility"),
    health_changed: ROW("health"),
}

/** future consideration id → row id */
const PLAN_AREA: Record<string, string> = {
    home_purchase: ROW("residence"),
    child: ROW("household"),
    business: ROW("work"),
    retirement: ROW("retirement"),
    move: ROW("residence"),
    large_purchase: ROW("property"),
}

/** row id → area id, the inverse of ROW. */
const AREA_BY_ROW: Record<string, AttentionAreaId> = Object.fromEntries(
    AREA_IDS.map((id) => [AREAS[id].priorityId, id])
) as Record<string, AttentionAreaId>

/**
 * The attention area a stated concern («τι θα σε επηρέαζε περισσότερο;») names.
 * `other` and an unknown id name nothing. Exported so the composition
 * (lib/protection/attention-areas.ts) reads the SAME table the map reads —
 * a second concern→area literal would be the drift this file exists to end.
 */
export function areaForConcern(concern: string): AttentionAreaId | undefined {
    const row = CONCERN_AREA[concern]
    return row ? AREA_BY_ROW[row] : undefined
}

/** The attention area a recent-change chip touches; `health_changed` → health. */
export function areaForRecentChange(change: string): AttentionAreaId | undefined {
    const row = CHANGE_AREA[change]
    return row ? AREA_BY_ROW[row] : undefined
}

export const IMPORTANCE_ORDER: Record<PriorityImportance, number> = { high: 0, medium: 1, watch: 2, needs_review: 3 }

/**
 * The rule inputs per area. Identity (domain, facet, row id) and display order
 * are NOT authored here — they come from the attention-area table
 * (lib/protection/domains.ts). `lifestyle` has no rule yet: the onboarding
 * never asks about travel, pets, activities or valuables («Δεν ρωτήσαμε
 * ακόμη…»), so the map has no row for it.
 */
function areaRules(ctx: LifeContext, s: ProtectionStatementsLike): Partial<Record<AttentionAreaId, AreaRule>> {
    const unsure = new Set(list(s.unsureSteps))
    const commitments = new Set(list(s.commitments))
    const plans = new Set(list(s.futureConsiderations))
    const earning = ctx.employmentStatus === "employed" || ctx.isSelfEmployed || ctx.ownsBusiness
    const employmentKnown = ctx.known.selfEmployed
    const dependants = totalDependents(ctx) > 0
    const householdKnown = ctx.known.children || ctx.known.dependents
    const householdPresence: Presence = householdKnown ? (dependants ? "yes" : "no") : unsure.has("people") ? "unsure" : "no"
    const debtPresence: Presence =
        commitments.has("mortgage") || commitments.has("loan") || (ctx.mortgageAmount ?? 0) > 0 || (ctx.loanAmount ?? 0) > 0
            ? "yes"
            : unsure.has("obligations")
              ? "unsure"
              : "no"
    const retired = ctx.employmentStatus === "retired" || plans.has("retirement")

    return {
        household: {
            presence: householdPresence,
            essential: "dependants",
            confidence: householdKnown ? "known" : "unknown",
        },
        health: {
            // Everyone has health to protect; we never asked a health fact, so
            // this area is a statement-only row by construction.
            presence: "yes",
            essential: null,
            confidence: "unknown",
        },
        income: {
            presence: employmentKnown ? (earning ? "yes" : "no") : "unsure",
            // Income is essential when someone else lives on it.
            essential: dependants ? "income_dependency" : null,
            // The brief's example row: an income priority reported at LOW
            // confidence while the income itself is unknown to the engine.
            confidence: ctx.known.income ? "known" : employmentKnown ? "partial" : "unknown",
        },
        residence: {
            presence: "yes",
            essential: ctx.residenceType === "owned" ? "owned_home" : ctx.residenceType === "rented" ? "renting" : null,
            confidence: ctx.known.residence ? "known" : "unknown",
        },
        debt: {
            presence: debtPresence,
            essential: "debt",
            confidence: debtPresence === "unsure" ? "unknown" : ctx.known.loans || ctx.known.mortgage ? "known" : "partial",
        },
        mobility: {
            presence: ctx.known.vehicles ? (ctx.vehiclesCount > 0 ? "yes" : "no") : "unsure",
            essential: "vehicle",
            confidence: ctx.known.vehicles ? "known" : "unknown",
        },
        work: {
            presence: employmentKnown ? (ctx.isSelfEmployed || ctx.ownsBusiness ? "yes" : "no") : "unsure",
            essential: "business",
            confidence: employmentKnown ? "known" : "unknown",
        },
        retirement: {
            presence: retired ? "yes" : "no",
            essential: null,
            confidence: employmentKnown ? "known" : "unknown",
        },
        property: {
            presence: ctx.propertiesOwned > 1 || ctx.rentsOutProperty || (ctx.valuablesValue ?? 0) > 0 ? "yes" : "no",
            essential: null,
            confidence: ctx.known.propertyOwnership ? "known" : "unknown",
        },
    }
}

/** The rows in the table's display order, skipping areas the onboarding has no rule for. */
function areas(ctx: LifeContext, s: ProtectionStatementsLike): Area[] {
    const rules = areaRules(ctx, s)
    const out: Area[] = []
    for (const areaId of AREA_ORDER) {
        const rule = rules[areaId]
        if (!rule) continue
        const { domain, facet, priorityId } = AREAS[areaId]
        out.push({ id: priorityId, domain, ...(facet ? { facet } : {}), ...rule })
    }
    return out
}

/** The rows §E's income-dependency answer speaks about: the household that lives on the income, and the income itself. */
const INCOME_DEPENDENCY_ROWS: readonly string[] = [ROW("household"), ROW("income")]

/**
 * §E / §H: «πόσο βασίζεται το νοικοκυριό σου στο εισόδημά σου;» is the single
 * strongest signal for the household and income rows — a FLOOR, never a
 * ceiling. `primary` with any dependant lifts both rows to at least `high`,
 * `shared` to at least `medium`, `minor` changes nothing; a row the person
 * already rated higher keeps its own reason. Only a PRESENT row is lifted: a
 * row that is unsure stays «χρειάζονται περισσότερα στοιχεία», and an income
 * row that is absent (a retiree's earned income) is not conjured into being.
 */
function incomeDependencyFloor(ctx: LifeContext, areaId: string): PriorityImportance | null {
    if (!INCOME_DEPENDENCY_ROWS.includes(areaId)) return null
    if (totalDependents(ctx) <= 0) return null
    if (ctx.incomeDependency === "primary") return "high"
    if (ctx.incomeDependency === "shared") return "medium"
    return null
}

/**
 * The rule table, first match wins:
 *   1. presence unsure                     → needs_review
 *   2. absent and never mentioned          → hidden
 *   3. absent but mentioned                → watch («you mentioned it»)
 *   4. primary concern ∨ recent change     → high
 *   5. secondary concern ∨ planned         → medium
 *   6. present and essential               → medium
 *   7. present                             → watch
 * then, on the household and income rows only, the income-dependency floor
 * (`incomeDependencyFloor`): a present row is lifted to at least the floor.
 */
export function deriveProtectionPriorities(
    ctx: LifeContext,
    statements: ProtectionStatementsLike | null
): ProtectionPriority[] {
    const s = statements ?? {}
    const concerns = list(s.riskConcerns)
    const concernOf = (areaId: string): Concern => {
        const at = concerns.findIndex((c) => CONCERN_AREA[c] === areaId)
        return at === 0 ? "primary" : at > 0 ? "secondary" : "none"
    }
    const changes = new Set(list(s.recentChanges).map((c) => CHANGE_AREA[c]).filter(Boolean))
    const plans = new Set(list(s.futureConsiderations).map((p) => PLAN_AREA[p]).filter(Boolean))
    const changeOf = (areaId: string): Change => (changes.has(areaId) ? "recent" : plans.has(areaId) ? "planned" : "none")

    const out: ProtectionPriority[] = []
    for (const area of areas(ctx, s)) {
        const concern = concernOf(area.id)
        const change = changeOf(area.id)
        const stated = concern !== "none" || change !== "none"
        const base = {
            id: area.id,
            domain: area.domain,
            ...(area.facet ? { facet: area.facet } : {}),
            confidence: area.confidence,
            requiresValidation: true as const,
        }
        const reason = (id: PriorityReasonId) => ({ id, text: REASON_TEXT[id] })

        if (area.presence === "unsure") {
            out.push({ ...base, importance: "needs_review", reason: reason("unsure"), status: "needs_review", source: stated ? "both" : "declared_fact" })
            continue
        }
        if (area.presence === "no" && !stated) continue
        if (area.presence === "no") {
            out.push({ ...base, importance: "watch", reason: reason("mentioned_not_present"), status: "unverified", source: "stated_priority" })
            continue
        }
        const source: ProtectionPriority["source"] = stated ? (area.essential ? "both" : "stated_priority") : "declared_fact"
        const status: ProtectionPriority["status"] = area.id === "health" ? "unverified" : "needs_review"
        let row: ProtectionPriority
        if (concern === "primary" || change === "recent") {
            row = { ...base, importance: "high", reason: reason(change === "recent" && concern !== "primary" ? "changed_recently" : "stated_primary"), status, source }
        } else if (concern === "secondary" || change === "planned") {
            row = { ...base, importance: "medium", reason: reason(change === "planned" && concern !== "secondary" ? "planned" : "stated_secondary"), status, source }
        } else if (area.essential) {
            row = { ...base, importance: "medium", reason: reason(area.essential), status, source }
        } else {
            row = {
                ...base,
                importance: "watch",
                reason: reason(area.id === "health" ? "health_everyone" : area.essential ?? "dependants"),
                status,
                source,
            }
        }
        const floor = incomeDependencyFloor(ctx, area.id)
        if (floor && IMPORTANCE_ORDER[floor] < IMPORTANCE_ORDER[row.importance]) {
            // Lifted by a declared fact: the reason says so, and the source
            // gains the fact even where a statement had already named the area.
            row = { ...row, importance: floor, reason: reason("income_dependency"), source: stated ? "both" : "declared_fact" }
        }
        out.push(row)
    }

    // high → medium → watch → needs_review; inside a tier, the person's own
    // ordering of concerns, then the authored area order (stable).
    const concernRank = (p: ProtectionPriority) => {
        const at = concerns.findIndex((c) => CONCERN_AREA[c] === p.id)
        return at < 0 ? 99 : at
    }
    return out
        .map((p, i) => ({ p, i }))
        .sort((a, b) =>
            IMPORTANCE_ORDER[a.p.importance] - IMPORTANCE_ORDER[b.p.importance] ||
            concernRank(a.p) - concernRank(b.p) ||
            a.i - b.i
        )
        .map(({ p }) => p)
}

/** The top domains as ids, for the analytics snapshot at completion. */
export function topPriorityIds(priorities: ProtectionPriority[], max = 3): string[] {
    return priorities.filter((p) => p.importance === "high" || p.importance === "medium").slice(0, max).map((p) => p.id)
}
