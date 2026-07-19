/**
 * Canonical insurance-branch taxonomy — the single source of truth for
 * lines of business across the app.
 *
 * `Policy.lineOfBusiness` stays a free-form string in the database; this
 * module is the READ-side adapter (`normalizeBranch`) and the WRITE-side
 * vocabulary (`WRITE_BRANCH_IDS` → the Zod enum in lib/validations/policy.ts).
 * UI labels come from i18n `policyTypes.<id>`; the labels here are the
 * server-safe fallback (gap-engine pattern) and the Greek genitive forms
 * used inside generated sentences ("κάλυψη αυτοκινήτου").
 *
 * Keep this module free of React/DOM imports so node scripts (seeds, tests)
 * can consume it. Icons live in lib/insurance/branch-icons.ts.
 */

export type BranchSegment = 'b2c' | 'b2b'
export type BranchContentTier = 'rich' | 'basic'
/** Keys of SCORE_CATEGORIES in lib/services/gap-engine/protection-score.ts */
export type ScoreCategoryKey = 'health' | 'life' | 'property' | 'income' | 'liability' | 'other'

export interface InsuranceBranch {
    /** Canonical snake_case id — what NEW policies store in lineOfBusiness */
    id: string
    segment: BranchSegment
    /** Child branches aggregate under their parent (motorbike → motor) */
    parentId?: string
    /** Server-safe display labels (nominative) */
    label: { el: string; en: string }
    /** Greek genitive, for use inside sentences: "κάλυψη {genitiveEl}" */
    genitiveEl: string
    /** Legacy / external spellings that normalize to this branch */
    aliases: string[]
    /** Primary protection-score bucket; null for B2B lines the score ignores */
    scoreCategory: ScoreCategoryKey | null
    /** Appears in create/edit policy dropdown vocabularies */
    writeEnabled: boolean
    /** rich = has a hand-written content bundle; basic = generic fallback */
    contentTier: BranchContentTier
    /** Slug under app/(public)/product/ when a marketing page exists */
    marketingSlug?: string
}

export const INSURANCE_BRANCHES: InsuranceBranch[] = [
    // ── B2C ──────────────────────────────────────────────────────────
    {
        id: 'motor', segment: 'b2c',
        label: { el: 'Αυτοκίνητο', en: 'Motor' }, genitiveEl: 'αυτοκινήτου',
        aliases: ['auto', 'car', 'vehicle'],
        scoreCategory: 'property', writeEnabled: true, contentTier: 'rich', marketingSlug: 'motor',
    },
    {
        id: 'motorbike', segment: 'b2c', parentId: 'motor',
        label: { el: 'Μοτοσικλέτα', en: 'Motorbike' }, genitiveEl: 'μοτοσικλέτας',
        aliases: ['moto', 'motorcycle'],
        scoreCategory: 'property', writeEnabled: true, contentTier: 'basic',
    },
    {
        id: 'truck', segment: 'b2c', parentId: 'motor',
        label: { el: 'Φορτηγό / Αγροτικό', en: 'Truck / Agricultural' }, genitiveEl: 'φορτηγού',
        aliases: ['agricultural', 'van', 'lorry'],
        scoreCategory: 'property', writeEnabled: false, contentTier: 'basic',
    },
    {
        id: 'roadside', segment: 'b2c',
        label: { el: 'Οδική Βοήθεια', en: 'Roadside Assistance' }, genitiveEl: 'οδικής βοήθειας',
        aliases: ['breakdown', 'assistance'],
        scoreCategory: 'property', writeEnabled: true, contentTier: 'basic',
    },
    {
        id: 'home', segment: 'b2c',
        label: { el: 'Κατοικία', en: 'Home' }, genitiveEl: 'κατοικίας',
        aliases: ['property', 'house', 'household', 'residence'],
        scoreCategory: 'property', writeEnabled: true, contentTier: 'rich', marketingSlug: 'property',
    },
    {
        id: 'renters', segment: 'b2c', parentId: 'home',
        label: { el: 'Ενοικιαστή', en: 'Renters' }, genitiveEl: 'ενοικιαστή',
        aliases: ['tenant'],
        scoreCategory: 'property', writeEnabled: false, contentTier: 'basic',
    },
    {
        id: 'health', segment: 'b2c',
        label: { el: 'Υγεία', en: 'Health' }, genitiveEl: 'υγείας',
        aliases: ['medical'],
        scoreCategory: 'health', writeEnabled: true, contentTier: 'rich', marketingSlug: 'health',
    },
    {
        id: 'life', segment: 'b2c',
        label: { el: 'Ζωή', en: 'Life' }, genitiveEl: 'ζωής',
        aliases: [],
        scoreCategory: 'life', writeEnabled: true, contentTier: 'rich', marketingSlug: 'life',
    },
    {
        id: 'income_protection', segment: 'b2c', parentId: 'life',
        label: { el: 'Προστασία Εισοδήματος', en: 'Income Protection' }, genitiveEl: 'προστασίας εισοδήματος',
        aliases: ['income'],
        scoreCategory: 'income', writeEnabled: true, contentTier: 'basic',
    },
    {
        id: 'disability', segment: 'b2c', parentId: 'life',
        label: { el: 'Ανικανότητα', en: 'Disability' }, genitiveEl: 'ανικανότητας',
        aliases: [],
        scoreCategory: 'income', writeEnabled: false, contentTier: 'basic',
    },
    {
        id: 'personal_accident', segment: 'b2c', parentId: 'life',
        label: { el: 'Προσωπικό Ατύχημα', en: 'Personal Accident' }, genitiveEl: 'προσωπικού ατυχήματος',
        aliases: ['accident'],
        scoreCategory: 'life', writeEnabled: true, contentTier: 'basic',
    },
    {
        id: 'pension', segment: 'b2c',
        label: { el: 'Σύνταξη & Αποταμίευση', en: 'Pension & Savings' }, genitiveEl: 'σύνταξης',
        aliases: ['retirement', 'savings'],
        scoreCategory: 'income', writeEnabled: true, contentTier: 'rich', marketingSlug: 'pension',
    },
    {
        id: 'travel', segment: 'b2c',
        label: { el: 'Ταξιδιωτική', en: 'Travel' }, genitiveEl: 'ταξιδιού',
        aliases: ['trip'],
        scoreCategory: 'other', writeEnabled: true, contentTier: 'rich', marketingSlug: 'travel',
    },
    {
        id: 'pet', segment: 'b2c',
        label: { el: 'Κατοικίδιο', en: 'Pet' }, genitiveEl: 'κατοικιδίου',
        aliases: [],
        scoreCategory: 'other', writeEnabled: true, contentTier: 'rich', marketingSlug: 'pet',
    },
    {
        id: 'cyber', segment: 'b2c',
        label: { el: 'Cyber', en: 'Cyber' }, genitiveEl: 'cyber',
        aliases: ['online'],
        scoreCategory: 'other', writeEnabled: true, contentTier: 'rich', marketingSlug: 'cyber',
    },
    {
        id: 'liability', segment: 'b2c',
        label: { el: 'Αστική Ευθύνη', en: 'Liability' }, genitiveEl: 'αστικής ευθύνης',
        aliases: ['public_liability', 'private_liability'],
        scoreCategory: 'liability', writeEnabled: true, contentTier: 'basic',
    },
    {
        id: 'legal_expenses', segment: 'b2c',
        label: { el: 'Νομική Προστασία', en: 'Legal Expenses' }, genitiveEl: 'νομικής προστασίας',
        aliases: ['legal'],
        scoreCategory: 'liability', writeEnabled: true, contentTier: 'basic',
    },
    {
        id: 'boat', segment: 'b2c',
        label: { el: 'Σκάφος', en: 'Boat' }, genitiveEl: 'σκάφους',
        aliases: ['marine', 'yacht'],
        scoreCategory: 'property', writeEnabled: true, contentTier: 'basic', marketingSlug: 'boat',
    },
    {
        id: 'gadget', segment: 'b2c',
        label: { el: 'Συσκευές', en: 'Gadget' }, genitiveEl: 'συσκευών',
        aliases: [],
        scoreCategory: 'other', writeEnabled: false, contentTier: 'basic',
    },
    {
        id: 'bicycle', segment: 'b2c',
        label: { el: 'Ποδήλατο', en: 'Bicycle' }, genitiveEl: 'ποδηλάτου',
        aliases: [],
        scoreCategory: 'other', writeEnabled: false, contentTier: 'basic',
    },

    // ── B2B ──────────────────────────────────────────────────────────
    {
        id: 'business', segment: 'b2b',
        label: { el: 'Επιχείρηση', en: 'Business' }, genitiveEl: 'επιχείρησης',
        aliases: ['commercial', 'sme'],
        scoreCategory: null, writeEnabled: true, contentTier: 'rich', marketingSlug: 'business',
    },
    {
        id: 'business_property', segment: 'b2b', parentId: 'business',
        label: { el: 'Επαγγελματική Στέγη', en: 'Business Property' }, genitiveEl: 'επαγγελματικής στέγης',
        aliases: [],
        scoreCategory: null, writeEnabled: false, contentTier: 'basic',
    },
    {
        id: 'equipment', segment: 'b2b', parentId: 'business',
        label: { el: 'Εξοπλισμός', en: 'Equipment' }, genitiveEl: 'εξοπλισμού',
        aliases: [],
        scoreCategory: null, writeEnabled: false, contentTier: 'basic',
    },
    {
        id: 'stock', segment: 'b2b', parentId: 'business',
        label: { el: 'Εμπορεύματα', en: 'Stock' }, genitiveEl: 'εμπορευμάτων',
        aliases: ['goods', 'inventory'],
        scoreCategory: null, writeEnabled: false, contentTier: 'basic',
    },
    {
        id: 'business_interruption', segment: 'b2b', parentId: 'business',
        label: { el: 'Διακοπή Εργασιών', en: 'Business Interruption' }, genitiveEl: 'διακοπής εργασιών',
        aliases: [],
        scoreCategory: null, writeEnabled: false, contentTier: 'basic',
    },
    {
        id: 'professional_liability', segment: 'b2b', parentId: 'business',
        label: { el: 'Επαγγελματική Αστική Ευθύνη', en: 'Professional Liability' }, genitiveEl: 'επαγγελματικής αστικής ευθύνης',
        aliases: ['professional_indemnity'],
        scoreCategory: null, writeEnabled: false, contentTier: 'basic',
    },
    {
        id: 'employer_liability', segment: 'b2b', parentId: 'business',
        label: { el: 'Ευθύνη Εργοδότη', en: 'Employer Liability' }, genitiveEl: 'ευθύνης εργοδότη',
        aliases: [],
        scoreCategory: null, writeEnabled: false, contentTier: 'basic',
    },
    {
        id: 'technical_works', segment: 'b2b', parentId: 'business',
        label: { el: 'Τεχνικά Έργα', en: 'Technical Works' }, genitiveEl: 'τεχνικών έργων',
        aliases: ['contractors'],
        scoreCategory: null, writeEnabled: false, contentTier: 'basic',
    },
    {
        id: 'energy', segment: 'b2b', parentId: 'business',
        label: { el: 'Ενέργεια / Φωτοβολταϊκά', en: 'Energy / Photovoltaics' }, genitiveEl: 'ενέργειας',
        aliases: ['photovoltaic', 'pv', 'solar'],
        scoreCategory: null, writeEnabled: false, contentTier: 'basic',
    },
    {
        id: 'transports', segment: 'b2b', parentId: 'business',
        label: { el: 'Μεταφορές', en: 'Transports' }, genitiveEl: 'μεταφορών',
        aliases: ['cargo', 'freight'],
        scoreCategory: null, writeEnabled: false, contentTier: 'basic',
    },
    {
        id: 'guarantees', segment: 'b2b', parentId: 'business',
        label: { el: 'Εγγυήσεις', en: 'Guarantees' }, genitiveEl: 'εγγυήσεων',
        aliases: ['bonds', 'surety'],
        scoreCategory: null, writeEnabled: false, contentTier: 'basic',
    },
    {
        id: 'special_risks', segment: 'b2b', parentId: 'business',
        label: { el: 'Ειδικοί Κίνδυνοι', en: 'Special Risks' }, genitiveEl: 'ειδικών κινδύνων',
        aliases: [],
        scoreCategory: null, writeEnabled: false, contentTier: 'basic',
    },
    {
        id: 'group_health', segment: 'b2b',
        label: { el: 'Ομαδική Υγεία', en: 'Group Health' }, genitiveEl: 'ομαδικής υγείας',
        aliases: [],
        scoreCategory: 'health', writeEnabled: true, contentTier: 'basic', marketingSlug: 'group-health',
    },
    {
        id: 'group_life', segment: 'b2b',
        label: { el: 'Ομαδική Ζωή', en: 'Group Life' }, genitiveEl: 'ομαδικής ζωής',
        aliases: [],
        scoreCategory: 'life', writeEnabled: true, contentTier: 'basic',
    },
    {
        id: 'group_pension', segment: 'b2b',
        label: { el: 'Ομαδική Σύνταξη', en: 'Group Pension' }, genitiveEl: 'ομαδικής σύνταξης',
        aliases: [],
        scoreCategory: 'income', writeEnabled: true, contentTier: 'basic', marketingSlug: 'group-pension',
    },

    // ── Fallback ─────────────────────────────────────────────────────
    {
        id: 'other', segment: 'b2c',
        label: { el: 'Άλλο', en: 'Other' }, genitiveEl: 'άλλης ασφάλισης',
        aliases: ['unknown', 'misc'],
        scoreCategory: 'other', writeEnabled: true, contentTier: 'basic',
    },
]

export const BRANCHES_BY_ID: Record<string, InsuranceBranch> = Object.fromEntries(
    INSURANCE_BRANCHES.map((branch) => [branch.id, branch])
)

const BRANCHES_BY_ALIAS: Record<string, InsuranceBranch> = Object.fromEntries(
    INSURANCE_BRANCHES.flatMap((branch) => branch.aliases.map((alias) => [alias, branch]))
)

/**
 * Vocabulary for the create/edit policy Zod enum. Literal tuple (not derived)
 * so `z.enum` keeps the literal union type; tests assert it stays consistent
 * with `writeEnabled` and remains a superset of the legacy 9-value enum.
 */
export const WRITE_BRANCH_IDS = [
    'motor',
    'motorbike',
    'home',
    'health',
    'life',
    'income_protection',
    'personal_accident',
    'pension',
    'travel',
    'pet',
    'cyber',
    'liability',
    'legal_expenses',
    'roadside',
    'boat',
    'business',
    'group_health',
    'group_life',
    'group_pension',
    'other',
] as const

export type WriteBranchId = (typeof WRITE_BRANCH_IDS)[number]

export function getBranch(id: string): InsuranceBranch | undefined {
    return BRANCHES_BY_ID[id]
}

/**
 * Map a free-form lineOfBusiness value (DB rows, AI extraction output,
 * marketing category ids) to its canonical branch. Never returns null —
 * unknown values fall back to 'other'.
 */
export function normalizeBranch(raw: string | null | undefined): InsuranceBranch {
    if (!raw) return BRANCHES_BY_ID.other

    const key = raw.toLowerCase().trim().replace(/[-\s]+/g, '_')
    const exact = BRANCHES_BY_ID[key] || BRANCHES_BY_ALIAS[key]
    if (exact) return exact

    // Substring heuristics for legacy free-form values ("Auto Insurance",
    // "lifeAndInvestment", "group health plan"). Order matters: group and
    // two-wheeler checks must run before their broader substrings.
    if (key.includes('group')) {
        if (key.includes('health')) return BRANCHES_BY_ID.group_health
        if (key.includes('life')) return BRANCHES_BY_ID.group_life
        if (key.includes('pension')) return BRANCHES_BY_ID.group_pension
        return BRANCHES_BY_ID.business
    }
    if (key.includes('motorbike') || key.includes('motorcycle') || key.includes('moped')) return BRANCHES_BY_ID.motorbike
    if (key.includes('bicycle') || key.includes('bike')) return BRANCHES_BY_ID.bicycle
    if (key.includes('motor') || key.includes('auto')) return BRANCHES_BY_ID.motor
    if (key.includes('truck') || key.includes('agri')) return BRANCHES_BY_ID.truck
    if (key.includes('roadside') || key.includes('breakdown')) return BRANCHES_BY_ID.roadside
    if (key.includes('health') || key.includes('medical')) return BRANCHES_BY_ID.health
    if (key.includes('home') || key.includes('property') || key.includes('house') || key.includes('condo')) return BRANCHES_BY_ID.home
    if (key.includes('pension') || key.includes('retirement') || key.includes('saving')) return BRANCHES_BY_ID.pension
    if (key.includes('income')) return BRANCHES_BY_ID.income_protection
    if (key.includes('accident')) return BRANCHES_BY_ID.personal_accident
    if (key.includes('life') || key.includes('invest')) return BRANCHES_BY_ID.life
    if (key.includes('travel') || key.includes('trip')) return BRANCHES_BY_ID.travel
    if (key.includes('pet') || key.includes('dog') || key.includes('cat')) return BRANCHES_BY_ID.pet
    if (key.includes('cyber') || key.includes('online')) return BRANCHES_BY_ID.cyber
    if (key.includes('legal')) return BRANCHES_BY_ID.legal_expenses
    if (key.includes('liabilit')) return BRANCHES_BY_ID.liability
    if (key.includes('marine') || key.includes('yacht') || key.includes('boat')) return BRANCHES_BY_ID.boat
    if (key.includes('business') || key.includes('commercial') || key.includes('shop')) return BRANCHES_BY_ID.business

    return BRANCHES_BY_ID.other
}

/** A branch id plus all of its descendants — for aggregating policies. */
export function getBranchFamily(id: string): string[] {
    const family = [id]
    for (const branch of INSURANCE_BRANCHES) {
        if (branch.parentId && family.includes(branch.parentId)) {
            family.push(branch.id)
        }
    }
    return family
}

export function branchLabel(idOrRaw: string, language: 'el' | 'en'): string {
    const branch = getBranch(idOrRaw) ?? normalizeBranch(idOrRaw)
    return branch.label[language]
}
