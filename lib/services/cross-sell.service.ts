import { db } from "../db"
import { logger } from "../logger"

/**
 * Greek insurance coverage matrix.
 * Lines of business a typical Greek household/individual might hold,
 * ordered by prevalence and relevance.
 */
export const GREEK_COVERAGE_MATRIX = [
    { lob: "motor", label: { en: "Motor", el: "Αυτοκίνητο" }, essential: true },
    { lob: "home", label: { en: "Home", el: "Κατοικία" }, essential: true },
    { lob: "health", label: { en: "Health", el: "Υγεία" }, essential: true },
    { lob: "life", label: { en: "Life", el: "Ζωή" }, essential: false },
    { lob: "travel", label: { en: "Travel", el: "Ταξίδι" }, essential: false },
    { lob: "pet", label: { en: "Pet", el: "Κατοικίδιο" }, essential: false },
    { lob: "liability", label: { en: "Liability", el: "Αστική Ευθύνη" }, essential: false },
    { lob: "legal_expenses", label: { en: "Legal Expenses", el: "Νομική Προστασία" }, essential: false },
] as const

export type CoverageLineItem = (typeof GREEK_COVERAGE_MATRIX)[number]

export interface CrossSellResult {
    customerId: string
    customerName: string
    existingLines: string[]
    missingLines: Array<{
        lob: string
        label: { en: string; el: string }
        essential: boolean
        reason: { en: string; el: string }
    }>
    coverageScore: number // 0-100
    opportunitiesCreated: number
}

/**
 * Analyze a single customer's portfolio for missing lines of business.
 */
export function analyzePortfolioGaps(
    existingLobs: string[]
): CrossSellResult["missingLines"] {
    const normalizedExisting = new Set(existingLobs.map((l) => l.toLowerCase()))

    return GREEK_COVERAGE_MATRIX
        .filter((line) => !normalizedExisting.has(line.lob))
        .map((line) => ({
            lob: line.lob,
            label: line.label,
            essential: line.essential,
            reason: getReasonForLine(line.lob, normalizedExisting),
        }))
}

/**
 * Calculate coverage score (0-100) based on how many essential + optional lines are covered.
 */
export function calculateCoverageScore(existingLobs: string[]): number {
    const normalizedExisting = new Set(existingLobs.map((l) => l.toLowerCase()))
    const essentialLines = GREEK_COVERAGE_MATRIX.filter((l) => l.essential)
    const optionalLines = GREEK_COVERAGE_MATRIX.filter((l) => !l.essential)

    const essentialCovered = essentialLines.filter((l) => normalizedExisting.has(l.lob)).length
    const optionalCovered = optionalLines.filter((l) => normalizedExisting.has(l.lob)).length

    // Essentials worth 70%, optionals worth 30%
    const essentialScore = essentialLines.length > 0
        ? (essentialCovered / essentialLines.length) * 70
        : 70
    const optionalScore = optionalLines.length > 0
        ? (optionalCovered / optionalLines.length) * 30
        : 30

    return Math.round(essentialScore + optionalScore)
}

/**
 * Run cross-sell analysis for a specific customer and optionally auto-create opportunities.
 */
export async function runCrossSellForCustomer(
    agentUserId: string,
    policyholderUserId: string,
    autoCreateOpportunities: boolean = false
): Promise<CrossSellResult> {
    // Fetch relationship
    const relationship = await db.customerRelationship.findFirst({
        where: {
            agentUserId,
            policyholderUserId,
            status: { in: ["active", "pending_activation"] },
        },
        select: { id: true },
    })

    if (!relationship) {
        throw new Error("No active relationship found")
    }

    // Fetch customer info
    const customer = await db.user.findUnique({
        where: { id: policyholderUserId },
        select: { id: true, name: true, email: true },
    })

    // Fetch all active policies for this customer
    const policies = await db.policy.findMany({
        where: {
            ownerUserId: policyholderUserId,
            status: "active",
        },
        select: {
            id: true,
            lineOfBusiness: true,
            premiumAmount: true,
        },
    })

    const existingLines = [...new Set(policies.map((p) => p.lineOfBusiness.toLowerCase()))]
    const missingLines = analyzePortfolioGaps(existingLines)
    const coverageScore = calculateCoverageScore(existingLines)

    let opportunitiesCreated = 0

    if (autoCreateOpportunities && missingLines.length > 0) {
        // Check for existing cross-sell opportunities to avoid duplicates
        const existingOpportunities = await db.opportunity.findMany({
            where: {
                relationshipId: relationship.id,
                status: { in: ["open", "contacted"] },
                lineOfBusiness: { in: missingLines.map((l) => l.lob) },
            },
            select: { lineOfBusiness: true },
        })

        const existingOppLobs = new Set(
            existingOpportunities
                .map((o) => o.lineOfBusiness?.toLowerCase())
                .filter(Boolean)
        )

        for (const line of missingLines) {
            if (existingOppLobs.has(line.lob)) continue

            // Estimate premium based on Greek market averages
            const estimatedPremium = getEstimatedPremium(line.lob)

            await db.opportunity.create({
                data: {
                    relationshipId: relationship.id,
                    ownerAgentUserId: agentUserId,
                    status: "open",
                    notes: `Cross-sell: Customer missing ${line.label.en} coverage. ${line.reason.en}`,
                    lineOfBusiness: line.lob,
                    estimatedPremium: estimatedPremium,
                    estimatedCommission: estimatedPremium ? estimatedPremium * 0.15 : null, // 15% default
                    currency: "EUR",
                },
            })

            opportunitiesCreated++
        }

        if (opportunitiesCreated > 0) {
            logger("info", `Cross-sell: created ${opportunitiesCreated} opportunities`, {
                agentUserId,
                customerId: policyholderUserId,
            })
        }
    }

    return {
        customerId: policyholderUserId,
        customerName: customer?.name || customer?.email || "Unknown",
        existingLines,
        missingLines,
        coverageScore,
        opportunitiesCreated,
    }
}

/**
 * Run cross-sell analysis for all customers of an agent.
 */
export async function runBulkCrossSell(agentUserId: string): Promise<{
    customersAnalyzed: number
    totalMissingLines: number
    opportunitiesCreated: number
    results: CrossSellResult[]
}> {
    const relationships = await db.customerRelationship.findMany({
        where: {
            agentUserId,
            status: { in: ["active", "pending_activation"] },
        },
        select: { policyholderUserId: true },
    })

    const results: CrossSellResult[] = []
    let totalMissing = 0
    let totalCreated = 0

    for (const rel of relationships) {
        try {
            const result = await runCrossSellForCustomer(
                agentUserId,
                rel.policyholderUserId,
                true
            )
            results.push(result)
            totalMissing += result.missingLines.length
            totalCreated += result.opportunitiesCreated
        } catch (err) {
            logger("error", `Cross-sell analysis failed for customer ${rel.policyholderUserId}`, { error: String(err) })
        }
    }

    return {
        customersAnalyzed: results.length,
        totalMissingLines: totalMissing,
        opportunitiesCreated: totalCreated,
        results,
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getReasonForLine(
    lob: string,
    existingLobs: Set<string>
): { en: string; el: string } {
    const reasons: Record<string, { en: string; el: string }> = {
        motor: {
            en: "Motor insurance is mandatory in Greece. Every vehicle must be insured.",
            el: "Η ασφάλιση αυτοκινήτου είναι υποχρεωτική στην Ελλάδα.",
        },
        home: {
            en: "Home insurance protects against fire, earthquake, theft, and natural disasters — critical in Greece.",
            el: "Η ασφάλιση κατοικίας προστατεύει από φωτιά, σεισμό, κλοπή και φυσικές καταστροφές.",
        },
        health: {
            en: "Private health insurance provides faster access to specialists and covers gaps in public healthcare.",
            el: "Η ιδιωτική ασφάλιση υγείας παρέχει ταχύτερη πρόσβαση σε ειδικούς και καλύπτει κενά του ΕΣΥ.",
        },
        life: {
            en: "Life insurance provides financial security for dependents and can include savings components.",
            el: "Η ασφάλιση ζωής παρέχει οικονομική ασφάλεια στους εξαρτώμενους.",
        },
        travel: {
            en: "Travel insurance covers medical emergencies, trip cancellation, and lost luggage abroad.",
            el: "Η ταξιδιωτική ασφάλιση καλύπτει ιατρικά έξοδα, ακύρωση ταξιδιού και απώλεια αποσκευών.",
        },
        pet: {
            en: "Pet insurance covers veterinary costs, liability, and emergency treatment.",
            el: "Η ασφάλιση κατοικιδίων καλύπτει κτηνιατρικά έξοδα και αστική ευθύνη.",
        },
        liability: {
            en: "Liability insurance protects against third-party claims for property damage or injury.",
            el: "Η ασφάλιση αστικής ευθύνης προστατεύει από αξιώσεις τρίτων.",
        },
        legal_expenses: {
            en: "Legal expenses insurance covers legal fees for disputes, employment, and property issues.",
            el: "Η νομική προστασία καλύπτει δικαστικά έξοδα για διαφορές και νομικά θέματα.",
        },
    }

    return reasons[lob] || {
        en: `Adding ${lob} coverage would strengthen overall protection.`,
        el: `Η προσθήκη κάλυψης ${lob} θα ενισχύσει τη συνολική προστασία.`,
    }
}

/**
 * Greek market average annual premiums by line of business (rough estimates for opportunity sizing).
 */
function getEstimatedPremium(lob: string): number | null {
    const estimates: Record<string, number> = {
        motor: 400,
        home: 250,
        health: 800,
        life: 600,
        travel: 80,
        pet: 150,
        liability: 200,
        legal_expenses: 120,
    }
    return estimates[lob] ?? null
}
