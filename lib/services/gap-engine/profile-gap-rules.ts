/**
 * Profile-Based Gap Detection Rules
 *
 * Evaluates a user's risk profile against their actual policy portfolio
 * to detect coverage gaps. Pure functions — no DB access, fully testable.
 *
 * Each rule answers: "Given what we know about this person, what coverage
 * are they missing that they should have?"
 */

import type { PolicyholderProfile, Policy } from "@prisma/client"
import { getBranchFamily, normalizeBranch } from "@/lib/insurance/taxonomy"
import { coverageEngineStatus } from "@/lib/policy-status"

export type GapSeverity = "critical" | "high" | "medium" | "low"

export interface ProfileGap {
    ruleId: string
    lineOfBusiness: string
    severity: GapSeverity
    name: { en: string; el: string }
    reason: { en: string; el: string }
}

export interface ProfileGapRule {
    id: string
    lineOfBusiness: string
    severity: GapSeverity
    name: { en: string; el: string }
    condition: (profile: ProfileFields, policies: PolicyFields[]) => boolean
    reason: (profile: ProfileFields) => { en: string; el: string }
}

/** Subset of PolicyholderProfile fields used in rules */
export interface ProfileFields {
    maritalStatus: string | null
    dependentsCount: number
    employmentStatus: string | null
    ownsHome: boolean
    mortgageAmount: number | null
    hasPets: boolean
    vehiclesCount: number
    dateOfBirth: Date | null
    annualIncome: number | null
    occupation: string | null
    riskTolerance: string | null
    hasLoans: boolean
    loanAmount: number | null
    travelsFrequently: boolean
    smokingStatus: string | null
    lifeEvents: any[] | null
    // Health & Lifestyle
    gender: string | null
    heightCm: number | null
    weightKg: number | null
    chronicConditions: string[] | null
    familyMedicalHistory: string[] | null
    drivingRecord: string | null
    activityLevel: string | null
}

/** Subset of Policy fields used in rules */
export interface PolicyFields {
    lineOfBusiness: string
    status: string
}

// ── Helper ───────────────────────────────────────────────────────────

/**
 * Does the user hold live cover in this line — INCLUDING its child branches?
 *
 * The taxonomy models motorbike as a child of motor ("child branches aggregate
 * under their parent"), and portfolio-rules already treats them as one family.
 * This matched the id exactly, so a correctly-insured motorbike did not satisfy
 * `hasActiveLine(policies, "motor")` — and `vehicles_no_motor` then told its
 * owner, at CRITICAL severity, that they had a vehicle without insurance and
 * that insurance is legally mandatory in Greece. Being wrongly accused of
 * driving uninsured is the most alarming thing this product can say to someone,
 * and it was saying it to people who had done everything right.
 *
 * `status` here is already the DERIVED coverage status (see coverageEngineStatus
 * at the call site), not the stale stored column.
 */
function hasActiveLine(policies: PolicyFields[], lob: string): boolean {
    const family = new Set(getBranchFamily(lob.toLowerCase()))
    return policies.some(
        (p) => family.has(normalizeBranch(p.lineOfBusiness).id) && p.status === "active"
    )
}

/**
 * Money inside a gap description, formatted for the language of the sentence
 * that carries it.
 *
 * This hardcoded "en", so the GREEK recommendation read
 * «Έχετε στεγαστικό δάνειο €150,000» — English grouping dropped into a Greek
 * sentence, where "," is the DECIMAL separator. A €150.000 mortgage was being
 * described to the policyholder as if it were €150, in the one piece of content
 * whose whole purpose is to convey the size of an uncovered exposure.
 */
function formatCurrency(amount: number | null, lang: "el" | "en" = "el"): string {
    if (!amount) return lang === "el" ? "0 €" : "€0"
    return new Intl.NumberFormat(lang === "el" ? "el-GR" : "en-GB", {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 0,
    }).format(Number(amount))
}

// ── Rules ────────────────────────────────────────────────────────────

export const PROFILE_GAP_RULES: ProfileGapRule[] = [
    // ── Critical ─────────────────────────────────────────────────────

    {
        id: "mortgage_no_life",
        lineOfBusiness: "life",
        severity: "critical",
        name: {
            en: "Life insurance for mortgage",
            el: "Ασφάλιση ζωής για στεγαστικό δάνειο",
        },
        condition: (p, policies) =>
            p.ownsHome &&
            p.mortgageAmount != null &&
            Number(p.mortgageAmount) > 0 &&
            !hasActiveLine(policies, "life"),
        reason: (p) => ({
            en: `You have a mortgage of ${formatCurrency(p.mortgageAmount, "en")}. Life insurance ensures your family isn't burdened with the debt if something happens to you.`,
            el: `Έχετε στεγαστικό δάνειο ${formatCurrency(p.mortgageAmount, "el")}. Η ασφάλιση ζωής διασφαλίζει ότι η οικογένειά σας δεν θα επιβαρυνθεί με το χρέος.`,
        }),
    },
    {
        id: "dependents_no_life",
        lineOfBusiness: "life",
        severity: "critical",
        name: {
            en: "Life insurance for dependents",
            el: "Ασφάλιση ζωής για εξαρτώμενα μέλη",
        },
        condition: (p, policies) =>
            p.dependentsCount > 0 && !hasActiveLine(policies, "life"),
        reason: (p) => ({
            en: `You have ${p.dependentsCount} dependent(s). Life insurance provides financial security for your family if you're no longer able to provide.`,
            el: `Έχετε ${p.dependentsCount} εξαρτώμενο/α μέλος/η. Η ασφάλιση ζωής παρέχει οικονομική ασφάλεια στην οικογένειά σας.`,
        }),
    },
    {
        id: "vehicles_no_motor",
        lineOfBusiness: "motor",
        severity: "critical",
        name: {
            en: "Motor insurance (mandatory)",
            el: "Ασφάλιση αυτοκινήτου (υποχρεωτική)",
        },
        condition: (p, policies) =>
            p.vehiclesCount > 0 && !hasActiveLine(policies, "motor"),
        reason: (p) => ({
            // What is compulsory in Greece is third-party liability (αστική
            // ευθύνη), not motor cover in general — "motor insurance is
            // mandatory" invites the reader to think comprehensive is required.
            en: `You have ${p.vehiclesCount} vehicle(s) with no motor policy recorded here. Third-party liability cover is compulsory for any vehicle in circulation in Greece.`,
            el: `Έχετε ${p.vehiclesCount} όχημα/τα χωρίς καταγεγραμμένο ασφαλιστήριο. Η ασφάλιση αστικής ευθύνης είναι υποχρεωτική για κάθε όχημα σε κυκλοφορία στην Ελλάδα.`,
        }),
    },

    // ── High ─────────────────────────────────────────────────────────

    {
        id: "homeowner_no_home",
        lineOfBusiness: "home",
        severity: "high",
        name: {
            en: "Home insurance for property",
            el: "Ασφάλιση κατοικίας",
        },
        condition: (p, policies) =>
            p.ownsHome && !hasActiveLine(policies, "home"),
        reason: () => ({
            // ai/prompts.ts forbids the model from telling anyone what they
            // "should" buy, because insurance advice is regulated in Greece
            // (IDD, Law 4583/2018). The deterministic rules were not held to the
            // same line: this one said cover was "strongly recommended".
            // Stated as the fact it rests on instead.
            en: "You own property with no home policy recorded here. Greece is one of the most seismically active countries in Europe, and fire, earthquake and flood are each usually a separate cover.",
            el: "Έχετε ιδιόκτητο ακίνητο χωρίς καταγεγραμμένο ασφαλιστήριο κατοικίας. Η Ελλάδα είναι από τις πιο σεισμογενείς χώρες της Ευρώπης, και η πυρκαγιά, ο σεισμός και η πλημμύρα καλύπτονται συνήθως ξεχωριστά.",
        }),
    },
    {
        id: "no_health",
        lineOfBusiness: "health",
        severity: "high",
        name: {
            en: "Private health insurance",
            el: "Ιδιωτική ασφάλιση υγείας",
        },
        condition: (_p, policies) => !hasActiveLine(policies, "health"),
        reason: () => ({
            en: "You have no private health insurance. Public healthcare in Greece has long wait times for specialists — private coverage ensures faster access.",
            el: "Δεν έχετε ιδιωτική ασφάλιση υγείας. Το ΕΣΥ έχει μεγάλες αναμονές — η ιδιωτική κάλυψη εξασφαλίζει ταχύτερη πρόσβαση.",
        }),
    },
    {
        id: "income_no_protection",
        lineOfBusiness: "life",
        severity: "high",
        name: {
            en: "Income protection",
            el: "Προστασία εισοδήματος",
        },
        condition: (p, policies) => {
            const isWorking =
                p.employmentStatus === "employed" ||
                p.employmentStatus === "self_employed"
            const hasDependents = p.dependentsCount > 0
            const hasProtection =
                hasActiveLine(policies, "life") ||
                hasActiveLine(policies, "income_protection")
            return isWorking && hasDependents && !hasProtection
        },
        reason: (p) => ({
            en: `As a ${p.employmentStatus === "self_employed" ? "self-employed professional" : "working professional"} with ${p.dependentsCount} dependent(s), income protection ensures your family's financial stability if you can't work.`,
            el: `Ως ${p.employmentStatus === "self_employed" ? "ελεύθερος επαγγελματίας" : "εργαζόμενος"} με ${p.dependentsCount} εξαρτώμενο/α μέλος/η, η προστασία εισοδήματος εξασφαλίζει σταθερότητα.`,
        }),
    },
    {
        id: "loans_no_life",
        lineOfBusiness: "life",
        severity: "high",
        name: {
            en: "Life insurance for loans",
            el: "Ασφάλιση ζωής για δάνεια",
        },
        condition: (p, policies) =>
            p.hasLoans &&
            p.loanAmount != null &&
            Number(p.loanAmount) > 0 &&
            !hasActiveLine(policies, "life"),
        reason: (p) => ({
            en: `You have loans totaling ${formatCurrency(p.loanAmount, "en")}. Life insurance prevents debt from passing to your family.`,
            el: `Έχετε δάνεια συνολικού ύψους ${formatCurrency(p.loanAmount, "el")}. Η ασφάλιση ζωής αποτρέπει τη μεταφορά χρέους στην οικογένειά σας.`,
        }),
    },

    // ── Medium ───────────────────────────────────────────────────────

    {
        id: "travels_no_travel",
        lineOfBusiness: "travel",
        severity: "medium",
        name: {
            en: "Travel insurance",
            el: "Ταξιδιωτική ασφάλιση",
        },
        condition: (p, policies) =>
            p.travelsFrequently && !hasActiveLine(policies, "travel"),
        reason: () => ({
            en: "You travel frequently. Travel insurance covers medical emergencies, trip cancellations, and lost luggage abroad.",
            el: "Ταξιδεύετε συχνά. Η ταξιδιωτική ασφάλιση καλύπτει ιατρικά έκτακτα, ακυρώσεις ταξιδιού και απώλεια αποσκευών.",
        }),
    },
    {
        id: "self_employed_no_liability",
        lineOfBusiness: "liability",
        severity: "medium",
        name: {
            en: "Professional liability",
            el: "Επαγγελματική αστική ευθύνη",
        },
        condition: (p, policies) =>
            p.employmentStatus === "self_employed" &&
            !hasActiveLine(policies, "liability"),
        reason: () => ({
            en: "As a self-employed professional, liability insurance protects you against third-party claims related to your work.",
            el: "Ως ελεύθερος επαγγελματίας, η ασφάλιση αστικής ευθύνης σας προστατεύει από αξιώσεις τρίτων.",
        }),
    },

    // ── Low ──────────────────────────────────────────────────────────

    {
        id: "pets_no_pet",
        lineOfBusiness: "pet",
        severity: "low",
        name: {
            en: "Pet insurance",
            el: "Ασφάλιση κατοικιδίου",
        },
        condition: (p, policies) =>
            p.hasPets && !hasActiveLine(policies, "pet"),
        reason: () => ({
            en: "You have pets. Pet insurance covers unexpected veterinary costs and liability for injuries caused by your pet.",
            el: "Έχετε κατοικίδια. Η ασφάλιση καλύπτει απρόβλεπτα κτηνιατρικά έξοδα και αστική ευθύνη.",
        }),
    },
    {
        id: "no_legal_expenses",
        lineOfBusiness: "legal_expenses",
        severity: "low",
        name: {
            en: "Legal expenses insurance",
            el: "Νομική προστασία",
        },
        condition: (p, policies) =>
            (p.ownsHome || p.employmentStatus === "self_employed") &&
            !hasActiveLine(policies, "legal_expenses"),
        reason: (p) => ({
            en: `As a ${p.ownsHome ? "homeowner" : "self-employed professional"}, legal expenses insurance covers legal fees for property disputes, employment issues, and contract disagreements.`,
            el: `Ως ${p.ownsHome ? "ιδιοκτήτης ακινήτου" : "ελεύθερος επαγγελματίας"}, η νομική προστασία καλύπτει δικαστικά έξοδα για διαφορές ακινήτων και συμβάσεων.`,
        }),
    },

    // ── Health & Lifestyle Rules ──────────────────────────────────────

    {
        id: "chronic_condition_no_health",
        lineOfBusiness: "health",
        severity: "critical",
        name: {
            en: "Health insurance for chronic condition",
            el: "Ασφάλιση υγείας για χρόνια νόσο",
        },
        condition: (p, policies) =>
            Array.isArray(p.chronicConditions) &&
            p.chronicConditions.length > 0 &&
            !hasActiveLine(policies, "health"),
        reason: (p) => ({
            en: `You have reported chronic health conditions (${(p.chronicConditions ?? []).join(", ")}). Private health insurance ensures you have timely access to specialists and ongoing treatment.`,
            el: `Έχετε δηλώσει χρόνιες παθήσεις (${(p.chronicConditions ?? []).join(", ")}). Η ιδιωτική ασφάλιση υγείας εξασφαλίζει άμεση πρόσβαση σε ειδικούς και συνεχή θεραπεία.`,
        }),
    },
    {
        id: "family_history_no_life",
        lineOfBusiness: "life",
        severity: "high",
        name: {
            en: "Life insurance with family medical history",
            el: "Ασφάλιση ζωής λόγω οικογενειακού ιστορικού",
        },
        condition: (p, policies) => {
            const seriousConditions = ["heart_disease", "cancer", "stroke", "diabetes"]
            const hasSeriousHistory =
                Array.isArray(p.familyMedicalHistory) &&
                p.familyMedicalHistory.some((c) => seriousConditions.includes(c))
            return hasSeriousHistory && !hasActiveLine(policies, "life")
        },
        reason: (p) => ({
            en: `Your family medical history includes hereditary conditions (${(p.familyMedicalHistory ?? []).join(", ")}), which increases your personal risk profile. Life insurance provides protection for your dependents.`,
            el: `Το οικογενειακό ιατρικό ιστορικό σας περιλαμβάνει κληρονομικές παθήσεις (${(p.familyMedicalHistory ?? []).join(", ")}), αυξάνοντας το προσωπικό σας προφίλ κινδύνου. Η ασφάλιση ζωής προστατεύει τα εξαρτώμενα μέλη σας.`,
        }),
    },
    {
        // Fires when driver HAS motor insurance but their record shows elevated
        // litigation risk — they need legal expenses cover on top of motor.
        // Deliberately targets legal_expenses (not motor) so it never conflicts
        // with vehicles_no_motor (critical), which also requires !hasActiveLine(motor).
        id: "poor_driving_record_needs_legal",
        lineOfBusiness: "legal_expenses",
        severity: "medium",
        name: {
            en: "Legal expenses insurance (driving record)",
            el: "Νομική προστασία (οδηγικό ιστορικό)",
        },
        condition: (p, policies) =>
            p.vehiclesCount > 0 &&
            (p.drivingRecord === "major_violations" || p.drivingRecord === "accidents") &&
            hasActiveLine(policies, "motor") &&
            !hasActiveLine(policies, "legal_expenses"),
        reason: () => ({
            en: "Your driving record indicates a higher likelihood of traffic-related disputes. Legal expenses insurance covers legal fees and representation costs if you face a claim arising from an accident.",
            el: "Το οδηγικό σας ιστορικό υποδεικνύει αυξημένο κίνδυνο διαφορών από τροχαία. Η νομική προστασία καλύπτει δικαστικά έξοδα και νομική εκπροσώπηση σε ατυχήματα.",
        }),
    },
]

// ── Execution ────────────────────────────────────────────────────────

/**
 * Run all profile gap rules against a user's profile and policies.
 * Returns detected gaps, deduplicated by lineOfBusiness (highest severity wins).
 */
export function detectProfileGaps(
    profile: ProfileFields,
    policies: PolicyFields[]
): ProfileGap[] {
    const detected: ProfileGap[] = []

    for (const rule of PROFILE_GAP_RULES) {
        if (rule.condition(profile, policies)) {
            detected.push({
                ruleId: rule.id,
                lineOfBusiness: rule.lineOfBusiness,
                severity: rule.severity,
                name: rule.name,
                reason: rule.reason(profile),
            })
        }
    }

    // Deduplicate by lineOfBusiness — keep highest severity
    const severityOrder: Record<GapSeverity, number> = {
        critical: 0,
        high: 1,
        medium: 2,
        low: 3,
    }

    const byLob = new Map<string, ProfileGap>()
    for (const gap of detected) {
        const existing = byLob.get(gap.lineOfBusiness)
        if (
            !existing ||
            severityOrder[gap.severity] < severityOrder[existing.severity]
        ) {
            byLob.set(gap.lineOfBusiness, gap)
        }
    }

    return Array.from(byLob.values()).sort(
        (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
    )
}

/**
 * REMOVED: `getExpectedLines(profile)`.
 *
 * It had zero callers and disagreed with the implementation that actually ran.
 * The live one was an inline loop in `calculateProtectionScore` that expanded an
 * applicable CATEGORY into every line inside it — so owning a car made `home`
 * expected and owning a pet made `cyber` expected, and `buildBranchOverview`
 * rendered both as amber "gap" tiles. Two definitions of the same thing, one
 * dead and one wrong.
 *
 * Expected lines now come from `relevantLines(assessments)`: the lines that
 * risks which genuinely apply to this customer call for, and nothing else.
 */

/**
 * Convert a PolicyholderProfile DB record to the ProfileFields interface.
 */
export function toProfileFields(
    profile: PolicyholderProfile | null
): ProfileFields {
    if (!profile) {
        return {
            maritalStatus: null,
            dependentsCount: 0,
            employmentStatus: null,
            ownsHome: false,
            mortgageAmount: null,
            hasPets: false,
            vehiclesCount: 0,
            dateOfBirth: null,
            annualIncome: null,
            occupation: null,
            riskTolerance: null,
            hasLoans: false,
            loanAmount: null,
            travelsFrequently: false,
            smokingStatus: null,
            lifeEvents: null,
            gender: null,
            heightCm: null,
            weightKg: null,
            chronicConditions: null,
            familyMedicalHistory: null,
            drivingRecord: null,
            activityLevel: null,
        }
    }

    const p = profile as any
    return {
        maritalStatus: profile.maritalStatus,
        dependentsCount: profile.dependentsCount,
        employmentStatus: profile.employmentStatus,
        ownsHome: profile.ownsHome,
        mortgageAmount: profile.mortgageAmount ? Number(profile.mortgageAmount) : null,
        hasPets: profile.hasPets,
        vehiclesCount: profile.vehiclesCount,
        dateOfBirth: p.dateOfBirth ?? null,
        annualIncome: p.annualIncome ? Number(p.annualIncome) : null,
        occupation: p.occupation ?? null,
        riskTolerance: p.riskTolerance ?? null,
        hasLoans: p.hasLoans ?? false,
        loanAmount: p.loanAmount ? Number(p.loanAmount) : null,
        travelsFrequently: p.travelsFrequently ?? false,
        smokingStatus: p.smokingStatus ?? null,
        lifeEvents: p.lifeEvents ?? null,
        gender: p.gender ?? null,
        heightCm: p.heightCm ?? null,
        weightKg: p.weightKg ?? null,
        chronicConditions: Array.isArray(p.chronicConditions) ? p.chronicConditions : null,
        familyMedicalHistory: Array.isArray(p.familyMedicalHistory) ? p.familyMedicalHistory : null,
        drivingRecord: p.drivingRecord ?? null,
        activityLevel: p.activityLevel ?? null,
    }
}

/** A stored policy row as the liveness clock reads it — the columns `resolvePolicyLifecycle` consults. */
export type PolicyRowForEngine = { lineOfBusiness: string } & Parameters<typeof coverageEngineStatus>[0]

/**
 * Convert stored Policy rows to the engine's PolicyFields — the sibling of
 * `toProfileFields` for the other input.
 *
 * `status` here means "counts as coverage today": `active` for a policy in
 * force (an expiring-soon one still protects you), the honest lifecycle word
 * otherwise. It is derived from the REAL end date by lib/policy-status.ts and
 * never read from the stored column, which is written once at ingestion and
 * never recomputed — that is how a health policy that lapsed in May 2025 kept
 * telling its owner they were insured. Every engine entry point and the
 * protection loader (lib/protection/load-attention-areas.ts) map through this
 * one function, so no caller can decide liveness its own way.
 */
export function toPolicyFields(policies: readonly PolicyRowForEngine[]): PolicyFields[] {
    return policies.map((p) => ({
        lineOfBusiness: p.lineOfBusiness,
        status: coverageEngineStatus(p),
    }))
}
