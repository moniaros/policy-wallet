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
 *
 * TWO INVARIANTS THAT ARE EASY TO BREAK:
 *
 * 1. **The tree is two levels deep, and that is load-bearing.** `branchFamilyId`
 *    is `parentId ?? id`, so a grandchild resolves to its parent rather than to
 *    the root and silently stops matching the root's cover checks. New branches
 *    go exactly one level below a root.
 * 2. **Never re-parent an existing branch.** Every risk in the catalog matches
 *    cover by branch family; giving `gadget` a parent would detach the
 *    `valuables_loss` risk from every gadget policy already in the database.
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
        aliases: ['auto', 'car', 'vehicle', 'αυτοκινητου', 'κλαδος_αυτοκινητων'],
        scoreCategory: 'property', writeEnabled: true, contentTier: 'rich', marketingSlug: 'motor',
    },
    {
        id: 'motorbike', segment: 'b2c', parentId: 'motor',
        label: { el: 'Μοτοσικλέτα', en: 'Motorbike' }, genitiveEl: 'μοτοσικλέτας',
        aliases: ['moto', 'motorcycle', 'μοτοσικλετα', 'μηχανακι'],
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
        aliases: ['breakdown', 'assistance', 'οδικη_βοηθεια'],
        scoreCategory: 'property', writeEnabled: true, contentTier: 'basic',
    },
    {
        id: 'home', segment: 'b2c',
        label: { el: 'Κατοικία', en: 'Home' }, genitiveEl: 'κατοικίας',
        aliases: ['property', 'house', 'household', 'residence', 'κατοικιας', 'περιουσιας', 'πυρος'],
        scoreCategory: 'property', writeEnabled: true, contentTier: 'rich', marketingSlug: 'property',
    },
    {
        id: 'renters', segment: 'b2c', parentId: 'home',
        label: { el: 'Ενοικιαστή', en: 'Renters' }, genitiveEl: 'ενοικιαστή',
        aliases: ['tenant'],
        scoreCategory: 'property', writeEnabled: true, contentTier: 'basic',
    },
    {
        id: 'health', segment: 'b2c',
        label: { el: 'Υγεία', en: 'Health' }, genitiveEl: 'υγείας',
        aliases: ['medical', 'υγειας', 'νοσοκομειακη'],
        scoreCategory: 'health', writeEnabled: true, contentTier: 'rich', marketingSlug: 'health',
    },
    {
        id: 'life', segment: 'b2c',
        label: { el: 'Ζωή', en: 'Life' }, genitiveEl: 'ζωής',
        aliases: ['ζωης', 'ασφαλιση_ζωης'],
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
        aliases: ['accident', 'προσωπικο_ατυχημα', 'ατυχηματων'],
        scoreCategory: 'life', writeEnabled: true, contentTier: 'basic',
    },
    {
        id: 'pension', segment: 'b2c',
        label: { el: 'Σύνταξη & Αποταμίευση', en: 'Pension & Savings' }, genitiveEl: 'σύνταξης',
        aliases: ['retirement', 'savings', 'συνταξης', 'αποταμιευσης'],
        scoreCategory: 'income', writeEnabled: true, contentTier: 'rich', marketingSlug: 'pension',
    },
    {
        id: 'travel', segment: 'b2c',
        label: { el: 'Ταξιδιωτική', en: 'Travel' }, genitiveEl: 'ταξιδιού',
        aliases: ['trip', 'ταξιδιωτικη', 'ταξιδιου'],
        scoreCategory: 'other', writeEnabled: true, contentTier: 'rich', marketingSlug: 'travel',
    },
    {
        id: 'pet', segment: 'b2c',
        label: { el: 'Κατοικίδιο', en: 'Pet' }, genitiveEl: 'κατοικιδίου',
        aliases: ['κατοικιδιου', 'κατοικιδιο'],
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
        aliases: [
            'public_liability', 'private_liability', 'general_liability',
            'αστικη_ευθυνη', 'αστικης_ευθυνης', 'γενικη_αστικη_ευθυνη',
            // Common-areas liability for a block of flats: the διαχειριστής is a
            // mass-market Greek consumer product, not a commercial line.
            'αστικη_ευθυνη_διαχειριστη', 'ευθυνη_κοινοχρηστων_χωρων',
        ],
        scoreCategory: 'liability', writeEnabled: true, contentTier: 'basic', marketingSlug: 'liability',
    },
    {
        id: 'legal_expenses', segment: 'b2c',
        label: { el: 'Νομική Προστασία', en: 'Legal Expenses' }, genitiveEl: 'νομικής προστασίας',
        aliases: ['legal', 'νομικη_προστασια', 'νομικης_προστασιας'],
        scoreCategory: 'liability', writeEnabled: true, contentTier: 'basic', marketingSlug: 'legal-expenses',
    },
    {
        id: 'boat', segment: 'b2c',
        label: { el: 'Σκάφος', en: 'Boat' }, genitiveEl: 'σκάφους',
        aliases: ['marine', 'yacht', 'σκαφους', 'σκαφος', 'σκαφη_αναψυχης'],
        scoreCategory: 'property', writeEnabled: true, contentTier: 'basic', marketingSlug: 'boat',
    },
    {
        // Ίδιες ζημιές — Institute Yacht Clauses hull & machinery. Kept apart
        // from boat_tpl because they are sold, priced and lapsed separately:
        // a boat can carry the compulsory liability with no hull cover at all.
        id: 'boat_hull', segment: 'b2c', parentId: 'boat',
        label: { el: 'Σκάφος — Ίδιες Ζημιές', en: 'Boat Hull & Machinery' }, genitiveEl: 'ιδίων ζημιών σκάφους',
        aliases: ['yacht_hull', 'hull_and_machinery', 'ιδιες_ζημιες_σκαφους'],
        scoreCategory: 'property', writeEnabled: true, contentTier: 'basic',
    },
    {
        // Compulsory for Greek recreational craft under Ν.4926/2022 and ΓΚΛ 20 —
        // its absence is a legal exposure, not a preference.
        id: 'boat_tpl', segment: 'b2c', parentId: 'boat',
        label: { el: 'Σκάφος — Αστική Ευθύνη', en: 'Boat Third-Party Liability' }, genitiveEl: 'αστικής ευθύνης σκάφους',
        aliases: ['yacht_tpl', 'boat_third_party', 'αστικη_ευθυνη_σκαφους'],
        scoreCategory: 'liability', writeEnabled: true, contentTier: 'basic',
    },
    {
        // Scheduled fine art and valuables at agreed values. Deliberately NOT a
        // child of `gadget`: re-parenting gadget would detach the existing
        // valuables_loss risk from every gadget policy already stored.
        id: 'fine_art', segment: 'b2c',
        label: { el: 'Έργα Τέχνης & Τιμαλφή', en: 'Fine Art & Valuables' }, genitiveEl: 'έργων τέχνης',
        aliases: ['specie', 'artwork', 'valuables', 'εργα_τεχνης', 'τιμαλφη'],
        scoreCategory: 'other', writeEnabled: true, contentTier: 'basic', marketingSlug: 'fine-art',
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
        aliases: ['commercial', 'sme', 'επιχειρησης', 'επαγγελματικη'],
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
        aliases: ['professional_indemnity', 'επαγγελματικη_αστικη_ευθυνη'],
        scoreCategory: null, writeEnabled: true, contentTier: 'basic',
    },
    {
        id: 'employer_liability', segment: 'b2b', parentId: 'business',
        label: { el: 'Ευθύνη Εργοδότη', en: 'Employer Liability' }, genitiveEl: 'ευθύνης εργοδότη',
        aliases: ['ευθυνη_εργοδοτη', 'εργατικο_ατυχημα'],
        scoreCategory: null, writeEnabled: true, contentTier: 'basic',
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
        aliases: ['cargo', 'freight', 'carriers_liability', 'ευθυνη_μεταφορεα'],
        scoreCategory: null, writeEnabled: true, contentTier: 'basic',
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
        aliases: ['ειδικοι_κινδυνοι'],
        scoreCategory: null, writeEnabled: false, contentTier: 'basic',
    },
    // ── Commercial specialty lines ───────────────────────────────────
    // All are direct children of `business` so branchFamilyId collapses them to
    // 'business' and every existing B2B aggregation picks them up unchanged.
    {
        id: 'marine_hull', segment: 'b2b', parentId: 'business',
        label: { el: 'Σκάφη & Πλοία (Επαγγελματικά)', en: 'Marine Hull (Commercial)' }, genitiveEl: 'επαγγελματικού σκάφους',
        aliases: ['port_risks', 'brownwater', 'κλαδος_πλοιων', 'πλοιων'],
        scoreCategory: null, writeEnabled: true, contentTier: 'basic',
    },
    {
        id: 'marine_cargo', segment: 'b2b', parentId: 'business',
        label: { el: 'Μεταφορές Εμπορευμάτων', en: 'Marine Cargo' }, genitiveEl: 'μεταφοράς εμπορευμάτων',
        aliases: ['cargo_insurance', 'goods_in_transit', 'κλαδος_μεταφορων', 'μεταφορων', 'εμπορευματων'],
        scoreCategory: null, writeEnabled: true, contentTier: 'basic',
    },
    {
        id: 'marine_crew', segment: 'b2b', parentId: 'business',
        label: { el: 'Πληρώματα Πλοίων', en: "Ships' Crew" }, genitiveEl: 'πληρωμάτων πλοίων',
        aliases: ['crew', 'seafarers', 'κλαδος_πληρωματων', 'πληρωματων'],
        scoreCategory: null, writeEnabled: true, contentTier: 'basic',
    },
    {
        id: 'money', segment: 'b2b', parentId: 'business',
        label: { el: 'Χρήματα', en: 'Money' }, genitiveEl: 'χρημάτων',
        aliases: ['cash', 'cash_in_transit', 'cash_in_safe', 'χρηματων', 'μεταφορα_χρηματων'],
        scoreCategory: null, writeEnabled: true, contentTier: 'basic',
    },
    {
        id: 'fidelity', segment: 'b2b', parentId: 'business',
        label: { el: 'Εμπιστοσύνη Υπαλλήλων', en: 'Fidelity Guarantee' }, genitiveEl: 'εμπιστοσύνης υπαλλήλων',
        aliases: ['fidelity_guarantee', 'employee_dishonesty', 'εμπιστοσυνης', 'εμπιστοσυνη_υπαλληλων'],
        scoreCategory: null, writeEnabled: true, contentTier: 'basic',
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
        scoreCategory: 'life', writeEnabled: true, contentTier: 'basic', marketingSlug: 'group-life',
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

/**
 * Fold a free-form line-of-business string into a lookup key.
 *
 * Greek matters here, and used not to be handled at all: the alias table was
 * English-only, so `ΑΣΤΙΚΗ ΕΥΘΥΝΗ` and `ΚΛΑΔΟΣ ΜΕΤΑΦΟΡΩΝ` — the words actually
 * printed on Greek policy schedules — both normalized to `other`.
 *
 * Two Greek-specific folds beyond lowercasing:
 *  - **accents**, because uppercase Greek drops them (`ΑΣΤΙΚΗ` → `αστικη`) while
 *    title case keeps them (`Αστική` → `αστική`), so the same word arrives in two
 *    spellings depending on how the insurer typeset the schedule;
 *  - **final sigma**, since `ΠΛΟΙΩΝ`/`πλοίως` differ only in a positional form.
 *
 * Aliases are therefore stored already folded (unaccented, medial sigma).
 */
function foldKey(raw: string): string {
    return raw
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/ς/g, 'σ')
        .trim()
        .replace(/[^\p{L}\p{N}_]+/gu, '_')
        .replace(/^_+|_+$/g, '')
}

const BRANCHES_BY_ALIAS: Record<string, InsuranceBranch> = Object.fromEntries(
    INSURANCE_BRANCHES.flatMap((branch) => branch.aliases.map((alias) => [foldKey(alias), branch]))
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
    // PW-CONTENT-01 Goal 5: a tenant's policy is its own line — it was catalogue-only,
    // so every renters document was stored as `home` and no renters rule could exist.
    'renters',
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
    'boat_hull',
    'boat_tpl',
    'fine_art',
    'business',
    'professional_liability',
    'employer_liability',
    'transports',
    'marine_hull',
    'marine_cargo',
    'marine_crew',
    'money',
    'fidelity',
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

    const key = foldKey(raw)
    const exact = BRANCHES_BY_ID[key] || BRANCHES_BY_ALIAS[key]
    if (exact) return exact

    // Substring heuristics for legacy free-form values ("Auto Insurance",
    // "lifeAndInvestment", "group health plan"). Order matters: group and
    // two-wheeler checks must run before their broader substrings.
    if (key.includes('group') || key.includes('ομαδικ')) {
        if (key.includes('health') || key.includes('υγει')) return BRANCHES_BY_ID.group_health
        if (key.includes('life') || key.includes('ζωη')) return BRANCHES_BY_ID.group_life
        if (key.includes('pension') || key.includes('συνταξ')) return BRANCHES_BY_ID.group_pension
        return BRANCHES_BY_ID.business
    }

    // ── Specialty lines, tested BEFORE the broad families they contain ──
    // Every rule below used to fall through to a wrong answer: `marine cargo`
    // and `marine crew` both landed on `boat`, so a truck transit and a
    // shipowner's crew liability were filed as pleasure-craft cover.
    if (key.includes('cash') || key.includes('χρηματ')) return BRANCHES_BY_ID.money
    if (key.includes('fidelity') || key.includes('dishonest') || key.includes('εμπιστοσυν')) return BRANCHES_BY_ID.fidelity
    if (key.includes('fine_art') || key.includes('specie') || key.includes('εργα_τεχν') || key.includes('τιμαλφ')) return BRANCHES_BY_ID.fine_art
    if (key.includes('crew') || key.includes('seafarer') || key.includes('πληρωματ')) return BRANCHES_BY_ID.marine_crew
    if (key.includes('cargo') || key.includes('freight') || key.includes('μεταφορ') || key.includes('εμπορευματ')) {
        return BRANCHES_BY_ID.marine_cargo
    }
    // A hull is a hull; which book it sits in is decided by whether the craft is
    // a pleasure yacht (b2c) or anything else (commercial).
    if (key.includes('hull') || key.includes('σκαφ') || key.includes('πλοι')) {
        if (key.includes('yacht') || key.includes('pleasure') || key.includes('αναψυχ')) {
            return key.includes('hull') ? BRANCHES_BY_ID.boat_hull : BRANCHES_BY_ID.boat
        }
        if (key.includes('hull') || key.includes('πλοι')) return BRANCHES_BY_ID.marine_hull
        return BRANCHES_BY_ID.boat
    }

    if (key.includes('motorbike') || key.includes('motorcycle') || key.includes('moped') || key.includes('μοτοσικλετ')) return BRANCHES_BY_ID.motorbike
    if (key.includes('bicycle') || key.includes('bike') || key.includes('ποδηλατ')) return BRANCHES_BY_ID.bicycle
    if (key.includes('motor') || key.includes('auto') || key.includes('αυτοκινητ')) return BRANCHES_BY_ID.motor
    if (key.includes('truck') || key.includes('agri') || key.includes('φορτηγ')) return BRANCHES_BY_ID.truck
    if (key.includes('roadside') || key.includes('breakdown') || key.includes('οδικη_βοηθ')) return BRANCHES_BY_ID.roadside
    if (key.includes('health') || key.includes('medical') || key.includes('υγει') || key.includes('νοσοκομειακ')) return BRANCHES_BY_ID.health
    // κατοικίδιο (pet) shares its first six letters with κατοικία (home).
    if (key.includes('pet') || key.includes('dog') || key.includes('cat') || key.includes('κατοικιδ')) return BRANCHES_BY_ID.pet
    if (key.includes('home') || key.includes('property') || key.includes('house') || key.includes('condo') || key.includes('κατοικι') || key.includes('περιουσι')) return BRANCHES_BY_ID.home
    if (key.includes('pension') || key.includes('retirement') || key.includes('saving') || key.includes('συνταξ') || key.includes('αποταμιευ')) return BRANCHES_BY_ID.pension
    if (key.includes('income') || key.includes('εισοδηματ')) return BRANCHES_BY_ID.income_protection
    if (key.includes('accident') || key.includes('ατυχημ')) return BRANCHES_BY_ID.personal_accident
    if (key.includes('life') || key.includes('invest') || key.includes('ζωη')) return BRANCHES_BY_ID.life
    if (key.includes('travel') || key.includes('trip') || key.includes('ταξιδ')) return BRANCHES_BY_ID.travel
    if (key.includes('cyber') || key.includes('online') || key.includes('διαδικτυ')) return BRANCHES_BY_ID.cyber
    if (key.includes('legal') || key.includes('νομικ')) return BRANCHES_BY_ID.legal_expenses
    if (key.includes('employer') || key.includes('εργοδοτ')) return BRANCHES_BY_ID.employer_liability
    if (key.includes('professional') || key.includes('επαγγελματικ')) return BRANCHES_BY_ID.professional_liability
    if (key.includes('liabilit') || key.includes('αστικ')) return BRANCHES_BY_ID.liability
    if (key.includes('marine') || key.includes('yacht') || key.includes('boat')) return BRANCHES_BY_ID.boat
    if (key.includes('business') || key.includes('commercial') || key.includes('shop') || key.includes('επιχειρησ')) return BRANCHES_BY_ID.business

    return BRANCHES_BY_ID.other
}

/** A branch id plus all of its descendants — for aggregating policies. */
/**
 * The branch FAMILY id for any line of business — a child resolves to its
 * parent, everything else to itself.
 *
 * `normalizeBranch(x).id` gives the branch's OWN id, which is what code reaching
 * for it usually does not want: `normalizeBranch('motorbike').id === 'motor'` is
 * false. That one confusion produced five separate defects — an insured
 * motorbike accused of being uninsured at critical severity, a motorbike scoring
 * as no property cover, a motorbike commissioned at the default rate, a
 * motorbike with no plate on the wallet list, and a rented home invisible to the
 * earthquake rule — before it was worth naming.
 *
 * Reach for this whenever the question is "is this a motor policy?" rather than
 * "which exact branch is this?".
 */
export function branchFamilyId(raw: string | null | undefined): string {
    const branch = normalizeBranch(raw)
    return (branch.parentId ?? branch.id).toLowerCase()
}

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
