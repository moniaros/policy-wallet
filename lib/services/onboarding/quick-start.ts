/**
 * Three questions, one true thing.
 *
 * **The problem this exists for.** A product whose thesis is "we understand your
 * life, not your policies" asked for a policy first: nothing worked until the
 * customer uploaded a PDF or completed a twenty-two field wizard. That is the
 * wrong way round, and it is where a competitor beats us — the first thirty
 * seconds decide whether anyone comes back.
 *
 * Three questions is the budget. Not because three is a magic number, but
 * because it is roughly how far someone will go on trust before they have seen
 * anything, and because these three — where you live, who depends on you, what
 * you drive — are how an advisor actually opens a conversation.
 *
 * **The payoff must be true.** The finding is produced by the real engine over
 * the real catalog, not by a lookup table of nice-sounding statements. If the
 * answers do not imply anything worth saying, this says so rather than reaching
 * for a generic line: the whole product rests on the customer being able to
 * trust that what we tell them follows from what they told us.
 */

import type { Bilingual } from "@/lib/services/gap-engine/risk-types"
import { toLifeContext, type LifeContext } from "@/lib/services/gap-engine/life-context"
import { assessRisks } from "@/lib/services/gap-engine/risk-assessment"
import { factWritesFrom, type FactWrite } from "@/lib/services/protection-profile/fact-writes"

export type QuickStartQuestionId = "residence" | "children" | "vehicles"

export interface QuickStartOption {
    value: string
    label: Bilingual
}

export interface QuickStartQuestion {
    id: QuickStartQuestionId
    /** Asked as a person would ask it, not as a field label. */
    prompt: Bilingual
    options: QuickStartOption[]
}

/**
 * The three.
 *
 * Deliberately answerable without looking anything up. A question that sends
 * someone to find a document has already lost them, which is the entire failure
 * mode of the twenty-two-field wizard this sits in front of.
 */
export const QUICK_START_QUESTIONS: QuickStartQuestion[] = [
    {
        id: "residence",
        prompt: { en: "Where do you live?", el: "Πού μένετε;" },
        options: [
            { value: "rented", label: { en: "I rent", el: "Νοικιάζω" } },
            { value: "owned", label: { en: "I own my home", el: "Έχω δικό μου σπίτι" } },
            { value: "family", label: { en: "With family", el: "Με την οικογένεια" } },
        ],
    },
    {
        // Asked about children rather than "dependants" because the risk that
        // needs this requires BOTH facts known, and one question cannot answer
        // "dependants" and leave "children" open. Asking the narrower question
        // answers both honestly; the earlier phrasing left the whole answer
        // inert, so a customer with three children saw the same finding as one
        // with none — two of their three answers appearing to do nothing.
        id: "children",
        prompt: {
            en: "Do you have children who depend on you?",
            el: "Έχετε παιδιά που εξαρτώνται από εσάς;",
        },
        options: [
            { value: "0", label: { en: "No", el: "Όχι" } },
            { value: "1", label: { en: "One", el: "Ένα" } },
            { value: "2", label: { en: "Two", el: "Δύο" } },
            { value: "3", label: { en: "Three or more", el: "Τρία ή περισσότερα" } },
        ],
    },
    {
        id: "vehicles",
        prompt: { en: "Do you drive?", el: "Οδηγείτε;" },
        options: [
            { value: "0", label: { en: "No", el: "Όχι" } },
            { value: "1", label: { en: "One vehicle", el: "Ένα όχημα" } },
            { value: "2", label: { en: "Two or more", el: "Δύο ή περισσότερα" } },
        ],
    },
]

export type QuickStartAnswers = Partial<Record<QuickStartQuestionId, string>>

/**
 * The profile patch these answers imply.
 *
 * `answeredFields` is what separates "no" from "never asked" everywhere else in
 * the engine, so it is recorded here too — three answers must make three facts
 * *known*, not merely set three columns to values indistinguishable from
 * defaults.
 */
export function quickStartPatch(answers: QuickStartAnswers): Record<string, unknown> {
    const patch: Record<string, unknown> = {}
    const answered: string[] = []

    if (answers.residence) {
        patch.residenceType = answers.residence
        // Owning where you live is one property; the wizard refines the rest.
        patch.propertiesOwned = answers.residence === "owned" ? 1 : 0
        answered.push("residenceType", "propertiesOwned")
    }
    if (answers.children !== undefined) {
        const count = Number(answers.children)
        const children = Number.isFinite(count) ? Math.max(0, count) : 0
        patch.childrenCount = children
        // A FLOOR, not a claim of completeness: someone may also support a
        // parent. Understating is the safe direction — it can only make us say
        // less than is true — and the full wizard refines it.
        patch.dependentsCount = children
        answered.push("childrenCount", "dependentsCount")

        // "Children who depend on you" asserts there is something to depend on.
        // Reading that is not inference; it is what the question asked. Only in
        // the affirmative — "no" says nothing about whether there is an income.
        if (children > 0) {
            patch.employmentStatus = "employed"
            answered.push("employmentStatus")
        }
    }
    if (answers.vehicles !== undefined) {
        const count = Number(answers.vehicles)
        patch.vehiclesCount = Number.isFinite(count) ? Math.max(0, count) : 0
        answered.push("vehiclesCount")
    }

    patch.answeredFields = answered
    return patch
}

/**
 * The same three answers as fact writes, with their precision.
 *
 * Every column here is a bound or an inference except the residence itself:
 * «I own my home» → one property (a floor), «three or more» → 3, «two or
 * more» → 2, the dependant count is the child count (someone may also support
 * a parent), and «employed» is read off «children who depend on you». Marking
 * them coarse is what lets the wizard's figure replace them and never the
 * reverse — the non-overwrite rule this action used to hand-roll, now decided
 * by applyFactWrites.
 */
export function quickStartFactWrites(answers: QuickStartAnswers): FactWrite[] {
    const { answeredFields: _answered, ...columns } = quickStartPatch(answers)
    const coarse = new Set<string>(["propertiesOwned", "dependentsCount", "employmentStatus"])
    if (answers.children === "3") coarse.add("childrenCount")
    if (answers.vehicles === "2") coarse.add("vehiclesCount")
    return factWritesFrom(columns, {
        source: "quick_start",
        precision: Object.fromEntries([...coarse].map((c) => [c, "coarse" as const])),
    })
}

/**
 * Has the opener already been answered?
 *
 * Its own completion condition, deliberately. Gating on the health index —
 * which is what the first version did — meant the banner never disappeared:
 * three answers out of twenty-four factors is about a fifth of the picture, and
 * the index refuses to report below a third on honesty grounds. So the customer
 * answered three questions, the page reloaded, and asked them again.
 *
 * Two different questions: "do we know enough to score this person" and "have
 * we asked the opening three".
 */
export function quickStartComplete(ctx: LifeContext): boolean {
    return ctx.known.residence && ctx.known.children && ctx.known.vehicles
}

export interface FirstInsight {
    riskId: string
    /** The risk, named. */
    headline: Bilingual
    /** What it would actually cost them — the part that lands. */
    detail: Bilingual
    /** Why it follows from what they just told us. */
    because: Bilingual
    /** How many further risks the answers put in scope. */
    alsoFound: number
}

/**
 * Risks whose cover is compulsory, and therefore almost certainly already held.
 *
 * Excluded from the first insight for a reason that took seeing the output to
 * notice: at this point the wallet is empty because **we have not looked yet**,
 * not because the customer is uninsured. The engine cannot tell those apart, so
 * a driver was greeted with "driving without compulsory cover" — an accusation
 * that is both very likely false and enforced by law in Greece, i.e. the single
 * fastest way to lose someone in the first ten seconds.
 *
 * They are also the least interesting thing we could say. Everyone knows they
 * need motor cover. The findings worth opening with are the ones people have
 * genuinely not considered.
 */
const ASSUMED_ALREADY_HELD = new Set(["motor_liability", "boat_liability"])

/**
 * The one thing worth saying, from three answers.
 *
 * Run through the real assessment so the statement is derived rather than
 * authored. Highest priority wins; ties break toward the risk with the most
 * concrete impact, which in this catalog means the one that quantifies a loss.
 *
 * Returns null when the answers genuinely imply nothing open — a renter with no
 * dependants and no car is a real customer, and inventing a finding for them
 * would be the product-driven behaviour the whole engine was rebuilt to remove.
 */
export function firstInsight(answers: QuickStartAnswers, now: Date = new Date()): FirstInsight | null {
    // "From what you told us" has to depend on what they told us. Some risks —
    // public-healthcare waiting times, for one — apply to everyone in Greece
    // regardless of profile, so with no answers this returned a finding that
    // would have been identical before the customer touched anything. True, but
    // it is not what the screen promises.
    if (Object.keys(answers).length === 0) return null

    const patch = quickStartPatch(answers)
    return insightFromContext(toLifeContext(patch as any, now))
}

/**
 * The same one true thing, from a context that already exists — the first-stage
 * onboarding writes its facts to the profile and asks for the insight on the
 * map screen, where `firstInsight(answers)`'s three-answer shape no longer
 * applies. Same engine, same exclusions, same honesty: applicable, not open.
 */
export function insightFromContext(ctx: LifeContext): FirstInsight | null {
    const assessments = assessRisks(ctx, [])

    // APPLICABLE, not open. `openFindings` means "applies and nothing covers
    // it", and with an empty wallet that second half is not something we know.
    // At this stage the honest claim is only the first half: this is a risk
    // your situation carries. What covers it comes after we have seen a policy.
    const applicable = assessments.filter((a) => a.applicability === "applicable")
    const candidates = applicable.filter((a) => !ASSUMED_ALREADY_HELD.has(a.riskId))
    if (candidates.length === 0) return null

    const rank: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
    const worst = [...candidates].sort((a, b) => (rank[a.priority] ?? 9) - (rank[b.priority] ?? 9))[0]

    return {
        riskId: worst.riskId,
        headline: worst.name,
        detail: worst.expectedImpact,
        because: worst.whyItApplies,
        alsoFound: applicable.length - 1,
    }
}
