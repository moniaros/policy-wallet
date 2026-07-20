/**
 * What an `askAgent` action actually SAYS to the advisor.
 *
 * Every `ctaType: 'askAgent'` action in a branch bundle is a label — «Ρώτησε
 * τον σύμβουλό σου για μικτή ασφάλιση». This module turns that label into the
 * thread it opens: a subject line, a collaboration category, a priority, and
 * the first message the agent reads. `startBranchActionThread` (in
 * app/(protected)/wallet/collaborationActions.ts) looks the action id up here
 * and hands the result to `collaborationService.ensureAutomationThread`.
 *
 * Bilingual `{el, en}` literals live in `.ts` (not `.tsx`) on purpose: the
 * hardcoded-text linter scans `.tsx` only, so editorial copy stays colocated
 * and reviewable instead of being scattered across translation files.
 *
 * CATEGORY choice is load-bearing, not decorative. `ensureAutomationThread`
 * dedupes against an OPEN thread with the same `(relationshipId, category)`,
 * so the category is the unit of "don't spam the agent". Two different
 * questions in the same category reuse one thread — which is what we want for
 * a user tapping around a policy page, and why «ζήτησε πράσινη κάρτα» gets
 * `document_request` rather than piling onto the general enquiry thread.
 *
 * UNMAPPED ids fall back to `DEFAULT_AGENT_REQUEST`. That matters because the
 * generic bundle in ./index.ts synthesises `${branch.id}_ask_agent` for every
 * branch without authored content — those ids cannot be enumerated here, and
 * a missing map entry must never mean "the button does nothing".
 */
import type { Bilingual } from './types'

export type AgentRequestCategory =
    | 'coverage_gap'
    | 'document_request'
    | 'renewal'
    | 'questionnaire'
    | 'general'

export interface AgentRequestSpec {
    category: AgentRequestCategory
    priority: 'low' | 'medium' | 'high'
    subject: Bilingual
    message: Bilingual
}

/**
 * Used for any `askAgent` id without an explicit entry — notably the
 * `${branchId}_ask_agent` action the generic bundle builds for every
 * non-authored branch.
 */
export const DEFAULT_AGENT_REQUEST: AgentRequestSpec = {
    category: 'general',
    priority: 'medium',
    subject: { el: 'Ερώτηση για συμβόλαιο', en: 'Question about a policy' },
    message: {
        el: 'Ο πελάτης ζήτησε να μιλήσετε για αυτό το συμβόλαιο μέσα από το PolicyWallet.',
        en: 'The customer asked to talk about this policy from inside PolicyWallet.',
    },
}

export const AGENT_REQUESTS: Record<string, AgentRequestSpec> = {
    // ── motor ───────────────────────────────────────────────────────────────
    motor_ask_agent_mikti: {
        category: 'general',
        priority: 'medium',
        subject: { el: 'Ερώτηση για μικτή ασφάλιση', en: 'Question about comprehensive cover' },
        message: {
            el: 'Ο πελάτης θέλει να δει τι θα άλλαζε αν πρόσθετε μικτή κάλυψη σε αυτό το συμβόλαιο — καλύψεις, απαλλαγή και κόστος.',
            en: 'The customer would like to see what would change if comprehensive cover were added to this policy — covers, deductible and cost.',
        },
    },
    motor_request_green_card: {
        category: 'document_request',
        priority: 'high',
        subject: { el: 'Αίτημα για πράσινη κάρτα', en: 'Green card request' },
        message: {
            el: 'Ο πελάτης ζήτησε πράσινη κάρτα (διεθνές πιστοποιητικό ασφάλισης) για αυτό το όχημα.',
            en: 'The customer requested a green card (international insurance certificate) for this vehicle.',
        },
    },

    // ── motorbike ───────────────────────────────────────────────────────────
    motorbike_ask_agent_gear: {
        category: 'general',
        priority: 'medium',
        subject: { el: 'Ερώτηση για κάλυψη εξοπλισμού', en: 'Question about gear cover' },
        message: {
            el: 'Ο πελάτης ρωτά αν ο εξοπλισμός αναβάτη (κράνος, στολή, προστατευτικά) καλύπτεται και με ποια όρια.',
            en: 'The customer is asking whether rider gear (helmet, suit, protectors) is covered and under what limits.',
        },
    },
    motorbike_request_green_card: {
        category: 'document_request',
        priority: 'high',
        subject: { el: 'Αίτημα για πράσινη κάρτα', en: 'Green card request' },
        message: {
            el: 'Ο πελάτης ζήτησε πράσινη κάρτα (διεθνές πιστοποιητικό ασφάλισης) για αυτή τη μοτοσικλέτα.',
            en: 'The customer requested a green card (international insurance certificate) for this motorbike.',
        },
    },

    // ── home ────────────────────────────────────────────────────────────────
    home_ask_agent: {
        category: 'coverage_gap',
        priority: 'high',
        subject: { el: 'Ερώτηση για πλημμύρα και φυσικά φαινόμενα', en: 'Question about flood and natural events' },
        message: {
            el: 'Ο πελάτης ρωτά τι ισχύει για πλημμύρα και φυσικά φαινόμενα στην κατοικία — αν περιλαμβάνονται και με ποια όρια.',
            en: 'The customer is asking what applies for flood and natural events on the home — whether they are included and under what limits.',
        },
    },

    // ── roadside ────────────────────────────────────────────────────────────
    roadside_ask_agent_scope: {
        category: 'coverage_gap',
        priority: 'medium',
        subject: { el: 'Ερώτηση για την εμβέλεια της οδικής βοήθειας', en: 'Question about the assistance cover scope' },
        message: {
            el: 'Ο πελάτης ρωτά αν η γεωγραφική εμβέλεια, η ακτίνα ρυμούλκησης και ο αριθμός κλήσεων επαρκούν για τις διαδρομές που κάνει.',
            en: 'The customer is asking whether the geographic scope, towing radius and call-out allowance are adequate for the routes they actually drive.',
        },
    },

    // ── health ──────────────────────────────────────────────────────────────
    health_ask_agent: {
        category: 'coverage_gap',
        priority: 'medium',
        subject: { el: 'Ερώτηση για συμπληρωματική κάλυψη υγείας', en: 'Question about supplementary health cover' },
        message: {
            el: 'Ο πελάτης θέλει να συζητήσει συμπληρωματική κάλυψη υγείας πάνω από το υπάρχον πρόγραμμα.',
            en: 'The customer would like to discuss supplementary health cover on top of the existing plan.',
        },
    },

    // ── life-adjacent ───────────────────────────────────────────────────────
    life_ask_agent_income: {
        category: 'coverage_gap',
        priority: 'medium',
        subject: { el: 'Ερώτηση για κάλυψη ανικανότητας και εισοδήματος', en: 'Question about disability and income cover' },
        message: {
            el: 'Ο πελάτης θέλει να συζητήσει τι θα άλλαζε αν προστίθετο κάλυψη ανικανότητας ή προστασίας εισοδήματος δίπλα στο συμβόλαιο ζωής.',
            en: 'The customer would like to discuss what would change if disability or income-protection cover were added alongside the life policy.',
        },
    },
    pension_ask_agent: {
        category: 'general',
        priority: 'low',
        subject: { el: 'Ερώτηση για εναλλακτικά συνταξιοδοτικά', en: 'Question about pension alternatives' },
        message: {
            el: 'Ο πελάτης ρωτά για εναλλακτικές λύσεις σε σχέση με το τρέχον συνταξιοδοτικό πρόγραμμα.',
            en: 'The customer is asking about alternatives to the current pension plan.',
        },
    },
    income_protection_ask_agent_sick_pay: {
        category: 'general',
        priority: 'medium',
        subject: { el: 'Ερώτηση για παροχές ασθενείας', en: 'Question about sick pay interaction' },
        message: {
            el: 'Ο πελάτης ρωτά πώς δένει η κάλυψη εισοδήματος με τις παροχές ασθενείας που ήδη δικαιούται.',
            en: 'The customer is asking how the income cover interacts with the sick pay they are already entitled to.',
        },
    },
    personal_accident_ask_agent_scale: {
        category: 'document_request',
        priority: 'medium',
        subject: { el: 'Αίτημα για πίνακα ποσοστών ανικανότητας', en: 'Request for the disability percentage table' },
        message: {
            el: 'Ο πελάτης ζήτησε τον πίνακα ποσοστών ανικανότητας που εφαρμόζεται στο συμβόλαιο προσωπικού ατυχήματος.',
            en: 'The customer requested the disability percentage table that applies to this personal accident policy.',
        },
    },

    // ── specialty ───────────────────────────────────────────────────────────
    boat_ask_agent_layup: {
        category: 'general',
        priority: 'low',
        subject: { el: 'Ερώτηση για την περίοδο παροπλισμού', en: 'Question about the lay-up period' },
        message: {
            el: 'Ο πελάτης ρωτά τι ισχύει στην περίοδο παροπλισμού του σκάφους και αν αλλάζει το ασφάλιστρο.',
            en: 'The customer is asking what applies during the vessel lay-up period and whether the premium changes.',
        },
    },
    travel_ask_agent_scope: {
        category: 'coverage_gap',
        priority: 'medium',
        subject: { el: 'Ερώτηση για προορισμό και δραστηριότητες', en: 'Question about destination and activities' },
        message: {
            el: 'Ο πελάτης ρωτά αν η ταξιδιωτική κάλυψη μπορεί να επεκταθεί ώστε να περιλαμβάνει τον προορισμό ή τις δραστηριότητες που σχεδιάζει.',
            en: 'The customer is asking whether the travel cover can be extended to include the destination or the activities they are planning.',
        },
    },
    pet_ask_agent_leishmania: {
        category: 'coverage_gap',
        priority: 'medium',
        subject: { el: 'Ερώτηση για κάλυψη λεϊσμανίασης', en: 'Question about leishmaniasis cover' },
        message: {
            el: 'Ο πελάτης ρωτά αν η λεϊσμανίαση και οι χρόνιες παθήσεις του κατοικιδίου καλύπτονται, με ποιες αναμονές και με ποια όρια.',
            en: 'The customer is asking whether leishmaniasis and chronic pet conditions are covered, with what waiting periods and what limits.',
        },
    },
    cyber_ask_agent: {
        category: 'general',
        priority: 'medium',
        subject: { el: 'Ερώτηση για οικογενειακή κάλυψη cyber', en: 'Question about family-wide cyber cover' },
        message: {
            el: 'Ο πελάτης ρωτά αν η κάλυψη cyber μπορεί να επεκταθεί σε όλη την οικογένεια.',
            en: 'The customer is asking whether the cyber cover can extend to the whole family.',
        },
    },
    business_ask_agent_fit: {
        category: 'coverage_gap',
        priority: 'high',
        subject: { el: 'Έλεγχος καλύψεων ως προς τη δραστηριότητα', en: 'Covers review against business activity' },
        message: {
            el: 'Ο πελάτης ζήτησε έλεγχο του αν οι καλύψεις της επιχείρησης ταιριάζουν με την πραγματική δραστηριότητα.',
            en: 'The customer asked for a review of whether the business covers match the actual activity.',
        },
    },
    liability_ask_agent: {
        category: 'coverage_gap',
        priority: 'medium',
        subject: { el: 'Ερώτηση για τα όρια ευθύνης', en: 'Question about the liability limits' },
        message: {
            el: 'Ο πελάτης ρωτά αν τα όρια αστικής ευθύνης του συμβολαίου είναι επαρκή για την περίπτωσή του.',
            en: 'The customer is asking whether the policy liability limits are adequate for their situation.',
        },
    },
    legal_ask_agent: {
        category: 'general',
        priority: 'medium',
        subject: { el: 'Ερώτηση για αναγγελία υπόθεσης', en: 'Question about notifying a case' },
        message: {
            el: 'Ο πελάτης ρωτά πώς αναγγέλλεται μια υπόθεση στη νομική προστασία και τι έγγραφα χρειάζονται.',
            en: 'The customer is asking how a case is notified under legal expenses cover and which documents are needed.',
        },
    },

    // ── group / employer schemes ────────────────────────────────────────────
    group_health_ask_agent: {
        category: 'coverage_gap',
        priority: 'medium',
        subject: { el: 'Ερώτηση για κενά του ομαδικού υγείας', en: 'Question about gaps in the group health scheme' },
        message: {
            el: 'Ο πελάτης ρωτά τι μένει ακάλυπτο από το ομαδικό πρόγραμμα υγείας του εργοδότη του.',
            en: 'The customer is asking what remains uncovered by their employer group health scheme.',
        },
    },
    group_life_ask_agent: {
        category: 'coverage_gap',
        priority: 'medium',
        subject: { el: 'Ερώτηση για την κάλυψη μετά την αποχώρηση', en: 'Question about cover after leaving' },
        message: {
            el: 'Ο πελάτης ρωτά τι απομένει από την ομαδική ασφάλιση ζωής αν αποχωρήσει από τον εργοδότη.',
            en: 'The customer is asking what remains of the group life cover if they leave the employer.',
        },
    },
    group_pension_ask_agent: {
        category: 'general',
        priority: 'low',
        subject: { el: 'Ερώτηση για το ομαδικό συνταξιοδοτικό', en: 'Question about the group pension scheme' },
        message: {
            el: 'Ο πελάτης ρωτά πώς δένει το ομαδικό συνταξιοδοτικό με τη δική του αποταμίευση.',
            en: 'The customer is asking how the group pension scheme fits with their own saving.',
        },
    },
}

/** Never returns undefined — see DEFAULT_AGENT_REQUEST above. */
export function getAgentRequest(actionId: string): AgentRequestSpec {
    return AGENT_REQUESTS[actionId] ?? DEFAULT_AGENT_REQUEST
}
