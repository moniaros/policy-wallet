export interface InsuranceClarityChecklistPillar {
    key: string
    title: {
        en: string
        el: string
    }
    description: {
        en: string
        el: string
    }
    checks: string[]
}

export const INSURANCE_CLARITY_CHECKLIST: InsuranceClarityChecklistPillar[] = [
    {
        key: "policy_inventory",
        title: {
            en: "Policy inventory coverage",
            el: "Καταγραφή όλων των ασφαλιστηρίων",
        },
        description: {
            en: "Confirms all active policies are recorded with correct type and ownership.",
            el: "Επιβεβαιώνει ότι όλα τα ενεργά ασφαλιστήρια έχουν καταγραφεί σωστά.",
        },
        checks: [
            "all_known_policies_registered",
            "policy_type_classified",
            "policy_owner_identified",
        ],
    },
    {
        key: "policy_metadata_completeness",
        title: {
            en: "Policy data completeness",
            el: "Πληρότητα βασικών στοιχείων συμβολαίου",
        },
        description: {
            en: "Validates insurer, policy number, dates, premium, and limits.",
            el: "Ελέγχει ασφαλιστή, αριθμό συμβολαίου, ημερομηνίες, ασφάλιστρο και όρια.",
        },
        checks: [
            "insurer_present",
            "policy_number_present",
            "coverage_period_present",
            "premium_present",
            "limits_present",
            "deductibles_present",
        ],
    },
    {
        key: "coverage_exclusions_clarity",
        title: {
            en: "Coverage and exclusions clarity",
            el: "Σαφήνεια καλύψεων και εξαιρέσεων",
        },
        description: {
            en: "Explains what is covered, not covered, and key restrictions in plain language.",
            el: "Εξηγεί απλά τι καλύπτεται, τι δεν καλύπτεται και ποιους περιορισμούς έχει το συμβόλαιο.",
        },
        checks: [
            "core_coverages_mapped",
            "major_exclusions_identified",
            "high_impact_restrictions_flagged",
        ],
    },
    {
        key: "beneficiaries_and_contacts",
        title: {
            en: "Beneficiaries and emergency contacts",
            el: "Δικαιούχοι και στοιχεία έκτακτης ανάγκης",
        },
        description: {
            en: "Checks beneficiary/contact data and claim readiness information.",
            el: "Ελέγχει δικαιούχους, στοιχεία επικοινωνίας και ετοιμότητα για αποζημίωση.",
        },
        checks: [
            "beneficiaries_recorded_when_required",
            "claims_contact_available",
            "emergency_contact_available",
        ],
    },
    {
        key: "documentation_readiness",
        title: {
            en: "Documentation readiness",
            el: "Οργάνωση και προσβασιμότητα εγγράφων",
        },
        description: {
            en: "Verifies that critical policy documents are present and usable.",
            el: "Επιβεβαιώνει ότι τα κρίσιμα έγγραφα υπάρχουν και είναι αξιοποιήσιμα.",
        },
        checks: [
            "source_document_uploaded",
            "document_readable",
            "critical_sections_extracted",
        ],
    },
    {
        key: "savings_opportunities",
        title: {
            en: "Savings opportunities",
            el: "Ευκαιρίες εξοικονόμησης",
        },
        description: {
            en: "Identifies premium optimization opportunities and potential annual savings.",
            el: "Εντοπίζει δυνατότητες βελτιστοποίησης κόστους και πιθανή ετήσια εξοικονόμηση.",
        },
        checks: [
            "market_comparison_prompted",
            "overlap_or_duplication_flagged",
            "premium_optimization_actions_provided",
        ],
    },
    {
        key: "gap_detection",
        title: {
            en: "Coverage gap detection",
            el: "Εντοπισμός κενών κάλυψης",
        },
        description: {
            en: "Detects material coverage gaps and prioritizes risk exposure.",
            el: "Εντοπίζει ουσιαστικά κενά κάλυψης και ιεραρχεί την έκθεση κινδύνου.",
        },
        checks: [
            "critical_gap_identification",
            "gap_severity_assigned",
            "mitigation_action_recommended",
        ],
    },
    {
        key: "review_and_renewal_discipline",
        title: {
            en: "Review and renewal discipline",
            el: "Πειθαρχία επανελέγχου και ανανέωσης",
        },
        description: {
            en: "Ensures upcoming renewals and periodic review actions are visible.",
            el: "Διασφαλίζει ορατότητα σε λήξεις και ενέργειες περιοδικού ελέγχου.",
        },
        checks: [
            "renewal_date_present",
            "renewal_risk_flagged_if_near",
            "next_review_action_defined",
        ],
    },
]

export const INSURANCE_CLARITY_CHECKLIST_TOTAL_CHECKS = INSURANCE_CLARITY_CHECKLIST.reduce(
    (sum, pillar) => sum + pillar.checks.length,
    0
)

