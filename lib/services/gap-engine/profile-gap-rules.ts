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
}

/** Subset of Policy fields used in rules */
export interface PolicyFields {
    lineOfBusiness: string
    status: string
}

// ── Helper ───────────────────────────────────────────────────────────

function hasActiveLine(policies: PolicyFields[], lob: string): boolean {
    return policies.some(
        (p) =>
            p.lineOfBusiness.toLowerCase() === lob.toLowerCase() &&
            p.status === "active"
    )
}

function formatCurrency(amount: number | null): string {
    if (!amount) return "€0"
    return `€${Number(amount).toLocaleString("en")}`
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
            en: `You have a mortgage of ${formatCurrency(p.mortgageAmount)}. Life insurance ensures your family isn't burdened with the debt if something happens to you.`,
            el: `Έχετε στεγαστικό δάνειο ${formatCurrency(p.mortgageAmount)}. Η ασφάλιση ζωής διασφαλίζει ότι η οικογένειά σας δεν θα επιβαρυνθεί με το χρέος.`,
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
            en: `You have ${p.vehiclesCount} vehicle(s) without motor insurance. Motor insurance is legally mandatory in Greece.`,
            el: `Έχετε ${p.vehiclesCount} όχημα/τα χωρίς ασφάλιση. Η ασφάλιση αυτοκινήτου είναι υποχρεωτική στην Ελλάδα.`,
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
            en: "You own property but have no home insurance. Greece is seismically active — fire, earthquake, and natural disaster coverage is strongly recommended.",
            el: "Έχετε ιδιόκτητο ακίνητο χωρίς ασφάλιση. Η Ελλάδα είναι σεισμογενής — η κάλυψη πυρκαγιάς, σεισμού και φυσικών καταστροφών συνιστάται ιδιαίτερα.",
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
            en: `You have loans totaling ${formatCurrency(p.loanAmount)}. Life insurance prevents debt from passing to your family.`,
            el: `Έχετε δάνεια συνολικού ύψους ${formatCurrency(p.loanAmount)}. Η ασφάλιση ζωής αποτρέπει τη μεταφορά χρέους στην οικογένειά σας.`,
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
 * Determine which lines of business the user should have, based on their profile.
 */
export function getExpectedLines(profile: ProfileFields): string[] {
    const expected: string[] = []

    // Everyone should have health
    expected.push("health")

    if (profile.vehiclesCount > 0) expected.push("motor")
    if (profile.ownsHome) expected.push("home")

    if (
        profile.dependentsCount > 0 ||
        (profile.mortgageAmount != null && Number(profile.mortgageAmount) > 0) ||
        (profile.hasLoans && profile.loanAmount != null && Number(profile.loanAmount) > 0)
    ) {
        expected.push("life")
    }

    if (profile.travelsFrequently) expected.push("travel")
    if (profile.hasPets) expected.push("pet")
    if (profile.employmentStatus === "self_employed") expected.push("liability")
    if (profile.ownsHome || profile.employmentStatus === "self_employed") {
        expected.push("legal_expenses")
    }

    return [...new Set(expected)]
}

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
        }
    }

    return {
        maritalStatus: profile.maritalStatus,
        dependentsCount: profile.dependentsCount,
        employmentStatus: profile.employmentStatus,
        ownsHome: profile.ownsHome,
        mortgageAmount: profile.mortgageAmount
            ? Number(profile.mortgageAmount)
            : null,
        hasPets: profile.hasPets,
        vehiclesCount: profile.vehiclesCount,
        dateOfBirth: (profile as any).dateOfBirth ?? null,
        annualIncome: (profile as any).annualIncome
            ? Number((profile as any).annualIncome)
            : null,
        occupation: (profile as any).occupation ?? null,
        riskTolerance: (profile as any).riskTolerance ?? null,
        hasLoans: (profile as any).hasLoans ?? false,
        loanAmount: (profile as any).loanAmount
            ? Number((profile as any).loanAmount)
            : null,
        travelsFrequently: (profile as any).travelsFrequently ?? false,
        smokingStatus: (profile as any).smokingStatus ?? null,
        lifeEvents: (profile as any).lifeEvents ?? null,
    }
}
