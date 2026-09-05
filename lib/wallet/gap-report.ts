import * as Sentry from "@sentry/nextjs"
import type { GapSeverity } from "@/lib/gap-detection"
import { PROVENANCE_RANK, provenanceOf } from "@/lib/gaps/provenance"

/**
 * Render-layer presentation of AI-detected coverage gaps.
 *
 * GapDefinition rows are minted by the analysis pipeline from UNCONSTRAINED
 * AI slugs, so their titles are humanized English keys ("Usa-Copayment") and
 * the same concept can exist under several spellings (mental_health_exclusion
 * vs mental-health-exclusion — a real prod duplicate). The pipeline is locked;
 * this module fixes both at read time: a Greek/English content map keyed by
 * NORMALIZED slug (with heuristic + generic fallbacks, Sentry-reported so the
 * map keeps growing) and slug-level dedupe.
 */

export type GapMechanic = "exclusion" | "limit" | "cost_sharing" | "other"

export type GapCoverageArea =
    | "hospital"
    | "outpatient"
    | "maternity_mental"
    | "abroad"
    | "vehicle"
    | "property"
    | "pet"
    | "general"

export interface GapContent {
    /**
     * Canonical concept id — the dedupe key across the whole app.
     * It collapses BOTH spelling variants (mental_health_exclusion /
     * mental-health-exclusion) and vocabulary aliases for one finding:
     * the AI's `theft` and the seeded rule's `motor-theft` are one concept,
     * as are `own-damage` and `own-vehicle-damage`.
     */
    concept: string
    titleEl: string
    titleEn: string
    mechanic: GapMechanic
    coverageArea: GapCoverageArea
    /** false ⇒ resolved via heuristics/generic fallback (unmapped slug) */
    known: boolean
}

/** Extra context that sharpens resolution — all optional. */
export interface GapContentContext {
    /** The policy's line of business. Outside health, the coverage area IS the
     *  branch: a motor policy must never render a "Property" group. */
    lineOfBusiness?: string | null
    /** The AI's own words for this gap. Used to title unmapped vocabulary in
     *  Greek instead of stamping every unknown gap with one generic heading. */
    aiExplanationEl?: string | null
    aiExplanation?: string | null
}

export interface GapReportItem {
    id: string
    slug: string
    /** GapInstance ids of DB-level duplicates collapsed into this item */
    duplicateIds: string[]
    /**
     * The gap's severity, carried from GapInstance. It drives which gaps a
     * free-tier owner sees before the paywall: without it, the lock boundary
     * fell on coverage-area order then alphabetical Greek title, so a CRITICAL
     * gap — an uninsured compulsory line — could be the one hidden behind the
     * €3 unlock while three trivial gaps showed free. Optional so older callers
     * that never set it default to the least-urgent rank rather than crash.
     */
    severity?: GapSeverity | null
    /**
     * Evidence ladder carried from GapInstance.validationState: probable
     * (AI-detected) → confirmed (advisor agrees) → validated (documented
     * recommendation). Optional so older callers default to the AI-probable
     * reading rather than crash.
     */
    validationState?: 'probable' | 'confirmed' | 'validated' | null
    content: GapContent
    aiExplanation: string | null
    aiExplanationEl: string | null
    aiSuggestion: string | null
    aiSuggestionEl: string | null
}

/**
 * The gaps a locked free-tier owner sees in full: the first `count` by
 * PROVENANCE (legal and contractual requirements first, then market practice,
 * then findings still under review) with a stable tiebreak on the caller's
 * order. Severity is not an input (PW-TRANSPARENCY-02 B1). Returns their ids so
 * the display keeps its grouping while the paywall hides the rest.
 */
export function selectFreePreviewGapIds(items: GapReportItem[], count: number): Set<string> {
    const ranked = items
        .map((item, index) => ({ id: item.id, rank: PROVENANCE_RANK[provenanceOf(item.slug)], index }))
        .sort((a, b) => a.rank - b.rank || a.index - b.index)
    return new Set(ranked.slice(0, Math.max(0, count)).map((entry) => entry.id))
}

export function normalizeGapSlug(raw: string): string {
    return String(raw || "")
        .trim()
        .toLowerCase()
        .replace(/[\s_]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
}

type GapContentEntry = Omit<GapContent, "known" | "concept"> & {
    /** Defaults to the map key. Set it when several slugs are ONE finding. */
    concept?: string
}

// Every slug observed in prod (health dump 2026-07-13, motor dump 2026-07-14)
// + the seeded definitions + likely vocabulary variants. Titles are hedged
// (πιθανή/περιορισμός) — the engine's detections are observational, not
// underwriter-validated.
export const GAP_CONTENT_MAP: Record<string, GapContentEntry> = {
    // ── Prod-observed AI slugs ──────────────────────────────────────────
    "high-deductible": {
        titleEl: "Υψηλή απαλλαγή (εκπιπτόμενο ποσό)",
        titleEn: "High deductible",
        mechanic: "cost_sharing",
        coverageArea: "hospital",
    },
    "mental-health-exclusion": {
        titleEl: "Εξαίρεση ψυχικής υγείας",
        titleEn: "Mental health exclusion",
        mechanic: "exclusion",
        coverageArea: "maternity_mental",
    },
    "maternity-exclusion": {
        titleEl: "Εξαίρεση/περιορισμός παροχών μητρότητας",
        titleEn: "Maternity benefits exclusion",
        mechanic: "exclusion",
        coverageArea: "maternity_mental",
    },
    "pregnancy-childbirth-exclusion": {
        concept: "maternity-exclusion",
        titleEl: "Εξαίρεση κύησης και τοκετού",
        titleEn: "Pregnancy and childbirth exclusion",
        mechanic: "exclusion",
        coverageArea: "maternity_mental",
    },
    "low-outpatient-limit": {
        concept: "outpatient-limit",
        titleEl: "Χαμηλό όριο εξωνοσοκομειακών δαπανών",
        titleEn: "Low outpatient expenses limit",
        mechanic: "limit",
        coverageArea: "outpatient",
    },
    "usa-copayment": {
        titleEl: "Αυξημένη συμμετοχή για νοσηλεία σε ΗΠΑ/Καναδά",
        titleEn: "Higher copayment for USA/Canada treatment",
        mechanic: "cost_sharing",
        coverageArea: "abroad",
    },
    "usa-hospitalization-cost": {
        titleEl: "Κόστος νοσηλείας σε ΗΠΑ/Καναδά",
        titleEn: "USA/Canada hospitalization cost",
        mechanic: "limit",
        coverageArea: "abroad",
    },
    "rehab-exclusion": {
        titleEl: "Εξαίρεση αποκατάστασης",
        titleEn: "Rehabilitation exclusion",
        mechanic: "exclusion",
        coverageArea: "hospital",
    },
    "restrictive-hospital-definition": {
        titleEl: "Περιοριστικός ορισμός νοσοκομείου",
        titleEn: "Restrictive hospital definition",
        mechanic: "other",
        coverageArea: "hospital",
    },
    "medical-assistance-age-limit": {
        titleEl: "Ηλικιακό όριο ιατρικής βοήθειας",
        titleEn: "Medical assistance age limit",
        mechanic: "limit",
        coverageArea: "general",
    },
    "limited-emergency-care": {
        titleEl: "Περιορισμένη κάλυψη επειγόντων περιστατικών",
        titleEn: "Limited emergency care coverage",
        mechanic: "limit",
        coverageArea: "hospital",
    },
    // ── Motor & property vocabulary (prod-observed 2026-07-14) ──────────
    // The AI names a missing motor cover after the cover itself ("theft"),
    // while the seeded rules prefix the branch ("motor-theft"). Same finding —
    // one concept, or the policy renders both.
    theft: {
        concept: "theft",
        titleEl: "Πιθανή έλλειψη κάλυψης κλοπής",
        titleEn: "Possible missing theft coverage",
        mechanic: "exclusion",
        coverageArea: "vehicle",
    },
    fire: {
        concept: "fire",
        titleEl: "Πιθανή έλλειψη κάλυψης πυρκαγιάς",
        titleEn: "Possible missing fire coverage",
        mechanic: "exclusion",
        coverageArea: "property",
    },
    "glass-breakage": {
        concept: "glass-breakage",
        titleEl: "Πιθανή έλλειψη κάλυψης θραύσης κρυστάλλων",
        titleEn: "Possible missing glass breakage coverage",
        mechanic: "exclusion",
        coverageArea: "vehicle",
    },
    windscreen: {
        concept: "glass-breakage",
        titleEl: "Πιθανή έλλειψη κάλυψης θραύσης κρυστάλλων",
        titleEn: "Possible missing windscreen coverage",
        mechanic: "exclusion",
        coverageArea: "vehicle",
    },
    // Prod gap definition created directly in the DB (no seed, no map entry) —
    // it was rendering the generic fallback heading AND, because it shares the
    // concept with `glass-breakage` whose definition also fires, a second card
    // for the same finding. The concept alias fixes both.
    "no-glass-breakage": {
        concept: "glass-breakage",
        titleEl: "Πιθανή έλλειψη κάλυψης θραύσης κρυστάλλων",
        titleEn: "Possible missing glass breakage coverage",
        mechanic: "exclusion",
        coverageArea: "vehicle",
    },

    // The clarity pipeline's third spelling of the same finding (Sentry
    // POLICYWALLET-7). Same concept, so dedupeGaps collapses it with the others.
    "no-glass-breakage-cover": {
        concept: "glass-breakage",
        titleEl: "Πιθανή έλλειψη κάλυψης θραύσης κρυστάλλων",
        titleEn: "Possible missing glass breakage coverage",
        mechanic: "exclusion",
        coverageArea: "vehicle",
    },

    "no-glass-coverage": {
        concept: "glass-breakage",
        titleEl: "Πιθανή έλλειψη κάλυψης θραύσης κρυστάλλων",
        titleEn: "Possible missing glass breakage coverage",
        mechanic: "exclusion",
        coverageArea: "vehicle",
    },
    "own-damage": {
        concept: "own-damage",
        titleEl: "Πιθανή έλλειψη κάλυψης ιδίων ζημιών (μικτή)",
        titleEn: "Possible missing own-damage coverage",
        mechanic: "exclusion",
        coverageArea: "vehicle",
    },
    "own-vehicle-damage": {
        concept: "own-damage",
        titleEl: "Πιθανή έλλειψη κάλυψης ιδίων ζημιών (μικτή)",
        titleEn: "Possible missing own-damage coverage",
        mechanic: "exclusion",
        coverageArea: "vehicle",
    },
    // Same story as no-glass-breakage: DB-only slug, third spelling of the
    // own-damage finding.
    "own-damage-gap": {
        concept: "own-damage",
        titleEl: "Πιθανή έλλειψη κάλυψης ιδίων ζημιών (μικτή)",
        titleEn: "Possible missing own-damage coverage",
        mechanic: "exclusion",
        coverageArea: "vehicle",
    },

    "no-own-damage-cover": {
        concept: "own-damage",
        titleEl: "Πιθανή έλλειψη κάλυψης ιδίων ζημιών (μικτή)",
        titleEn: "Possible missing own-damage coverage",
        mechanic: "exclusion",
        coverageArea: "vehicle",
    },

    // Collision IS own damage in Greek motor cover (ίδιες ζημιές / μικτή).
    "no-collision-coverage": {
        concept: "own-damage",
        titleEl: "Πιθανή έλλειψη κάλυψης ιδίων ζημιών (μικτή)",
        titleEn: "Possible missing own-damage coverage",
        mechanic: "exclusion",
        coverageArea: "vehicle",
    },
    "malicious-acts-terrorism": {
        concept: "malicious-acts",
        titleEl: "Πιθανή έλλειψη κάλυψης κακόβουλων/τρομοκρατικών ενεργειών",
        titleEn: "Possible missing malicious acts / terrorism coverage",
        mechanic: "exclusion",
        coverageArea: "vehicle",
    },
    "malicious-acts": {
        concept: "malicious-acts",
        titleEl: "Πιθανή έλλειψη κάλυψης κακόβουλων ενεργειών",
        titleEn: "Possible missing malicious acts coverage",
        mechanic: "exclusion",
        coverageArea: "vehicle",
    },
    "natural-disasters": {
        concept: "natural-disasters",
        titleEl: "Πιθανή έλλειψη κάλυψης φυσικών φαινομένων",
        titleEn: "Possible missing natural disasters coverage",
        mechanic: "exclusion",
        coverageArea: "property",
    },
    flood: {
        concept: "flood",
        titleEl: "Πιθανή έλλειψη κάλυψης πλημμύρας",
        titleEn: "Possible missing flood coverage",
        mechanic: "exclusion",
        coverageArea: "property",
    },
    hail: {
        concept: "hail",
        titleEl: "Πιθανή έλλειψη κάλυψης χαλαζόπτωσης",
        titleEn: "Possible missing hail coverage",
        mechanic: "exclusion",
        coverageArea: "property",
    },
    "riot-strike": {
        concept: "riot-strike",
        titleEl: "Πιθανή έλλειψη κάλυψης στάσεων, απεργιών και οχλαγωγιών",
        titleEn: "Possible missing riot & strike coverage",
        mechanic: "exclusion",
        coverageArea: "vehicle",
    },
    "roadside-assistance": {
        concept: "roadside-assistance",
        titleEl: "Πιθανή έλλειψη οδικής βοήθειας",
        titleEn: "Possible missing roadside assistance",
        mechanic: "exclusion",
        coverageArea: "vehicle",
    },

    "no-roadside-assistance": {
        concept: "roadside-assistance",
        titleEl: "Πιθανή έλλειψη οδικής βοήθειας",
        titleEn: "Possible missing roadside assistance",
        mechanic: "exclusion",
        coverageArea: "vehicle",
    },
    "personal-accident-driver": {
        concept: "personal-accident-driver",
        titleEl: "Πιθανή έλλειψη προσωπικού ατυχήματος οδηγού",
        titleEn: "Possible missing driver personal accident coverage",
        mechanic: "exclusion",
        coverageArea: "vehicle",
    },
    "uninsured-vehicle": {
        concept: "uninsured-vehicle",
        titleEl: "Πιθανή έλλειψη κάλυψης από ανασφάλιστο όχημα",
        titleEn: "Possible missing uninsured-vehicle coverage",
        mechanic: "exclusion",
        coverageArea: "vehicle",
    },
    "replacement-vehicle": {
        concept: "replacement-vehicle",
        titleEl: "Πιθανή έλλειψη οχήματος αντικατάστασης",
        titleEn: "Possible missing replacement vehicle",
        mechanic: "exclusion",
        coverageArea: "vehicle",
    },
    // ── Seeded GapDefinitions (prisma/seed.ts) ──────────────────────────
    "motor-theft": {
        concept: "theft",
        titleEl: "Πιθανή έλλειψη κάλυψης κλοπής",
        titleEn: "Possible missing theft coverage",
        mechanic: "exclusion",
        coverageArea: "vehicle",
    },
    "motor-legal": {
        concept: "legal-protection",
        titleEl: "Πιθανή έλλειψη νομικής προστασίας",
        titleEn: "Possible missing legal protection",
        mechanic: "exclusion",
        coverageArea: "vehicle",
    },
    "legal-protection": {
        concept: "legal-protection",
        titleEl: "Πιθανή έλλειψη νομικής προστασίας",
        titleEn: "Possible missing legal protection",
        mechanic: "exclusion",
        coverageArea: "vehicle",
    },
    "health-outpatient": {
        concept: "outpatient-limit",
        titleEl: "Περιορισμένη εξωνοσοκομειακή κάλυψη",
        titleEn: "Limited outpatient coverage",
        mechanic: "limit",
        coverageArea: "outpatient",
    },
    // Group-health gap definition created directly in the DB. Unlike the two
    // motor slugs above this is a genuinely new concept, not an alias — no
    // existing entry covers preventive/screening cover.
    "preventive-care-gap": {
        concept: "preventive-care",
        titleEl: "Πιθανή έλλειψη κάλυψης προληπτικών εξετάσεων",
        titleEn: "Possible missing preventive care coverage",
        mechanic: "exclusion",
        coverageArea: "outpatient",
    },

    // An annual check-up IS preventive care — same concept, the model's other word.
    "no-annual-checkup": {
        concept: "preventive-care",
        titleEl: "Πιθανή έλλειψη κάλυψης προληπτικών εξετάσεων",
        titleEn: "Possible missing preventive care coverage",
        mechanic: "exclusion",
        coverageArea: "outpatient",
    },
    "home-earthquake": {
        concept: "earthquake",
        titleEl: "Πιθανή έλλειψη κάλυψης σεισμού",
        titleEn: "Possible missing earthquake coverage",
        mechanic: "exclusion",
        coverageArea: "property",
    },
    earthquake: {
        concept: "earthquake",
        titleEl: "Πιθανή έλλειψη κάλυψης σεισμού",
        titleEn: "Possible missing earthquake coverage",
        mechanic: "exclusion",
        coverageArea: "property",
    },
    "missing-enfia-components": {
        titleEl: "Ελλιπής κάλυψη για ΕΝΦΙΑ (πυρκαγιά/σεισμός/πλημμύρα)",
        titleEn: "Incomplete ENFIA coverage components",
        mechanic: "exclusion",
        coverageArea: "property",
    },
    "missing-coordination-centre": {
        titleEl: "Δεν εντοπίστηκε κέντρο συντονισμού",
        titleEn: "No coordination centre found",
        mechanic: "other",
        coverageArea: "hospital",
    },
    "missing-leishmaniasis": {
        titleEl: "Πιθανή έλλειψη κάλυψης λεϊσμανίασης",
        titleEn: "Possible missing leishmaniasis coverage",
        mechanic: "exclusion",
        coverageArea: "pet",
    },
    "green-card-expiring": {
        titleEl: "Η Πράσινη Κάρτα φαίνεται να λήγει σύντομα",
        titleEn: "Green Card appears to expire soon",
        mechanic: "other",
        coverageArea: "vehicle",
    },
    "low-deductible-premium-waste": {
        titleEl: "Χαμηλή απαλλαγή — πιθανό περιθώριο εξοικονόμησης",
        titleEn: "Low deductible — possible savings margin",
        mechanic: "cost_sharing",
        coverageArea: "general",
    },
    // ── Likely AI vocabulary (health) ───────────────────────────────────
    "psychiatric-exclusion": {
        concept: "mental-health-exclusion",
        titleEl: "Εξαίρεση ψυχιατρικής περίθαλψης",
        titleEn: "Psychiatric care exclusion",
        mechanic: "exclusion",
        coverageArea: "maternity_mental",
    },
    "maternity-waiting-period": {
        titleEl: "Περίοδος αναμονής μητρότητας",
        titleEn: "Maternity waiting period",
        mechanic: "limit",
        coverageArea: "maternity_mental",
    },
    "pregnancy-exclusion": {
        concept: "maternity-exclusion",
        titleEl: "Εξαίρεση/περιορισμός παροχών μητρότητας",
        titleEn: "Maternity benefits exclusion",
        mechanic: "exclusion",
        coverageArea: "maternity_mental",
    },

    // The model states this one as the cover rather than the exclusion; it is
    // the same finding, so it takes the same concept and collapses with it.
    "maternity-coverage": {
        concept: "maternity-exclusion",
        titleEl: "Εξαίρεση/περιορισμός παροχών μητρότητας",
        titleEn: "Maternity benefits exclusion",
        mechanic: "exclusion",
        coverageArea: "maternity_mental",
    },
    "pre-existing-conditions-exclusion": {
        titleEl: "Εξαίρεση προϋπαρχουσών παθήσεων",
        titleEn: "Pre-existing conditions exclusion",
        mechanic: "exclusion",
        coverageArea: "general",
    },
    "outpatient-limit": {
        titleEl: "Όριο εξωνοσοκομειακών δαπανών",
        titleEn: "Outpatient expenses cap",
        mechanic: "limit",
        coverageArea: "outpatient",
    },
    "diagnostic-tests-limit": {
        titleEl: "Όριο διαγνωστικών εξετάσεων",
        titleEn: "Diagnostic tests limit",
        mechanic: "limit",
        coverageArea: "outpatient",
    },
    "doctor-visits-limit": {
        titleEl: "Όριο ιατρικών επισκέψεων",
        titleEn: "Doctor visits limit",
        mechanic: "limit",
        coverageArea: "outpatient",
    },
    "dental-exclusion": {
        titleEl: "Εξαίρεση οδοντιατρικής κάλυψης",
        titleEn: "Dental care exclusion",
        mechanic: "exclusion",
        coverageArea: "outpatient",
    },
    "chronic-conditions-exclusion": {
        titleEl: "Εξαίρεση χρόνιων παθήσεων",
        titleEn: "Chronic conditions exclusion",
        mechanic: "exclusion",
        coverageArea: "general",
    },
    "room-type-limit": {
        titleEl: "Περιορισμός θέσης νοσηλείας",
        titleEn: "Room type limit",
        mechanic: "limit",
        coverageArea: "hospital",
    },
    "hospital-daily-limit": {
        titleEl: "Ημερήσιο όριο νοσηλείας",
        titleEn: "Daily hospitalization limit",
        mechanic: "limit",
        coverageArea: "hospital",
    },
    "annual-limit": {
        titleEl: "Ετήσιο ανώτατο όριο κάλυψης",
        titleEn: "Annual coverage cap",
        mechanic: "limit",
        coverageArea: "general",
    },
    "coinsurance": {
        titleEl: "Ποσοστό συμμετοχής στα έξοδα",
        titleEn: "Cost-sharing percentage",
        mechanic: "cost_sharing",
        coverageArea: "hospital",
    },
    "waiting-period": {
        titleEl: "Περίοδος αναμονής καλύψεων",
        titleEn: "Coverage waiting period",
        mechanic: "limit",
        coverageArea: "general",
    },
    "rehabilitation-limit": {
        titleEl: "Όριο αποκατάστασης/φυσικοθεραπειών",
        titleEn: "Rehabilitation/physiotherapy limit",
        mechanic: "limit",
        coverageArea: "hospital",
    },
    "medication-limit": {
        titleEl: "Περιορισμός φαρμακευτικής κάλυψης",
        titleEn: "Medication coverage limit",
        mechanic: "limit",
        coverageArea: "outpatient",
    },
    "age-limit": {
        titleEl: "Ηλικιακό όριο κάλυψης",
        titleEn: "Age limit on coverage",
        mechanic: "limit",
        coverageArea: "general",
    },
    "emergency-only-abroad": {
        titleEl: "Μόνο επείγοντα περιστατικά στο εξωτερικό",
        titleEn: "Emergency-only cover abroad",
        mechanic: "limit",
        coverageArea: "abroad",
    },

    // ── Liability / business / disability slugs (prod dump 2026-07-18→21;
    //    Sentry POLICYWALLET-7). These fell through to the AI-sentence fallback,
    //    and alias pairs (…-gap vs bare, singular/plural) failed to dedupe as
    //    one concept. General coverage area — outside health the area is the
    //    branch, and these ride liability/business/professional lines. ──
    "employer-liability": {
        concept: "employer-liability",
        titleEl: "Πιθανό κενό ευθύνης εργοδότη",
        titleEn: "Possible employer's liability gap",
        mechanic: "other",
        coverageArea: "general",
    },
    "employer-liability-gap": {
        concept: "employer-liability",
        titleEl: "Πιθανό κενό ευθύνης εργοδότη",
        titleEn: "Possible employer's liability gap",
        mechanic: "other",
        coverageArea: "general",
    },
    "employers-liability": {
        concept: "employer-liability",
        titleEl: "Πιθανό κενό ευθύνης εργοδότη",
        titleEn: "Possible employer's liability gap",
        mechanic: "other",
        coverageArea: "general",
    },
    "professional-liability": {
        concept: "professional-liability",
        titleEl: "Πιθανό κενό επαγγελματικής ευθύνης",
        titleEn: "Possible professional liability gap",
        mechanic: "other",
        coverageArea: "general",
    },
    "professional-liability-gap": {
        concept: "professional-liability",
        titleEl: "Πιθανό κενό επαγγελματικής ευθύνης",
        titleEn: "Possible professional liability gap",
        mechanic: "other",
        coverageArea: "general",
    },
    "product-liability": {
        concept: "product-liability",
        titleEl: "Πιθανό κενό ευθύνης προϊόντος",
        titleEn: "Possible product liability gap",
        mechanic: "other",
        coverageArea: "general",
    },
    "product-liability-gap": {
        concept: "product-liability",
        titleEl: "Πιθανό κενό ευθύνης προϊόντος",
        titleEn: "Possible product liability gap",
        mechanic: "other",
        coverageArea: "general",
    },
    "cyber-liability": {
        concept: "cyber-liability",
        titleEl: "Πιθανό κενό κάλυψης κυβερνοκινδύνων",
        titleEn: "Possible cyber liability gap",
        mechanic: "other",
        coverageArea: "general",
    },
    "cyber-risk-gap": {
        concept: "cyber-liability",
        titleEl: "Πιθανό κενό κάλυψης κυβερνοκινδύνων",
        titleEn: "Possible cyber liability gap",
        mechanic: "other",
        coverageArea: "general",
    },
    "fire-explosion-liability-gap": {
        concept: "fire-explosion-liability",
        titleEl: "Πιθανό κενό ευθύνης από πυρκαγιά/έκρηξη",
        titleEn: "Possible fire & explosion liability gap",
        mechanic: "other",
        coverageArea: "general",
    },
    "vehicle-vessel-aircraft-liability-gap": {
        concept: "vehicle-vessel-aircraft-liability",
        titleEl: "Πιθανό κενό ευθύνης οχήματος/σκάφους/αεροσκάφους",
        titleEn: "Possible vehicle/vessel/aircraft liability gap",
        mechanic: "other",
        coverageArea: "general",
    },
    "communicable-disease-liability": {
        concept: "communicable-disease",
        titleEl: "Πιθανή εξαίρεση μεταδοτικών νόσων",
        titleEn: "Possible communicable-disease exclusion",
        mechanic: "exclusion",
        coverageArea: "general",
    },
    "communicable-disease-gap": {
        concept: "communicable-disease",
        titleEl: "Πιθανή εξαίρεση μεταδοτικών νόσων",
        titleEn: "Possible communicable-disease exclusion",
        mechanic: "exclusion",
        coverageArea: "general",
    },
    "elevator-maintenance-risk": {
        concept: "elevator-maintenance",
        titleEl: "Κίνδυνος συντήρησης ανελκυστήρα",
        titleEn: "Elevator maintenance risk",
        mechanic: "other",
        coverageArea: "general",
    },
    "low-liability-limits": {
        concept: "low-liability-limits",
        titleEl: "Χαμηλά όρια αστικής ευθύνης",
        titleEn: "Low liability limits",
        mechanic: "limit",
        coverageArea: "general",
    },
    "family-exclusion-gap": {
        concept: "family-exclusion",
        titleEl: "Πιθανή εξαίρεση μελών οικογένειας",
        titleEn: "Possible family-member exclusion",
        mechanic: "exclusion",
        coverageArea: "general",
    },
    "waiting-period-disability": {
        concept: "waiting-period-disability",
        titleEl: "Περίοδος αναμονής για παροχές ανικανότητας",
        titleEn: "Waiting period for disability benefits",
        mechanic: "limit",
        coverageArea: "general",
    },
    "missing-policy-details": {
        concept: "missing-policy-details",
        titleEl: "Ελλιπή στοιχεία ασφαλιστηρίου",
        titleEn: "Missing policy details",
        mechanic: "other",
        coverageArea: "general",
    },

    /**
     * Concepts the map did not have, taken from the slugs the clarity pipeline
     * actually emitted in production (Sentry POLICYWALLET-7). Until a slug is
     * authored here, `resolveGapContent` titles the card with the MODEL's first
     * sentence — so an unauthored slug is not a cosmetic gap, it is AI prose
     * rendered as a heading in the customer's wallet.
     *
     * The two `missing-*` entries are worded "δεν καταγράφεται" — NOT RECORDED,
     * never "not covered". They report that the document does not state a value,
     * which is silence about the policy, not evidence the cover is absent.
     */
    "no-direct-billing": {
        concept: "direct-billing",
        titleEl: "Πιθανή έλλειψη απευθείας εξόφλησης νοσηλείας",
        titleEn: "Possible missing direct billing",
        mechanic: "other",
        coverageArea: "hospital",
    },
    "missing-hospital-class": {
        concept: "missing-hospital-class",
        titleEl: "Δεν καταγράφεται η θέση νοσηλείας",
        titleEn: "Hospital class not recorded",
        mechanic: "other",
        coverageArea: "hospital",
    },
    "missing-accident-declaration-phone": {
        concept: "missing-accident-declaration-phone",
        titleEl: "Δεν καταγράφεται τηλέφωνο αναγγελίας ατυχήματος",
        titleEn: "Accident declaration phone not recorded",
        mechanic: "other",
        coverageArea: "general",
    },

    /**
     * The AUTHORED CATALOGUE's own slugs — 18 of the 29 active rules had no
     * entry here, so every finding the rule engine produced for them was titled
     * with `firstSentence(aiExplanationEl, 80)`: the model's prose as a heading.
     *
     * That is not only a render-time defect. The recommendation engine
     * DENORMALISES the resolved title into `recommendation_instances.title` at
     * creation, so the prose was frozen into the database and authoring the slug
     * afterwards did not repair the row. Production carries 3 such titles — one
     * quotes a customer's vehicle model, cut at exactly 80 characters — and 18
     * more whose `el` is identical to `en` with no Greek letter in it.
     *
     * Five lines of business had NO authored gap content at all: motorbike,
     * travel, life, group_health, and four fifths of home.
     *
     * WORDING FOLLOWS THE OPERATOR, not the slug's English name. `missing` /
     * `all_missing` fire on SILENCE — the document does not state a value — so
     * they say «δεν καταγράφεται», never «δεν καλύπτεται». `is_false` needs an
     * explicit false, so it may speak of absent cover. `value_drift` compares
     * two figures the document itself states.
     */

    // ── home ─────────────────────────────────────────────────────────────────
    "no-fire-cover": {
        concept: "no-fire-cover",
        titleEl: "Πιθανή έλλειψη κάλυψης πυρκαγιάς",
        titleEn: "Possible missing fire cover",
        mechanic: "exclusion",
        coverageArea: "property",
    },
    "no-flood-cover": {
        concept: "no-flood-cover",
        titleEl: "Πιθανή έλλειψη κάλυψης πλημμύρας",
        titleEn: "Possible missing flood cover",
        mechanic: "exclusion",
        coverageArea: "property",
    },
    "no-earthquake-cover": {
        concept: "home-earthquake",
        titleEl: "Πιθανή έλλειψη κάλυψης σεισμού",
        titleEn: "Possible missing earthquake cover",
        mechanic: "exclusion",
        coverageArea: "property",
    },
    "insured-value-below-rebuild-cost": {
        concept: "insured-value-below-rebuild-cost",
        titleEl: "Το ασφαλισμένο ποσό είναι κάτω από το κόστος ανακατασκευής",
        titleEn: "Sum insured is below the rebuild cost",
        mechanic: "limit",
        coverageArea: "property",
    },

    // ── motor / motorbike ────────────────────────────────────────────────────
    "insured-value-above-declared": {
        concept: "insured-value-above-declared",
        titleEl: "Το ασφαλισμένο ποσό είναι πολύ πάνω από τη δηλωμένη αξία",
        titleEn: "Sum insured is well above the declared value",
        mechanic: "limit",
        coverageArea: "vehicle",
    },
    "moto-no-own-damage-cover": {
        concept: "own-damage",
        titleEl: "Πιθανή έλλειψη κάλυψης ιδίων ζημιών (μικτή)",
        titleEn: "Possible missing own-damage coverage",
        mechanic: "exclusion",
        coverageArea: "vehicle",
    },
    "moto-no-roadside-assistance": {
        concept: "roadside-assistance",
        titleEl: "Πιθανή έλλειψη οδικής βοήθειας",
        titleEn: "Possible missing roadside assistance",
        mechanic: "exclusion",
        coverageArea: "vehicle",
    },
    "moto-missing-accident-declaration-phone": {
        concept: "missing-accident-declaration-phone",
        titleEl: "Δεν καταγράφεται τηλέφωνο αναγγελίας ατυχήματος",
        titleEn: "Accident declaration phone not recorded",
        mechanic: "other",
        coverageArea: "vehicle",
    },
    "moto-green-card-expiring": {
        concept: "green-card-expiring",
        titleEl: "Η Πράσινη Κάρτα λήγει σύντομα",
        titleEn: "Green Card expiring soon",
        mechanic: "other",
        coverageArea: "vehicle",
    },

    // ── pet ──────────────────────────────────────────────────────────────────
    "no-direct-vet-payment": {
        concept: "no-direct-vet-payment",
        titleEl: "Πιθανή έλλειψη απευθείας εξόφλησης κτηνιάτρου",
        titleEn: "Possible missing direct payment to the vet",
        mechanic: "other",
        coverageArea: "pet",
    },
    "missing-microchip-number": {
        concept: "missing-microchip-number",
        titleEl: "Δεν καταγράφεται ο αριθμός microchip",
        titleEn: "Microchip number not recorded",
        mechanic: "other",
        coverageArea: "pet",
    },

    // ── travel ───────────────────────────────────────────────────────────────
    "no-repatriation-cover": {
        concept: "no-repatriation-cover",
        titleEl: "Πιθανή έλλειψη κάλυψης υγειονομικού επαναπατρισμού",
        titleEn: "Possible missing medical repatriation cover",
        mechanic: "exclusion",
        coverageArea: "abroad",
    },
    "no-trip-cancellation-cover": {
        concept: "no-trip-cancellation-cover",
        titleEl: "Πιθανή έλλειψη κάλυψης ακύρωσης ταξιδιού",
        titleEn: "Possible missing trip cancellation cover",
        mechanic: "exclusion",
        coverageArea: "abroad",
    },
    "missing-emergency-assistance-phone": {
        concept: "missing-emergency-assistance-phone",
        titleEl: "Δεν καταγράφεται τηλέφωνο επείγουσας βοήθειας",
        titleEn: "Emergency assistance number not recorded",
        mechanic: "other",
        coverageArea: "abroad",
    },

    // ── group health ─────────────────────────────────────────────────────────
    "group-no-direct-billing": {
        concept: "direct-billing",
        titleEl: "Πιθανή έλλειψη απευθείας εξόφλησης νοσηλείας",
        titleEn: "Possible missing direct billing",
        mechanic: "other",
        coverageArea: "hospital",
    },
    "group-missing-hospital-class": {
        concept: "missing-hospital-class",
        titleEl: "Δεν καταγράφεται η θέση νοσηλείας",
        titleEn: "Hospital class not recorded",
        mechanic: "other",
        coverageArea: "hospital",
    },
    "group-missing-coordination-centre": {
        concept: "missing-coordination-centre",
        titleEl: "Δεν καταγράφεται συντονιστικό κέντρο",
        titleEn: "Coordination centre not recorded",
        mechanic: "other",
        coverageArea: "hospital",
    },

    // ── life ─────────────────────────────────────────────────────────────────
    "no-beneficiaries-recorded": {
        concept: "no-beneficiaries-recorded",
        titleEl: "Δεν καταγράφονται δικαιούχοι",
        titleEn: "No beneficiary recorded",
        mechanic: "other",
        coverageArea: "general",
    },
}

const GENERIC_TITLES: Record<GapMechanic, { el: string; en: string }> = {
    exclusion: { el: "Πιθανή εξαίρεση κάλυψης", en: "Possible coverage exclusion" },
    limit: { el: "Πιθανός περιορισμός κάλυψης", en: "Possible coverage limit" },
    cost_sharing: { el: "Πιθανή συμμετοχή στα έξοδα", en: "Possible cost sharing" },
    other: { el: "Σημείο προσοχής στην κάλυψη", en: "Coverage point to review" },
}

function heuristicMechanic(slug: string): GapMechanic {
    if (/exclusion|excluded|not-covered/.test(slug)) return "exclusion"
    if (/copay|coinsurance|co-insurance|deductible|excess|cost-shar/.test(slug)) return "cost_sharing"
    if (/limit|cap|maximum|sub-limit|waiting/.test(slug)) return "limit"
    return "other"
}

function heuristicArea(slug: string): GapCoverageArea {
    if (/maternity|pregnan|childbirth|mental|psych/.test(slug)) return "maternity_mental"
    if (/abroad|usa|canada|international|overseas|travel/.test(slug)) return "abroad"
    if (/outpatient|diagnostic|dental|doctor|pharmac|medication/.test(slug)) return "outpatient"
    if (/hospital|inpatient|room|ward|surger|emergency|rehab/.test(slug)) return "hospital"
    if (/motor|vehicle|car|green-card/.test(slug)) return "vehicle"
    if (/home|property|earthquake|flood|fire|enfia/.test(slug)) return "property"
    if (/pet|dog|cat|leishman/.test(slug)) return "pet"
    return "general"
}

// One Sentry event per unmapped slug per process — enough signal to grow the
// map without flooding on a report with many unknown gaps.
const reportedUnknownSlugs = new Set<string>()

function reportUnknownGapSlug(slug: string) {
    if (reportedUnknownSlugs.has(slug)) return
    reportedUnknownSlugs.add(slug)
    Sentry.captureMessage("gap-report: unknown gap slug", {
        level: "warning",
        tags: { slug },
    })
}

/**
 * Outside health, the coverage area IS the branch — a motor policy has no
 * "property" gaps, whatever the slug's words suggest (`fire` on a car is a
 * vehicle cover). Health keeps the fine-grained hospital/outpatient/… areas,
 * which is where the grouping earns its keep.
 */
function areaForLineOfBusiness(lob: string | null | undefined): GapCoverageArea | null {
    const key = String(lob || "").trim().toLowerCase()
    if (/motor|vehicle|auto|car/.test(key)) return "vehicle"
    if (/home|property|contents|building/.test(key)) return "property"
    if (/pet/.test(key)) return "pet"
    if (/travel/.test(key)) return "abroad"
    return null
}

/** The dedupe key for a raw slug — mapped concept, else the normalized slug. */
export function resolveGapConcept(rawSlug: string): string {
    const slug = normalizeGapSlug(rawSlug)
    return GAP_CONTENT_MAP[slug]?.concept ?? slug
}

/**
 * Given a slug the AI emitted, find the EXISTING gap definition it should
 * attach to — the anti-mint half of the auto-created-definition fix. The
 * clarity pipeline invents vocabulary variants (`no-glass-breakage` for the
 * finding `glass_breakage` already covers), and each variant used to become a
 * new active definition that joined every future gap-detection prompt for the
 * line of business. Matching is by CONCEPT, not spelling, so snake/kebab and
 * alias variants all land on the original row.
 *
 * Preference order on multiple concept-matches: active over inactive (an
 * admin-deactivated duplicate must not win over the live twin), then earliest
 * createdAt (the original row, not a later variant).
 *
 * Returns null for a genuinely novel concept — the caller mints a definition
 * for it (inactive, so an admin activates it deliberately).
 */
export function pickCanonicalGapDefinition<
    T extends { slug: string; isActive: boolean; createdAt: Date }
>(emittedSlug: string, candidates: T[]): T | null {
    const concept = resolveGapConcept(emittedSlug)
    const matches = candidates.filter((c) => resolveGapConcept(c.slug) === concept)
    if (matches.length === 0) return null
    matches.sort((a, b) => {
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1
        return a.createdAt.getTime() - b.createdAt.getTime()
    })
    return matches[0]
}

export function resolveGapContent(
    rawSlug: string,
    context: GapContentContext = {}
): GapContent {
    const slug = normalizeGapSlug(rawSlug)
    const exact = GAP_CONTENT_MAP[slug]
    const lobArea = areaForLineOfBusiness(context.lineOfBusiness)

    if (exact) {
        return {
            ...exact,
            concept: exact.concept ?? slug,
            coverageArea: lobArea ?? exact.coverageArea,
            known: true,
        }
    }

    reportUnknownGapSlug(slug)

    const mechanic = heuristicMechanic(slug)
    const generic = GENERIC_TITLES[mechanic]

    // Unmapped vocabulary (the AI's own words, e.g. a branch the map has not
    // learned yet). This used to title the card with the model's first Greek
    // sentence, to avoid N unknown gaps rendering as N identical generic cards.
    //
    // That trade was the wrong way round, and it reached further than the card:
    // `recommendation-generator.ts` builds a recommendation's title from THIS
    // function and writes it into `recommendation_instances.title`, which the
    // dashboard's attention list renders as a heading. Production carries three
    // such rows — one quotes a customer's vehicle model, cut at exactly 80
    // characters, because that is what `firstSentence(…, 80)` does to a sentence.
    //
    // A repeated generic heading is honest; a model's prose presented as OUR
    // heading is not. The prose is still shown — as the body, where it reads as
    // a finding rather than a label. The repetition this reintroduces is the
    // signal to author the slug, and `reportUnknownGapSlug` above is how we hear
    // about it.
    const titleEl = generic.el
    const titleEn = generic.en

    return {
        concept: slug,
        titleEl,
        titleEn,
        mechanic,
        coverageArea: lobArea ?? heuristicArea(slug),
        known: false,
    }
}

interface DedupableGap {
    id: string
    aiExplanationEl?: string | null
    definition?: { slug?: string | null } | null
}

/**
 * Collapse duplicates of one finding. The key is the CONCEPT, so this catches
 * both slug-spelling variants (mental_health_exclusion / mental-health-exclusion)
 * and vocabulary aliases from different producers (the AI's `theft` vs the
 * seeded rule's `motor-theft`, `own-damage` vs `own-vehicle-damage`).
 * Winner is the instance that carries a Greek explanation; the losers' ids ride
 * along so "hide" actions cover the whole set.
 */
export function dedupeGaps<T extends DedupableGap>(
    gaps: T[]
): Array<T & { normalizedSlug: string; concept: string; duplicateIds: string[] }> {
    const byConcept = new Map<
        string,
        T & { normalizedSlug: string; concept: string; duplicateIds: string[] }
    >()
    for (const gap of gaps) {
        const normalizedSlug = normalizeGapSlug(gap.definition?.slug || gap.id)
        const concept = resolveGapConcept(normalizedSlug)
        const existing = byConcept.get(concept)
        if (!existing) {
            byConcept.set(concept, { ...gap, normalizedSlug, concept, duplicateIds: [] })
            continue
        }
        if (!existing.aiExplanationEl && gap.aiExplanationEl) {
            // The newcomer has the Greek explanation — it becomes the winner.
            byConcept.set(concept, {
                ...gap,
                normalizedSlug,
                concept,
                duplicateIds: [existing.id, ...existing.duplicateIds],
            })
        } else {
            existing.duplicateIds.push(gap.id)
        }
    }
    return Array.from(byConcept.values())
}

export const COVERAGE_AREA_ORDER: GapCoverageArea[] = [
    "hospital",
    "outpatient",
    "maternity_mental",
    "abroad",
    "vehicle",
    "property",
    "pet",
    "general",
]

export function groupGapsByCoverageArea(
    items: GapReportItem[]
): Array<{ area: GapCoverageArea; items: GapReportItem[] }> {
    const groups = new Map<GapCoverageArea, GapReportItem[]>()
    for (const item of items) {
        const list = groups.get(item.content.coverageArea) || []
        list.push(item)
        groups.set(item.content.coverageArea, list)
    }
    return COVERAGE_AREA_ORDER.filter((area) => groups.has(area)).map((area) => ({
        area,
        items: (groups.get(area) || []).sort((a, b) => {
            if (a.content.known !== b.content.known) return a.content.known ? -1 : 1
            return a.content.titleEl.localeCompare(b.content.titleEl, "el")
        }),
    }))
}

export function summarizeGaps(items: GapReportItem[]): {
    total: number
    /** B3 / R3: how many of `total` are still under provenance review — the band names them. */
    underReview: number
    byMechanic: Partial<Record<GapMechanic, number>>
    byArea: Partial<Record<GapCoverageArea, number>>
} {
    const byMechanic: Partial<Record<GapMechanic, number>> = {}
    const byArea: Partial<Record<GapCoverageArea, number>> = {}
    for (const item of items) {
        byMechanic[item.content.mechanic] = (byMechanic[item.content.mechanic] || 0) + 1
        byArea[item.content.coverageArea] = (byArea[item.content.coverageArea] || 0) + 1
    }
    const underReview = items.filter((item) => provenanceOf(item.slug) === "under_review").length
    return { total: items.length, underReview, byMechanic, byArea }
}

export function firstSentence(text: string | null | undefined, maxLen = 140): string {
    const trimmed = String(text || "").trim()
    if (!trimmed) return ""
    const match = trimmed.match(/^.*?[.;!?](?=\s|$)/)
    const sentence = (match ? match[0] : trimmed).trim()
    if (sentence.length <= maxLen) return sentence
    // Cut at a WORD boundary, not at the character index.
    //
    // This output is used as a gap card's HEADING (resolveGapContent, for slugs
    // the authored catalogue does not know — production holds 41 AI-minted
    // definitions whose instances still render). A raw slice ended headings
    // mid-word — «…δεν καλύπτ…» — which reads as a rendering fault rather than
    // as a truncation, on the one surface where the reader is deciding whether
    // to trust the finding.
    const hard = sentence.slice(0, maxLen - 1)
    const lastBreak = hard.search(/\s\S*$/)
    // Only honour the break if it keeps a usable amount of the sentence;
    // otherwise a single very long word would truncate to almost nothing.
    const cut = lastBreak > maxLen * 0.6 ? hard.slice(0, lastBreak) : hard
    return `${cut.trimEnd().replace(/[.,;:·\-–—]$/, "")}…`
}

/**
 * Owner on free tier sees the first gaps only until they unlock this policy's
 * report (€3 one-off) or upgrade. Non-owner viewers (agents) keep the full
 * view — agent-facing behavior is unchanged.
 */
export function computeReportUnlocked(input: {
    isOwner: boolean
    tier: "free" | "plus" | "pro"
    reportUnlockedAt: string | Date | null | undefined
}): boolean {
    if (!input.isOwner) return true
    if (input.tier !== "free") return true
    return input.reportUnlockedAt != null
}

/** Gaps shown fully to a locked free-tier owner before the unlock boundary. */
export const FREE_GAP_PREVIEW_COUNT = 3
