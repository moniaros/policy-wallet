/**
 * Branch content registry — rich hand-written bundles for the core branches,
 * a taxonomy-derived generic fallback for everything else. Rendered by branch
 * pages, PolicyQA suggested questions and branch empty states.
 */
import { getBranch, normalizeBranch, type InsuranceBranch } from '@/lib/insurance/taxonomy'

import type { Bilingual, BranchContent } from './types'
import { motorContent } from './motor'
import { homeContent } from './home'
import { healthContent } from './health'
import { lifeContent } from './life'
import { pensionContent } from './pension'
import { travelContent } from './travel'
import { cyberContent } from './cyber'
import { petContent } from './pet'
import { businessContent } from './business'

export type { Bilingual, BranchAction, BranchCommonGap, BranchContent } from './types'

export const RICH_BRANCH_CONTENT: Record<string, BranchContent> = {
    motor: motorContent,
    home: homeContent,
    health: healthContent,
    life: lifeContent,
    pension: pensionContent,
    travel: travelContent,
    cyber: cyberContent,
    pet: petContent,
    business: businessContent,
}

function genitive(branch: InsuranceBranch): string {
    return branch.genitiveEl
}

/**
 * Generic content for basic-tier branches: taxonomy labels slotted into
 * neutral, hedged chrome so every branch page renders something honest
 * without hand-written copy.
 */
export function buildGenericContent(branch: InsuranceBranch): BranchContent {
    const label: Bilingual = branch.label
    return {
        branchId: branch.id,
        tagline: {
            el: `Δες με απλά λόγια τι φαίνεται να καλύπτει το συμβόλαιο ${genitive(branch)} σου.`,
            en: `See in plain language what your ${label.en.toLowerCase()} policy appears to cover.`,
        },
        shortDescription: {
            el: `Το PolicyWallet διαβάζει το έγγραφο που ανέβασες και σου δείχνει καλύψεις, εξαιρέσεις, όρια και ημερομηνίες για την ασφάλιση ${genitive(branch)}.`,
            en: `PolicyWallet reads the document you uploaded and shows coverages, exclusions, limits and dates for your ${label.en.toLowerCase()} insurance.`,
        },
        whyItMatters: [
            {
                el: 'Οι περισσότερες διαφωνίες σε αποζημιώσεις ξεκινούν από όρους που κανείς δεν είχε διαβάσει — οι εξαιρέσεις και οι απαλλαγές μετράνε όσο και οι καλύψεις.',
                en: 'Most claim disputes start from terms nobody had read — exclusions and deductibles matter as much as the covers.',
            },
            {
                el: 'Ξέροντας τι ισχύει από πριν, μπορείς να ρωτήσεις τον ασφαλιστή ή τον σύμβουλό σου τις σωστές ερωτήσεις, την ώρα που έχει σημασία.',
                en: 'Knowing what applies in advance lets you ask your insurer or advisor the right questions, when it matters.',
            },
        ],
        whatWeAnalyze: [
            {
                el: 'Με βάση το έγγραφο που ανέβασες: καλύψεις, εξαιρέσεις, όρια, απαλλαγές και σημαντικές ημερομηνίες.',
                en: 'Based on the document you uploaded: coverages, exclusions, limits, deductibles and key dates.',
            },
            {
                el: 'Σημαντικούς όρους στα ψιλά γράμματα — αναμονές, προθεσμίες δήλωσης ζημιάς, αυτόματες ανανεώσεις.',
                en: 'Important fine-print terms — waiting periods, claim deadlines, automatic renewals.',
            },
        ],
        howToUseBetter: [
            {
                el: 'Κράτα το συμβόλαιο ενημερωμένο μετά από κάθε σημαντική αλλαγή — οι καλύψεις δεν προσαρμόζονται μόνες τους.',
                en: 'Keep the policy current after every significant change — covers do not adjust themselves.',
            },
            {
                el: 'Πριν την ανανέωση, σύγκρινε όρους και όρια — όχι μόνο το ασφάλιστρο.',
                en: 'Before renewal, compare terms and limits — not just the premium.',
            },
        ],
        commonGaps: [
            {
                id: `${branch.id}_unclear_terms`,
                title: { el: 'Όροι που ίσως χρειάζονται έλεγχο', en: 'Terms that may need a check' },
                description: {
                    el: 'Αν οι εξαιρέσεις ή τα όρια δεν είναι ξεκάθαρα στο έγγραφο, ζήτησε επιβεβαίωση από τον ασφαλιστή ή τον σύμβουλό σου.',
                    en: 'If exclusions or limits are unclear in the document, ask your insurer or advisor to confirm.',
                },
                relatedRuleId: 'unclear_exclusions',
            },
        ],
        recommendedActions: [
            {
                id: `${branch.id}_ask_covered`,
                label: { el: 'Ρώτησε τι καλύπτεται', en: 'Ask what is covered' },
                href: null,
                ctaType: 'askAi',
                question: { el: 'Τι καλύπτει το συμβόλαιό μου;', en: 'What does my policy cover?' },
            },
            {
                id: `${branch.id}_ask_agent`,
                label: { el: 'Ρώτησε τον σύμβουλό σου', en: 'Ask your advisor' },
                href: '/agent',
                ctaType: 'askAgent',
            },
        ],
        suggestedQuestions: [
            { el: 'Τι καλύπτει το συμβόλαιό μου;', en: 'What does my policy cover?' },
            { el: 'Τι ΔΕΝ καλύπτεται;', en: 'What is NOT covered?' },
            { el: 'Ποια είναι η απαλλαγή μου;', en: 'What is my deductible?' },
            { el: 'Πότε λήγει το συμβόλαιο;', en: 'When does the policy expire?' },
            { el: 'Πώς δηλώνω μια ζημιά;', en: 'How do I file a claim?' },
        ],
        claimsSteps: [
            {
                el: 'Δήλωσε το συμβάν στον ασφαλιστή σου το συντομότερο — τα περισσότερα συμβόλαια ορίζουν προθεσμία λίγων ημερών.',
                en: 'Report the event to your insurer promptly — most policies set a deadline of a few days.',
            },
            {
                el: 'Κατάγραψε ό,τι έγινε (φωτογραφίες, έγγραφα, αποδείξεις) πριν αλλάξει οτιδήποτε.',
                en: 'Document what happened (photos, papers, receipts) before anything changes.',
            },
            {
                el: 'Κράτα τον αριθμό συμβολαίου πρόχειρο — ζητείται σε κάθε επικοινωνία.',
                en: 'Keep the policy number at hand — it is requested in every interaction.',
            },
        ],
        renewalNote: {
            el: 'Θα σου θυμίσουμε πριν τη λήξη, με βάση τις ημερομηνίες του εγγράφου.',
            en: 'We will remind you before expiry, based on the document’s dates.',
        },
        emptyState: {
            headline: {
                el: `Δεν έχεις προσθέσει συμβόλαιο σε αυτόν τον κλάδο`,
                en: `No ${label.en.toLowerCase()} policy added yet`,
            },
            description: {
                el: `Ανέβασε το ασφαλιστήριο ${genitive(branch)} σου και δες με απλά λόγια τι καλύπτει.`,
                en: `Upload your ${label.en.toLowerCase()} policy and see in plain language what it covers.`,
            },
            ctaLabel: { el: 'Ανέβασε συμβόλαιο', en: 'Upload policy' },
        },
    }
}

/**
 * Resolve content for a canonical branch id or any free-form lineOfBusiness
 * value. Child branches fall back to their parent's rich bundle (motorbike →
 * motor) before the generic one.
 */
export function getBranchContent(idOrRaw: string | null | undefined): BranchContent {
    const branch = normalizeBranch(idOrRaw)
    if (RICH_BRANCH_CONTENT[branch.id]) return RICH_BRANCH_CONTENT[branch.id]
    if (branch.parentId) {
        const parentRich = RICH_BRANCH_CONTENT[branch.parentId]
        if (parentRich) return parentRich
    }
    const registered = getBranch(branch.id)
    return buildGenericContent(registered ?? branch)
}

/** Suggested questions for one language — PolicyQA convenience. */
export function getBranchQuestions(idOrRaw: string | null | undefined, language: 'el' | 'en'): string[] {
    return getBranchContent(idOrRaw).suggestedQuestions.map((question) => question[language])
}
