/**
 * Binding risks to the graph, and evaluating how well each is protected.
 *
 * Two things happen here that the flat engine could not do:
 *
 * 1. **Risks anchor to specific nodes.** `home_building_damage` on a customer
 *    with two properties produces two anchored instances, so "which one is
 *    insured" becomes a question the model can hold. `minPolicies` compared
 *    counts because there was nothing to point at.
 *
 * 2. **Protection is evaluated on dimensions** — peril, limit, territory,
 *    period — so `partially_protected` stops collapsing into `protected`. A home
 *    policy without earthquake in a seismic country is not "covered", and saying
 *    so was previously impossible.
 *
 * Only dimensions we can actually ask are emitted. A dimension that is permanently
 * unevaluable is worse than an absent one: it reads as "we checked and could not
 * tell" when there was never a question, it makes states unreachable, and — since
 * these verdicts now feed the protection score — it quietly docks people for our
 * own missing extraction. Territory, which nothing populates yet, is the case
 * that taught this twice.
 *
 * Everything is derived. Deleting this module leaves the risk engine producing
 * exactly what it produced before the graph existed.
 */

import { getBranchFamily, normalizeBranch } from "@/lib/insurance/taxonomy"
import { calendarDaysUntil } from "@/lib/policy-status"
import { formatCurrency } from "@/lib/i18n/format"
import { displayInsurerName } from "@/lib/wallet/policy-identity"
import { outstandingDebt, type LifeContext } from "@/lib/services/gap-engine/life-context"
import type { Bilingual, RiskAssessment } from "@/lib/services/gap-engine/risk-types"
import type {
    DimensionAssessment,
    Evidence,
    GraphRisk,
    PersonalRiskGraph,
    RiskState,
} from "./types"

/** A policy, reduced to what protection evaluation needs. */
export interface ProtectingPolicy {
    id: string
    lineOfBusiness: string
    /** Derived coverage status — never the stale stored column. */
    status: string
    insurerName?: string | null
    /** Perils named by extraction, when readable. */
    perils?: string[] | null
    /**
     * Territories named by extraction, when readable.
     *
     * Nothing populates this yet — territorial limits are not extracted. That
     * is exactly why it is a field rather than an assumption: the territory
     * dimension is emitted only when a policy actually carries one, so the
     * absence of extraction costs the customer nothing.
     */
    territories?: string[] | null
    /** Sum insured, when readable. Null means unevaluable, never zero. */
    sumInsured?: number | null
    endDate?: Date | null
}

/**
 * Which node types each risk anchors to.
 *
 * The anchor is the identity: one instance per matched node, so two properties
 * produce two independently-protectable risks. Risks with no entry here are
 * subject-wide (retirement, health access) and anchor to the person.
 */
const RISK_ANCHORS: Record<
    string,
    { nodeTypes: string[]; filter?: (attrs: Record<string, unknown>) => boolean }
> = {
    home_building_damage: { nodeTypes: ["property"], filter: (a) => a.ownedBySubject !== false },
    home_contents_tenant: { nodeTypes: ["property"], filter: (a) => a.occupancy === "rented" },
    landlord_letting: { nodeTypes: ["property"], filter: (a) => a.isLet === true },
    home_legal_disputes: { nodeTypes: ["property"] },
    motor_liability: { nodeTypes: ["vehicle"] },
    motor_legal_disputes: { nodeTypes: ["vehicle"] },
    boat_liability: { nodeTypes: ["vessel"] },
    valuables_loss: { nodeTypes: ["valuable"] },
    pet_costs: { nodeTypes: ["pet"] },
    life_dependents: { nodeTypes: ["dependent"] },
    // Both kinds of debt, because the risk applies on total outstanding debt.
    // Anchoring to `mortgage` alone left a customer with a car loan and no
    // mortgage holding a risk that pointed at nothing in their life.
    life_debt: { nodeTypes: ["mortgage", "loan"] },
    cyber_fraud: { nodeTypes: ["digital_asset"] },
    travel_abroad: { nodeTypes: ["travel"] },
    activity_injury: { nodeTypes: ["activity"] },
    chronic_condition_costs: { nodeTypes: ["health_condition"] },
    employer_liability: { nodeTypes: ["business"] },
    business_assets_interruption: { nodeTypes: ["business"] },
    professional_liability: { nodeTypes: ["occupation"] },
    income_interruption: { nodeTypes: ["income"] },
}

/** Perils a line is normally expected to answer, for the peril dimension. */
const EXPECTED_PERILS: Record<string, string[]> = {
    home: ["fire", "earthquake", "flood", "theft"],
    renters: ["fire", "theft", "liability"],
    motor: ["liability"],
    boat: ["liability"],
}

/**
 * Perils a specific RISK needs answered, overriding its line's expectations.
 *
 * The line is what the policy is; the risk is what the customer needs. Valuables
 * are typically answered by a contents policy under `alsoCoveredBy`, and the
 * `gadget` line has no peril expectations of its own — so a home policy naming
 * only fire reported the customer's jewellery as fully `protected`. Theft is the
 * whole question for valuables, and the risk knows that even when the line does
 * not.
 */
const EXPECTED_PERILS_BY_RISK: Record<string, string[]> = {
    valuables_loss: ["theft"],
    home_contents_tenant: ["fire", "theft"],
}

function expectedPerils(riskId: string, line: string): string[] {
    return EXPECTED_PERILS_BY_RISK[riskId] ?? EXPECTED_PERILS[normalizeBranch(line).id] ?? []
}

/**
 * Peril names, in the reader's language.
 *
 * The raw tokens are extraction keys, not copy — listing them verbatim put
 * "earthquake, flood, theft" inside an otherwise Greek sentence.
 */
const PERIL_LABELS: Record<string, Bilingual> = {
    fire: { en: "fire", el: "πυρκαγιά" },
    earthquake: { en: "earthquake", el: "σεισμός" },
    flood: { en: "flood", el: "πλημμύρα" },
    theft: { en: "theft", el: "κλοπή" },
    liability: { en: "liability", el: "αστική ευθύνη" },
}

const perilLabel = (peril: string, lang: "en" | "el") =>
    PERIL_LABELS[peril]?.[lang] ?? peril

/**
 * Risks for which *where* the loss happens is a live question.
 *
 * Two separate conditions gate the territory dimension, and both had to be
 * learned the hard way. First, geography must be able to go wrong at all — a
 * Greek home policy on a Greek flat cannot be territorially misplaced, because
 * the risk's location IS the policy's subject; evaluating it anyway and
 * answering "unevaluable" made `protected` unreachable for everybody. Second,
 * we must actually hold territorial data. Nothing extracts it today, so scoping
 * the dimension to these five risks alone still left every insured motorist,
 * traveller and boat owner permanently `partially_protected` — a shrug with no
 * information in it, now docking their protection score as well.
 *
 * So the dimension is emitted only when a matched policy carries territories to
 * compare. A question we cannot ask of anyone is not a question.
 */
const TERRITORY_MATERIAL = new Set([
    "travel_abroad",
    "motor_liability",
    "motor_legal_disputes",
    "boat_liability",
    "activity_injury",
])

function anchorsFor(graph: PersonalRiskGraph, riskId: string): string[] {
    const spec = RISK_ANCHORS[riskId]
    if (!spec) return graph.byType.person
    return graph.nodes
        .filter((n) => spec.nodeTypes.includes(n.type) && (!spec.filter || spec.filter(n.attributes)))
        .map((n) => n.id)
}

/**
 * Policies whose branch family answers this line — of ANY lifecycle status.
 *
 * This is the OWNERSHIP question (§2.2): does the customer hold a product in
 * this line at all? Liveness is a separate question, filtered by the caller —
 * an expired motor policy is still a held product, and the distinction is
 * what lets presentation render "you do not hold this" differently from
 * "what you hold no longer covers you".
 */
function policiesInLine(line: string, alsoLines: string[], policies: ProtectingPolicy[]): ProtectingPolicy[] {
    const accepted = new Set<string>()
    for (const lob of [line, ...alsoLines]) {
        for (const id of getBranchFamily(lob.toLowerCase())) accepted.add(id)
    }
    return policies.filter((p) => accepted.has(normalizeBranch(p.lineOfBusiness).id))
}

// ── Dimensions ───────────────────────────────────────────────────────

function assessPeril(riskId: string, line: string, matched: ProtectingPolicy[]): DimensionAssessment {
    const expected = expectedPerils(riskId, line)
    if (expected.length === 0 || matched.length === 0) {
        return {
            dimension: "peril",
            verdict: matched.length === 0 ? "failed" : "satisfied",
            detail:
                matched.length === 0
                    ? { en: "No policy answers this risk.", el: "Κανένα ασφαλιστήριο δεν καλύπτει αυτόν τον κίνδυνο." }
                    : { en: "Cover is in place for this line.", el: "Υπάρχει κάλυψη για αυτόν τον κλάδο." },
        }
    }

    const declared = new Set(matched.flatMap((p) => (p.perils ?? []).map((x) => x.toLowerCase())))
    if (declared.size === 0) {
        // Extraction could not read the perils. That is not evidence of absence.
        return {
            dimension: "peril",
            verdict: "unevaluable",
            detail: {
                en: "We could not read which perils this policy covers, so we cannot confirm them.",
                el: "Δεν μπορέσαμε να διαβάσουμε ποιους κινδύνους καλύπτει το ασφαλιστήριο, οπότε δεν μπορούμε να τους επιβεβαιώσουμε.",
            },
        }
    }

    const missing = expected.filter((p) => !declared.has(p))
    return {
        dimension: "peril",
        verdict: missing.length === 0 ? "satisfied" : "failed",
        detail:
            missing.length === 0
                ? { en: "Every peril we would expect is named.", el: "Κατονομάζονται όλοι οι κίνδυνοι που θα περιμέναμε." }
                : {
                      en: `Not named on the policy: ${missing.map((p) => perilLabel(p, "en")).join(", ")}.`,
                      el: `Δεν κατονομάζονται στο ασφαλιστήριο: ${missing.map((p) => perilLabel(p, "el")).join(", ")}.`,
                  },
    }
}

/**
 * The smallest sum insured that could answer this risk, where we can compute one.
 *
 * Only debt gives an unarguable floor, and only for the two risks debt defines:
 * a lender requires building cover at least the size of the loan it secures, and
 * cover meant to stop debt outliving you has to be at least the debt. Everything
 * else — is €150k enough to rebuild this particular flat — needs a property value
 * the profile does not hold, so no number is invented for it.
 */
function requiredMinimum(riskId: string, ctx: LifeContext): number | null {
    const mortgage = ctx.mortgageAmount ?? 0
    if (riskId === "home_building_damage" && mortgage > 0) return mortgage
    if (riskId === "life_debt") {
        const debt = outstandingDebt(ctx)
        return debt > 0 ? debt : null
    }
    return null
}

function assessLimit(matched: ProtectingPolicy[], minimum: number | null): DimensionAssessment {
    if (matched.length === 0) {
        return {
            dimension: "limit",
            verdict: "failed",
            detail: { en: "Nothing to compare — no cover in place.", el: "Δεν υπάρχει τι να συγκριθεί — καμία κάλυψη." },
        }
    }
    const readable = matched.filter((p) => typeof p.sumInsured === "number" && Number.isFinite(p.sumInsured))
    if (readable.length === 0) {
        // The sum insured lives in extraction data that is frequently
        // unreadable. Unknown is the honest answer, and it is why this
        // dimension is the main source of `partially_protected` today.
        return {
            dimension: "limit",
            verdict: "unevaluable",
            detail: {
                en: "We could not read a sum insured, so we cannot tell whether the amount is enough.",
                el: "Δεν μπορέσαμε να διαβάσουμε ασφαλισμένο κεφάλαιο, οπότε δεν ξέρουμε αν το ποσό επαρκεί.",
            },
        }
    }

    // Where a floor exists, compare against it. Reporting "satisfied" merely
    // because a number could be read let €10,000 of cover on a house carrying a
    // €180,000 mortgage roll all the way up to `protected`.
    const total = readable.reduce((sum, p) => sum + (p.sumInsured as number), 0)
    if (minimum !== null && total < minimum) {
        return {
            dimension: "limit",
            verdict: "failed",
            detail: {
                en: `The sum insured (${formatCurrency(total, "en")}) is below the ${formatCurrency(minimum, "en")} of debt this needs to answer.`,
                el: `Το ασφαλισμένο κεφάλαιο (${formatCurrency(total, "el")}) υπολείπεται του χρέους των ${formatCurrency(minimum, "el")} που καλείται να καλύψει.`,
            },
        }
    }

    return {
        dimension: "limit",
        verdict: "satisfied",
        detail:
            minimum !== null
                ? {
                      en: `The sum insured (${formatCurrency(total, "en")}) covers the ${formatCurrency(minimum, "en")} of debt behind it.`,
                      el: `Το ασφαλισμένο κεφάλαιο (${formatCurrency(total, "el")}) καλύπτει το χρέος των ${formatCurrency(minimum, "el")} πίσω από αυτό.`,
                  }
                : { en: "A sum insured is recorded.", el: "Έχει καταγραφεί ασφαλισμένο κεφάλαιο." },
    }
}

/** Greece plus the EEA — where a Greek policyholder's cover is expected to run. */
const EXPECTED_TERRITORY = ["greece", "eea", "europe", "worldwide"]

function assessTerritory(matched: ProtectingPolicy[]): DimensionAssessment {
    const declared = new Set(
        matched.flatMap((p) => (p.territories ?? []).map((x) => x.toLowerCase()))
    )
    const covered = EXPECTED_TERRITORY.some((t) => declared.has(t))
    return {
        dimension: "territory",
        verdict: covered ? "satisfied" : "failed",
        detail: covered
            ? { en: "Cover runs where you are.", el: "Η κάλυψη ισχύει εκεί που βρίσκεστε." }
            : {
                  en: `The policy names only: ${[...declared].join(", ")}.`,
                  el: `Το ασφαλιστήριο αναφέρει μόνο: ${[...declared].join(", ")}.`,
              },
    }
}

function assessPeriod(matched: ProtectingPolicy[], now: Date): DimensionAssessment {
    if (matched.length === 0) {
        return {
            dimension: "period",
            verdict: "failed",
            detail: { en: "No cover in force.", el: "Καμία κάλυψη σε ισχύ." },
        }
    }
    // Expiry is a calendar fact on the Athens calendar, not an instant — the
    // one clock in lib/policy-status answers it. Comparing milliseconds here
    // would call a policy live for the three hours after the customer's own
    // calendar had already rolled past its last day.
    //
    // An unreadable date is treated exactly as a missing one, which is what
    // `coverageEngineStatus` already does with it. Deciding differently here
    // would put two clocks on the same policy — the defect this comment's
    // first paragraph exists to prevent — and `calendarDaysUntil` throws on an
    // invalid Date rather than answering, which took the whole graph with it.
    const readable = (d: Date | null | undefined): d is Date =>
        d instanceof Date && !Number.isNaN(d.getTime())
    const live = matched.filter((p) => !readable(p.endDate) || calendarDaysUntil(p.endDate, now) >= 0)
    return {
        dimension: "period",
        verdict: live.length > 0 ? "satisfied" : "failed",
        detail:
            live.length > 0
                ? { en: "Cover is in force today.", el: "Η κάλυψη είναι σε ισχύ σήμερα." }
                : { en: "Every matching policy has expired.", el: "Κάθε σχετικό ασφαλιστήριο έχει λήξει." },
    }
}

/**
 * Roll the dimension verdicts into one state.
 *
 * The dimensions are not peers. `period` asks whether cover EXISTS today; peril,
 * limit and territory ask whether it is ADEQUATE. Treating them alike made
 * `unknown` unreachable — period is always evaluable, so "every dimension
 * unevaluable" could never happen, and a policy we knew nothing about except its
 * dates reported as partially protected rather than honestly unknown.
 *
 * So: no cover, or cover not in force, is `unprotected` — a finding, not a
 * shrug. Beyond that the verdict is entirely about adequacy.
 */
export function rollUpState(dimensions: DimensionAssessment[], hasCover: boolean): RiskState {
    if (!hasCover) return "unprotected"

    // Expired cover is not cover. (Usually filtered upstream by derived status;
    // kept here so the function is correct on its own terms.)
    if (dimensions.some((d) => d.dimension === "period" && d.verdict === "failed")) {
        return "unprotected"
    }

    const adequacy = dimensions.filter((d) => d.dimension !== "period")
    if (adequacy.length === 0) return "protected"

    if (adequacy.some((d) => d.verdict === "failed")) return "partially_protected"
    if (adequacy.every((d) => d.verdict === "unevaluable")) return "unknown"
    if (adequacy.some((d) => d.verdict === "unevaluable")) return "partially_protected"
    return "protected"
}

// ── Evidence ─────────────────────────────────────────────────────────

/**
 * Why we say this risk exists, and why we say it is protected as it is.
 *
 * Structured rather than prose. `whyItApplies` explains to a reader; this
 * substantiates to anyone who asks "on what basis" — an advisor defending a
 * recommendation, a customer challenging one, or a test.
 */
function buildEvidence(
    assessment: RiskAssessment,
    graph: PersonalRiskGraph,
    anchorIds: string[],
    matched: ProtectingPolicy[],
    dimensions: DimensionAssessment[],
    shortOfAnchors: boolean
): Evidence[] {
    const evidence: Evidence[] = []

    // What in their life produces the risk.
    //
    // The phrasing is a LABELLED form, not a sentence with the label as its
    // subject. `${label} is recorded…` produced "You is recorded in your
    // profile." for every subject-wide risk, and "Valuables is recorded…" for
    // plurals; the Greek was worse, since «καταγεγραμμένο» has to agree in
    // gender and number with nouns ranging from «η επιχείρησή σας» to «τα δάνειά
    // σας». No single template can inflect for all of them — so don't inflect.
    for (const nodeId of anchorIds) {
        const node = graph.nodes.find((n) => n.id === nodeId)
        if (!node) continue
        evidence.push({
            kind: "declared_fact",
            nodeId,
            statement:
                node.type === "person"
                    ? {
                          en: "This is a risk you carry personally.",
                          el: "Πρόκειται για κίνδυνο που φέρετε προσωπικά.",
                      }
                    : {
                          en: `From your profile: ${node.label.en}.`,
                          el: `Από το προφίλ σας: ${node.label.el}.`,
                      },
            confidence: node.confidence,
        })
    }

    // What answers it, or the fact that nothing does.
    if (matched.length === 0) {
        evidence.push({
            kind: "absence",
            statement: {
                en: "No live policy in your wallet answers this risk.",
                el: "Κανένα ενεργό ασφαλιστήριο στο πορτοφόλι σας δεν καλύπτει αυτόν τον κίνδυνο.",
            },
            confidence: "derived",
        })
    } else {
        for (const policy of matched) {
            // The branch's own display label, not the raw `lineOfBusiness`
            // code — that put the English token "home" in the middle of a Greek
            // sentence, which is the exact defect the repo's Greek-copy guard
            // exists to catch.
            const branch = normalizeBranch(policy.lineOfBusiness).label
            // Through the primitive, never the raw column: `insurerName` can be
            // an extraction sentinel on a healthy active policy, and this
            // statement renders to the customer. A placeholder degrades to the
            // branch label alone (same fix as the timeline's policy_added title).
            const insurer = displayInsurerName(policy.insurerName)
            evidence.push({
                kind: "held_policy",
                policyRef: policy.id,
                statement: {
                    en: `In force: your ${branch.en} policy${insurer ? ` with ${insurer}` : ""}.`,
                    el: `Σε ισχύ: το ασφαλιστήριο ${branch.el}${insurer ? ` (${insurer})` : ""}.`,
                },
                confidence: "declared",
            })
        }
    }

    // Every dimension that failed or could not be read is itself evidence —
    // it is the reason the state is not `protected`.
    for (const dimension of dimensions) {
        if (dimension.verdict === "satisfied") continue
        evidence.push({
            kind: dimension.verdict === "unevaluable" ? "derived" : "market_rule",
            statement: dimension.detail,
            confidence: "derived",
        })
    }

    // The count shortfall is a downgrade reason like any other, and without it
    // the customer saw an amber verdict beside three green dimensions and
    // nothing but positive evidence — the verdict asserting itself, which is
    // precisely what this model exists to stop.
    if (shortOfAnchors) {
        evidence.push({
            kind: "derived",
            statement: {
                en: `You have ${anchorIds.length} of these, and we can match ${matched.length} ${matched.length === 1 ? "policy" : "policies"} to them. A policy covering one does not cover the others.`,
                el: `Έχετε ${anchorIds.length} από αυτά και μπορούμε να αντιστοιχίσουμε ${matched.length} ${matched.length === 1 ? "ασφαλιστήριο" : "ασφαλιστήρια"}. Ένα ασφαλιστήριο που καλύπτει το ένα δεν καλύπτει τα υπόλοιπα.`,
            },
            confidence: "derived",
        })
    }

    void assessment
    return evidence
}

/**
 * Bind every applicable assessed risk to the graph and evaluate its protection.
 *
 * Reads the EXISTING assessment rather than re-deriving applicability, so there
 * is exactly one place that decides whether a risk applies. This layer only
 * answers "to what, and how well protected".
 */
export function bindRisksToGraph(
    assessments: RiskAssessment[],
    graph: PersonalRiskGraph,
    policies: ProtectingPolicy[],
    ctx: LifeContext,
    now: Date = new Date()
): GraphRisk[] {
    const bound: GraphRisk[] = []

    for (const assessment of assessments) {
        // Only risks that actually apply get bound. A risk that is not this
        // customer's is not a protection question.
        if (assessment.applicability !== "applicable") continue

        const anchorIds = anchorsFor(graph, assessment.riskId)
        const inLine = policiesInLine(assessment.lineOfBusiness, assessment.coveredBy, policies)
        const matched = inLine.filter((p) => p.status === "active")
        const hasCover = matched.length > 0

        // Only questions that are actually live become dimensions. A dimension
        // present but permanently unevaluable is worse than an absent one: it
        // reads as "we checked and could not tell" when we never had a question
        // to ask, and it makes states like `protected` unreachable.
        const dimensions: DimensionAssessment[] = []
        if (hasCover) {
            if (expectedPerils(assessment.riskId, assessment.lineOfBusiness).length > 0) {
                dimensions.push(assessPeril(assessment.riskId, assessment.lineOfBusiness, matched))
            }
            dimensions.push(assessLimit(matched, requiredMinimum(assessment.riskId, ctx)))
            // Only where geography can go wrong AND we hold data to judge it
            // (§TERRITORY_MATERIAL). Both halves matter.
            const hasTerritoryData = matched.some((p) => (p.territories?.length ?? 0) > 0)
            if (TERRITORY_MATERIAL.has(assessment.riskId) && hasTerritoryData) {
                dimensions.push(assessTerritory(matched))
            }
            dimensions.push(assessPeriod(matched, now))
        }

        // One policy does not cover two houses. Where the risk anchors to more
        // objects than there are policies, the surplus is unprotected — the
        // question `minPolicies` approximated by counting. Only meaningful when
        // there IS cover; with none, "no policy answers this" already says it.
        const shortOfAnchors = hasCover && anchorIds.length > 1 && matched.length < anchorIds.length
        let state = rollUpState(dimensions, hasCover)
        if (shortOfAnchors && state === "protected") state = "partially_protected"

        bound.push({
            riskId: assessment.riskId,
            lineOfBusiness: assessment.lineOfBusiness,
            anchorNodeIds: anchorIds,
            state,
            dimensions,
            evidence: buildEvidence(assessment, graph, anchorIds, matched, dimensions, shortOfAnchors),
            protectedBy: matched.map((p) => p.id),
            heldInLine: inLine.length,
        })
    }

    return bound
}

/** Counts per state — the graph summary band. */
export function protectionSummary(risks: GraphRisk[]): Record<RiskState, number> {
    const counts: Record<RiskState, number> = {
        protected: 0,
        partially_protected: 0,
        unprotected: 0,
        unknown: 0,
    }
    for (const risk of risks) counts[risk.state]++
    return counts
}
