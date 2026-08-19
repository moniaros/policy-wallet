/**
 * Agent Playbook Generator
 *
 * Generates suggested action steps for agents per client opportunity,
 * based on gap data, client profile, and engagement signals.
 *
 * Each playbook is a prioritized list of concrete steps the agent
 * can take to convert an opportunity into a sale.
 */

import { db } from "@/lib/db"
import { toLifeContext, totalDependents } from "./life-context"
import type { ConversionLikelihood } from "./opportunity-scoring"
import { agentPolicyVisibilityWhere, getGrantedPolicyIds } from "@/lib/agent-visibility"
import { isConsentedRelationship, isPhantomCustomer } from "@/lib/agent-consent"
import { branchFamilyId } from "@/lib/insurance/taxonomy"

// ── Types ────────────────────────────────────────────────────────────

export interface PlaybookStep {
    order: number
    action: { en: string; el: string }
    channel: "call" | "email" | "whatsapp" | "in_app" | "meeting"
    timing: { en: string; el: string }
    talkingPoints: Array<{ en: string; el: string }>
}

export interface AgentPlaybook {
    clientId: string
    clientName: string
    opportunityId: string | null
    gapSeverity: string
    lineOfBusiness: string
    conversionLikelihood: ConversionLikelihood
    steps: PlaybookStep[]
    estimatedPremium: number | null
    keyInsight: { en: string; el: string }
}

// ── Step templates by gap type ───────────────────────────────────────

interface StepTemplate {
    channel: PlaybookStep["channel"]
    action: { en: string; el: string }
    timing: { en: string; el: string }
    talkingPoints: Array<{ en: string; el: string }>
}

const STEP_TEMPLATES: Record<string, StepTemplate[]> = {
    // Critical gaps (motor, life with dependents)
    critical: [
        {
            channel: "call",
            action: {
                en: "Urgent call: discuss the unprotected risk",
                el: "Επείγουσα κλήση: συζήτηση για τον απροστάτευτο κίνδυνο",
            },
            timing: { en: "Today", el: "Σήμερα" },
            talkingPoints: [
                {
                    en: "Explain the specific financial exposure",
                    el: "Εξηγήστε τη συγκεκριμένη οικονομική έκθεση",
                },
                {
                    en: "Share a real-world scenario relevant to their situation",
                    el: "Μοιραστείτε ένα πραγματικό σενάριο σχετικό με την κατάστασή τους",
                },
            ],
        },
        {
            channel: "email",
            action: {
                en: "Follow up with a personalized quote comparison",
                el: "Αποστολή εξατομικευμένης σύγκρισης προσφορών",
            },
            timing: { en: "Within 24 hours", el: "Εντός 24 ωρών" },
            talkingPoints: [
                {
                    en: "Include 2-3 product options at different price points",
                    el: "Συμπεριλάβετε 2-3 επιλογές σε διαφορετικά κόστη",
                },
            ],
        },
        {
            channel: "call",
            action: {
                en: "Close: address any objections and finalize",
                el: "Κλείσιμο: αντιμετώπιση αντιρρήσεων και οριστικοποίηση",
            },
            timing: { en: "Within 3 days", el: "Εντός 3 ημερών" },
            talkingPoints: [
                {
                    en: "Ask about preferred payment method and start date",
                    el: "Ρωτήστε για προτιμώμενο τρόπο πληρωμής και ημερομηνία έναρξης",
                },
            ],
        },
    ],
    // High severity gaps
    high: [
        {
            channel: "whatsapp",
            action: {
                en: "Send a friendly check-in message about the coverage gap",
                el: "Στείλτε ένα φιλικό μήνυμα για το κενό κάλυψης",
            },
            timing: { en: "This week", el: "Αυτή την εβδομάδα" },
            talkingPoints: [
                {
                    en: "Reference a specific life event or risk factor from their profile",
                    el: "Αναφερθείτε σε συγκεκριμένο γεγονός ζωής ή παράγοντα κινδύνου",
                },
            ],
        },
        {
            channel: "email",
            action: {
                en: "Send educational content about this insurance type",
                el: "Αποστολή εκπαιδευτικού υλικού για αυτό τον τύπο ασφάλισης",
            },
            timing: { en: "Within 3 days", el: "Εντός 3 ημερών" },
            talkingPoints: [
                {
                    en: "Include market statistics relevant to Greece",
                    el: "Συμπεριλάβετε στατιστικά αγοράς σχετικά με την Ελλάδα",
                },
                {
                    en: "Highlight what peers in similar situations typically choose",
                    el: "Υπογραμμίστε τι επιλέγουν συνήθως άτομα σε παρόμοια κατάσταση",
                },
            ],
        },
        {
            channel: "call",
            action: {
                en: "Schedule a brief consultation to present options",
                el: "Προγραμματίστε σύντομη συνάντηση για παρουσίαση επιλογών",
            },
            timing: { en: "Within 1 week", el: "Εντός 1 εβδομάδας" },
            talkingPoints: [
                {
                    en: "Prepare 2 options: essential and comprehensive",
                    el: "Προετοιμάστε 2 επιλογές: βασική και ολοκληρωμένη",
                },
            ],
        },
    ],
    // Medium severity gaps
    medium: [
        {
            channel: "in_app",
            action: {
                en: "Send an in-app notification about the coverage opportunity",
                el: "Αποστολή ειδοποίησης εντός εφαρμογής για την ευκαιρία κάλυψης",
            },
            timing: { en: "This week", el: "Αυτή την εβδομάδα" },
            talkingPoints: [
                {
                    en: "Keep it brief and informational",
                    el: "Κρατήστε το σύντομο και ενημερωτικό",
                },
            ],
        },
        {
            channel: "email",
            action: {
                en: "Include in next monthly portfolio review email",
                el: "Συμπεριλάβετε στο επόμενο μηνιαίο email ανασκόπησης",
            },
            timing: { en: "Next review cycle", el: "Επόμενος κύκλος ανασκόπησης" },
            talkingPoints: [
                {
                    en: "Position as part of overall portfolio optimization",
                    el: "Τοποθετήστε το ως μέρος συνολικής βελτιστοποίησης χαρτοφυλακίου",
                },
            ],
        },
    ],
    // Low severity gaps
    low: [
        {
            channel: "in_app",
            action: {
                en: "Add to future discussion topics",
                el: "Προσθήκη σε μελλοντικά θέματα συζήτησης",
            },
            timing: { en: "Next meeting", el: "Επόμενη συνάντηση" },
            talkingPoints: [
                {
                    en: "Mention briefly during next renewal discussion",
                    el: "Αναφέρετε εν συντομία κατά την επόμενη ανανέωση",
                },
            ],
        },
    ],
}

// ── LOB-specific talking points ──────────────────────────────────────

const LOB_TALKING_POINTS: Record<string, Array<{ en: string; el: string }>> = {
    motor: [
        {
            en: "Motor insurance is mandatory in Greece — driving without it risks fines and license suspension",
            el: "Η ασφάλεια αυτοκινήτου είναι υποχρεωτική στην Ελλάδα — η οδήγηση χωρίς αυτήν κινδυνεύει με πρόστιμα",
        },
    ],
    home: [
        {
            // ENFIA is a tax and mandates no cover — there is nothing to "comply"
            // with. Insuring against fire, earthquake and flood earns a DISCOUNT
            // on it, which is the argument an agent should actually be making.
            en: "With earthquake risk in Greece, home insurance is essential — and fire, earthquake and flood cover together earn a discount on the owner's ENFIA",
            el: "Με τον σεισμικό κίνδυνο στην Ελλάδα, η ασφάλιση κατοικίας είναι απαραίτητη — και η κάλυψη πυρός, σεισμού και πλημμύρας μαζί δίνει έκπτωση στον ΕΝΦΙΑ",
        },
    ],
    health: [
        {
            en: "Private health supplements ESY with faster access to specialists and diagnostics",
            el: "Η ιδιωτική υγεία συμπληρώνει το ΕΣΥ με ταχύτερη πρόσβαση σε ειδικούς και διαγνωστικά",
        },
    ],
    life: [
        {
            en: "Life insurance protects dependents and can cover mortgage obligations",
            el: "Η ασφάλεια ζωής προστατεύει τα εξαρτώμενα μέλη και μπορεί να καλύψει στεγαστικές υποχρεώσεις",
        },
    ],
    travel: [
        {
            en: "Medical costs abroad can be devastating — a single hospital visit can exceed €10,000",
            el: "Τα ιατρικά έξοδα στο εξωτερικό μπορεί να είναι καταστροφικά — μία νοσηλεία μπορεί να ξεπεράσει τα €10.000",
        },
    ],
}

// ── Key insight generator ────────────────────────────────────────────

function generateKeyInsight(
    lob: string,
    severity: string,
    clientProfile: { dependentsCount?: number; ownsHome?: boolean; hasLoans?: boolean }
): { en: string; el: string } {
    // Family: a client whose gap is in income protection, disability or
    // personal accident is still a LIFE conversation for the agent.
    if (severity === "critical" && branchFamilyId(lob) === "life" && (clientProfile.dependentsCount ?? 0) > 0) {
        return {
            en: `Client has ${clientProfile.dependentsCount} dependent(s) with no life cover — high emotional urgency.`,
            el: `Ο πελάτης έχει ${clientProfile.dependentsCount} εξαρτώμενο(α) μέλος(η) χωρίς ασφάλεια ζωής — υψηλή συναισθηματική επείγουσα ανάγκη.`,
        }
    }
    if (branchFamilyId(lob) === "home" && clientProfile.ownsHome) {
        return {
            en: "Homeowner without property insurance — significant asset at risk.",
            el: "Ιδιοκτήτης χωρίς ασφάλεια ακινήτου — σημαντικό περιουσιακό στοιχείο σε κίνδυνο.",
        }
    }
    if (branchFamilyId(lob) === "life" && clientProfile.hasLoans) {
        return {
            en: "Client has outstanding loans — life insurance would protect against debt transfer to family.",
            el: "Ο πελάτης έχει ανεξόφλητα δάνεια — η ασφάλεια ζωής θα προστάτευε από μεταφορά χρέους στην οικογένεια.",
        }
    }

    return {
        en: `This ${severity}-priority ${lob} gap represents a conversion opportunity.`,
        el: `Αυτό το κενό ${lob} ${severity === "critical" ? "κρίσιμης" : severity === "high" ? "υψηλής" : "μέσης"} προτεραιότητας αποτελεί ευκαιρία μετατροπής.`,
    }
}

// ── Main generator ───────────────────────────────────────────────────

/**
 * Generate an action playbook for an agent's client opportunity.
 */
export async function generatePlaybook(
    agentUserId: string,
    clientUserId: string,
    lineOfBusiness: string,
    severity: string,
    opportunityId: string | null = null,
    conversionLikelihood: ConversionLikelihood = "medium"
): Promise<AgentPlaybook> {
    // Verify agent has a relationship with this client
    const relationship = await db.customerRelationship.findFirst({
        where: {
            agentUserId,
            policyholderUserId: clientUserId,
            status: { not: "terminated" },
        },
        select: { id: true, activationStatus: true },
    })
    if (!relationship) {
        throw new Error("Unauthorized: no agent-client relationship")
    }

    // A relationship is not consent to read a client's profile PII. Require
    // consent (accepted invite), a phantom the agent created, or at least one
    // policy the agent may see for this client — same model as agent-visibility.
    const [clientUser, clientProfile, matchedProduct, visiblePolicyCount] = await Promise.all([
        db.user.findUnique({
            where: { id: clientUserId },
            select: { name: true, password: true, emailVerified: true },
        }),
        // The whole profile is genuinely needed: it feeds `toLifeContext`,
        // which reads across dependents, residence, income, mortgage AND the
        // Art. 9 fields (chronicConditions, familyMedicalHistory). This is a
        // real special-category read by an advisor about a client, not an
        // over-fetch — so it cannot be minimised away, and is audited below.
        db.policyholderProfile.findUnique({
            where: { userId: clientUserId },
        }),
        db.insuranceProduct.findFirst({
            where: {
                lineOfBusiness: lineOfBusiness.toLowerCase(),
                isActive: true,
            },
            select: { estimatedAnnualPremium: true },
            orderBy: { greekMarketPopularity: "desc" },
        }),
        (async () =>
            db.policy.count({
                where: {
                    ownerUserId: clientUserId,
                    ...agentPolicyVisibilityWhere(agentUserId, await getGrantedPolicyIds(agentUserId)),
                },
            }))(),
    ])

    if (
        !isConsentedRelationship(relationship) &&
        (!clientUser || !isPhantomCustomer(clientUser)) &&
        visiblePolicyCount === 0
    ) {
        throw new Error("Unauthorized: no consent or visible policy for this client")
    }

    // Build steps from templates
    const templateKey =
        severity === "critical" ? "critical" : severity === "high" ? "high" : severity === "medium" ? "medium" : "low"

    const baseSteps = STEP_TEMPLATES[templateKey] || STEP_TEMPLATES.low

    const steps: PlaybookStep[] = baseSteps.map((tmpl, i) => {
        const lobPoints =
        LOB_TALKING_POINTS[lineOfBusiness.toLowerCase()] ||
        LOB_TALKING_POINTS[branchFamilyId(lineOfBusiness)] ||
        []
        const allPoints = i === 0 ? [...tmpl.talkingPoints, ...lobPoints] : tmpl.talkingPoints

        return {
            order: i + 1,
            action: tmpl.action,
            channel: tmpl.channel,
            timing: tmpl.timing,
            talkingPoints: allPoints,
        }
    })

    // Read through the same resolution the customer-facing engine uses.
    // Reading `profile.ownsHome` directly meant a client who declared "owned"
    // via `residenceType` — the field the wizard and questionnaire now write —
    // still looked like a non-owner to their advisor, so the playbook and the
    // client's own dashboard described different people.
    // An advisor reading a client's health and financial profile to be told
    // what to say to them is exactly the access an Art. 30 record exists for.
    // Flagged as special-category so "who looked at health data" is answerable
    // without inferring it from the action name. Best-effort: never fail a
    // playbook over an audit write.
    if (clientProfile) {
        try {
            await db.activityLog.create({
                data: {
                    adminUserId: agentUserId,
                    adminEmail: "agent",
                    actionType: "AGENT_READ_CLIENT_PROFILE",
                    description: "Agent playbook read the client's risk profile",
                    targetUserId: clientUserId,
                    metadata: {
                        _read: {
                            scope: ["profile.lifeContext", "profile.health", "profile.financial"],
                            specialCategory: true,
                        },
                    },
                },
            })
        } catch {
            // audit is best-effort; never break the advisor's page
        }
    }

    const ctx = toLifeContext(clientProfile ?? null)
    const keyInsight = generateKeyInsight(lineOfBusiness, severity, {
        dependentsCount: totalDependents(ctx),
        ownsHome: ctx.residenceType === "owned" || ctx.propertiesOwned > 0,
        hasLoans: (ctx.loanAmount ?? 0) > 0 || (ctx.mortgageAmount ?? 0) > 0,
    })

    return {
        clientId: clientUserId,
        clientName: clientUser?.name || "Client",
        opportunityId,
        gapSeverity: severity,
        lineOfBusiness,
        conversionLikelihood,
        steps,
        estimatedPremium: matchedProduct
            ? Number(matchedProduct.estimatedAnnualPremium)
            : null,
        keyInsight,
    }
}

/**
 * Generate playbooks for all open opportunities of an agent.
 */
export async function generateAgentPlaybooks(
    agentUserId: string
): Promise<AgentPlaybook[]> {
    const opportunities = await db.opportunity.findMany({
        where: {
            ownerAgentUserId: agentUserId,
            status: { in: ["open", "contacted"] },
        },
        include: {
            gapInstance: {
                select: {
                    severity: true,
                    policy: { select: { lineOfBusiness: true } },
                },
            },
            relationship: {
                select: { policyholderUserId: true },
            },
        },
        take: 20,
    })

    const playbooks: AgentPlaybook[] = []

    for (const opp of opportunities) {
        const lob = opp.gapInstance?.policy?.lineOfBusiness || "other"
        const severity = opp.gapInstance?.severity || "medium"
        const clientId = opp.relationship.policyholderUserId

        const playbook = await generatePlaybook(
            agentUserId,
            clientId,
            lob,
            severity,
            opp.id
        )
        playbooks.push(playbook)
    }

    return playbooks
}
