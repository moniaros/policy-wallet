import * as Sentry from "@sentry/nextjs"

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
    titleEl: string
    titleEn: string
    mechanic: GapMechanic
    coverageArea: GapCoverageArea
    /** false ⇒ resolved via heuristics/generic fallback (unmapped slug) */
    known: boolean
}

export interface GapReportItem {
    id: string
    slug: string
    /** GapInstance ids of DB-level duplicates collapsed into this item */
    duplicateIds: string[]
    content: GapContent
    aiExplanation: string | null
    aiExplanationEl: string | null
    aiSuggestion: string | null
    aiSuggestionEl: string | null
}

export function normalizeGapSlug(raw: string): string {
    return String(raw || "")
        .trim()
        .toLowerCase()
        .replace(/[\s_]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
}

// Every slug observed in prod (dumped 2026-07-13) + the seeded definitions +
// likely health-vocabulary variants. Titles are hedged (πιθανή/περιορισμός) —
// the engine's detections are observational, not underwriter-validated.
export const GAP_CONTENT_MAP: Record<string, Omit<GapContent, "known">> = {
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
        titleEl: "Εξαίρεση κύησης και τοκετού",
        titleEn: "Pregnancy and childbirth exclusion",
        mechanic: "exclusion",
        coverageArea: "maternity_mental",
    },
    "low-outpatient-limit": {
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
    // ── Seeded GapDefinitions (prisma/seed.ts) ──────────────────────────
    "motor-theft": {
        titleEl: "Πιθανή έλλειψη κάλυψης κλοπής",
        titleEn: "Possible missing theft coverage",
        mechanic: "exclusion",
        coverageArea: "vehicle",
    },
    "motor-legal": {
        titleEl: "Πιθανή έλλειψη νομικής προστασίας",
        titleEn: "Possible missing legal protection",
        mechanic: "exclusion",
        coverageArea: "vehicle",
    },
    "health-outpatient": {
        titleEl: "Περιορισμένη εξωνοσοκομειακή κάλυψη",
        titleEn: "Limited outpatient coverage",
        mechanic: "limit",
        coverageArea: "outpatient",
    },
    "home-earthquake": {
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

export function resolveGapContent(rawSlug: string): GapContent {
    const slug = normalizeGapSlug(rawSlug)
    const exact = GAP_CONTENT_MAP[slug]
    if (exact) return { ...exact, known: true }

    reportUnknownGapSlug(slug)

    const mechanic = heuristicMechanic(slug)
    const coverageArea = heuristicArea(slug)
    const title = GENERIC_TITLES[mechanic]
    return { titleEl: title.el, titleEn: title.en, mechanic, coverageArea, known: false }
}

interface DedupableGap {
    id: string
    aiExplanationEl?: string | null
    definition?: { slug?: string | null } | null
}

/**
 * Collapse DB-level duplicates (same concept persisted under slug-spelling
 * variants). Winner is the instance that carries a Greek explanation; the
 * losers' ids ride along so "hide" actions cover the whole set.
 */
export function dedupeGaps<T extends DedupableGap>(
    gaps: T[]
): Array<T & { normalizedSlug: string; duplicateIds: string[] }> {
    const byslug = new Map<string, T & { normalizedSlug: string; duplicateIds: string[] }>()
    for (const gap of gaps) {
        const normalizedSlug = normalizeGapSlug(gap.definition?.slug || gap.id)
        const existing = byslug.get(normalizedSlug)
        if (!existing) {
            byslug.set(normalizedSlug, { ...gap, normalizedSlug, duplicateIds: [] })
            continue
        }
        if (!existing.aiExplanationEl && gap.aiExplanationEl) {
            // The newcomer has the Greek explanation — it becomes the winner.
            byslug.set(normalizedSlug, {
                ...gap,
                normalizedSlug,
                duplicateIds: [existing.id, ...existing.duplicateIds],
            })
        } else {
            existing.duplicateIds.push(gap.id)
        }
    }
    return Array.from(byslug.values())
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
    byMechanic: Partial<Record<GapMechanic, number>>
    byArea: Partial<Record<GapCoverageArea, number>>
} {
    const byMechanic: Partial<Record<GapMechanic, number>> = {}
    const byArea: Partial<Record<GapCoverageArea, number>> = {}
    for (const item of items) {
        byMechanic[item.content.mechanic] = (byMechanic[item.content.mechanic] || 0) + 1
        byArea[item.content.coverageArea] = (byArea[item.content.coverageArea] || 0) + 1
    }
    return { total: items.length, byMechanic, byArea }
}

export function firstSentence(text: string | null | undefined, maxLen = 140): string {
    const trimmed = String(text || "").trim()
    if (!trimmed) return ""
    const match = trimmed.match(/^.*?[.;!?](?=\s|$)/)
    const sentence = (match ? match[0] : trimmed).trim()
    if (sentence.length <= maxLen) return sentence
    return `${sentence.slice(0, maxLen - 1).trimEnd()}…`
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
