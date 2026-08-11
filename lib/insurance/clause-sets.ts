/**
 * Named market clause sets, and what citing one actually does to the cover.
 *
 * Greek specialty schedules do not spell out their perils. They name a London
 * market clause set — "INSTITUTE CARGO CLAUSES (C) 1.1.09" — and the entire
 * scope of cover follows from that one line. Two schedules can be identical in
 * every visible field and differ by a single letter that decides whether theft
 * is covered.
 *
 * This module turns those codes into something the gap engine can reason over.
 * It is DELIBERATELY a small, closed reference table rather than something the
 * model is asked to recall: clause wordings are stable, published documents, and
 * a hallucinated peril list is worse than no peril list at all. Anything not in
 * the table returns null and the product says so.
 *
 * SCOPE NOTE: this describes the standard clause set as published. A schedule
 * can and often does amend it — the yacht policy in the corpus applies Institute
 * Yacht Clauses and then adds a machinery-damage extension and deletes terrorism.
 * `interpretClauseSet` therefore answers "what does this set do by default",
 * never "what is this specific policy's final cover".
 */

import type { AcordDataInput } from '@/lib/schemas/acord-data'

export type ClauseFamily =
    | 'institute_cargo'
    | 'institute_yacht'
    | 'institute_hulls'
    | 'institute_war_strikes'
    | 'lma'
    | 'greek_statutory'
    | 'other'

/** Perils named in a way that is comparable across sets. */
export type Peril =
    | 'fire_explosion'
    | 'stranding_sinking'
    | 'overturning_derailment'
    | 'collision'
    | 'general_average'
    | 'jettison'
    | 'washing_overboard'
    | 'water_ingress'
    | 'total_loss_during_handling'
    | 'theft'
    | 'non_delivery'
    | 'malicious_damage'
    | 'handling_damage'
    | 'all_other_fortuity'
    | 'war'
    | 'strikes_riots'
    | 'terrorism'
    | 'machinery_damage'
    | 'pollution'
    | 'third_party_liability'
    | 'cyber'

export interface ClauseSetDefinition {
    /** Canonical id used in reasoning and copy. */
    id: string
    family: ClauseFamily
    label: { el: string; en: string }
    /** Substrings that identify this set in a schedule, all lowercase. */
    match: string[]
    /** Perils the published set covers. */
    covers: Peril[]
    /** Perils the published set expressly does NOT cover. */
    excludes: Peril[]
    /**
     * How wide the set is relative to its siblings, 0–1. Used to say "this is
     * the narrowest of the three" without inventing a score.
     */
    breadth?: number
    /** What a reader most needs to know, stated as fact rather than advice. */
    note: { el: string; en: string }
}

export const CLAUSE_SETS: ClauseSetDefinition[] = [
    // ── Institute Cargo Clauses ──────────────────────────────────────
    {
        id: 'icc_a',
        family: 'institute_cargo',
        label: { el: 'Ρήτρες Φορτίου (A)', en: 'Institute Cargo Clauses (A)' },
        match: ['institute cargo clauses (a)', 'icc (a)', 'icc a', 'ρήτρες (a) ινστιτούτου'],
        covers: [
            'fire_explosion', 'stranding_sinking', 'overturning_derailment', 'collision',
            'general_average', 'jettison', 'washing_overboard', 'water_ingress',
            'total_loss_during_handling', 'theft', 'non_delivery', 'malicious_damage',
            'handling_damage', 'all_other_fortuity',
        ],
        excludes: ['war', 'strikes_riots'],
        breadth: 1,
        note: {
            el: 'Το ευρύτερο σετ ρητρών φορτίου: καλύπτει κάθε τυχαίο περιστατικό εκτός των ρητά εξαιρούμενων. Πόλεμος και απεργίες προστίθενται με χωριστές ρήτρες.',
            en: 'The widest cargo set: covers all fortuity except what is expressly excluded. War and strikes are added by separate clauses.',
        },
    },
    {
        id: 'icc_b',
        family: 'institute_cargo',
        label: { el: 'Ρήτρες Φορτίου (B)', en: 'Institute Cargo Clauses (B)' },
        match: ['institute cargo clauses (b)', 'icc (b)', 'icc b', 'ρήτρες (b) ινστιτούτου'],
        covers: [
            'fire_explosion', 'stranding_sinking', 'overturning_derailment', 'collision',
            'general_average', 'jettison', 'washing_overboard', 'water_ingress',
            'total_loss_during_handling',
        ],
        excludes: ['theft', 'non_delivery', 'malicious_damage', 'handling_damage', 'all_other_fortuity', 'war', 'strikes_riots'],
        breadth: 0.6,
        note: {
            el: 'Ενδιάμεσο σετ: προσθέτει στο (C) κινδύνους νερού και έκπλυσης, αλλά η κλοπή, η μη παράδοση και η κακόβουλη βλάβη παραμένουν εκτός.',
            en: 'The middle set: adds water and washing-overboard perils to (C), but theft, non-delivery and malicious damage stay outside.',
        },
    },
    {
        id: 'icc_c',
        family: 'institute_cargo',
        label: { el: 'Ρήτρες Φορτίου (C)', en: 'Institute Cargo Clauses (C)' },
        match: ['institute cargo clauses (c)', 'icc (c)', 'icc c', 'ρήτρες (c) ινστιτούτου'],
        covers: [
            'fire_explosion', 'stranding_sinking', 'overturning_derailment', 'collision',
            'general_average', 'jettison',
        ],
        excludes: [
            'theft', 'non_delivery', 'malicious_damage', 'handling_damage',
            'water_ingress', 'washing_overboard', 'all_other_fortuity', 'war', 'strikes_riots',
        ],
        breadth: 0.25,
        note: {
            el: 'Το στενότερο σετ ρητρών φορτίου: καλύπτει ονομαστικά μεγάλα συμβάντα του μέσου μεταφοράς. Η κλοπή, η μη παράδοση, η ζημιά από νερό και η ζημιά κατά τη φορτοεκφόρτωση δεν περιλαμβάνονται.',
            en: 'The narrowest cargo set: covers a named list of major casualties to the conveyance. Theft, non-delivery, water damage and handling damage are not included.',
        },
    },
    {
        id: 'institute_strikes_cargo',
        family: 'institute_war_strikes',
        label: { el: 'Ρήτρες Απεργιών (Φορτίου)', en: 'Institute Strikes Clauses (Cargo)' },
        match: ['institute strikes clauses', 'ρήτρες απεργιών'],
        covers: ['strikes_riots'],
        excludes: ['terrorism'],
        note: {
            el: 'Προσθέτει κινδύνους απεργιών και πολιτικών ταραχών. Η τρομοκρατία αντιμετωπίζεται χωριστά και συχνά εξαιρείται.',
            en: 'Adds strikes and civil-commotion perils. Terrorism is handled separately and is often excluded.',
        },
    },

    // ── Institute Yacht / Hull ───────────────────────────────────────
    {
        id: 'institute_yacht_clauses',
        family: 'institute_yacht',
        label: { el: 'Ρήτρες Σκαφών Αναψυχής', en: 'Institute Yacht Clauses' },
        match: ['institute yacht clauses'],
        covers: ['fire_explosion', 'stranding_sinking', 'collision', 'theft', 'malicious_damage', 'third_party_liability'],
        excludes: ['machinery_damage', 'war', 'strikes_riots'],
        note: {
            el: 'Βασικό σετ για σκάφη αναψυχής. Οι μηχανικές βλάβες δεν περιλαμβάνονται στο βασικό κείμενο και προστίθενται με χωριστή επέκταση, η οποία συνήθως συνοδεύεται από όρο τακτικής συντήρησης.',
            en: 'The base set for pleasure craft. Machinery damage is not in the base wording and is added by a separate extension, which normally carries a servicing condition.',
        },
    },
    {
        id: 'institute_yacht_machinery_extension',
        family: 'institute_yacht',
        label: { el: 'Επέκταση Μηχανικών Βλαβών', en: 'Yacht Machinery Damage Extension' },
        match: ['machinery damage extension', 'cl. 332', 'cl 332'],
        covers: ['machinery_damage'],
        excludes: [],
        note: {
            el: 'Προσθέτει την κάλυψη μηχανικών βλαβών. Συνήθως τελεί υπό απαράβατο όρο συντήρησης σύμφωνα με τις οδηγίες του κατασκευαστή.',
            en: 'Adds machinery-damage cover. Usually subject to a warranty to service in line with the manufacturer’s instructions.',
        },
    },
    {
        id: 'itc_hulls_port_risks',
        family: 'institute_hulls',
        label: { el: 'Ρήτρες Πλοίων — Κίνδυνοι Λιμένος', en: 'Institute Time Clauses Hulls — Port Risks' },
        match: ['port risks', 'cl. 311', 'cl 311'],
        covers: ['fire_explosion', 'stranding_sinking', 'collision', 'third_party_liability'],
        excludes: ['war', 'strikes_riots'],
        note: {
            el: 'Κάλυψη για μονάδα που παραμένει εντός λιμένα. Οι περίοδοι επισκευής και μετακίνησης συχνά εξαιρούνται ρητά από το ίδιο το ασφαλιστήριο.',
            en: 'Cover for a unit that stays within port. Repair and movement periods are often expressly excluded by the policy itself.',
        },
    },

    // ── LMA / market exclusions ──────────────────────────────────────
    {
        id: 'lma5403_marine_cyber',
        family: 'lma',
        label: { el: 'Ρήτρα Κυβερνοκινδύνων (Ναυτιλία)', en: 'Marine Cyber Endorsement' },
        match: ['lma5403', 'marine cyber endorsement'],
        covers: [],
        excludes: ['cyber'],
        note: {
            el: 'Αποκλείει απώλεια ή ζημιά που προκύπτει από χρήση ηλεκτρονικών συστημάτων ως μέσο πρόκλησης βλάβης.',
            en: 'Excludes loss or damage arising from the use of a computer system as a means of inflicting harm.',
        },
    },
    {
        id: 'lma5583a_territorial',
        family: 'lma',
        label: { el: 'Εδαφική Εξαίρεση (Λευκορωσία, Ρωσία, Ουκρανία)', en: 'Territorial Exclusion (Belarus, Russia, Ukraine)' },
        match: ['lma5583a', 'lma5583'],
        covers: [],
        excludes: [],
        note: {
            el: 'Αποκλείει την κάλυψη για δραστηριότητα εντός Λευκορωσίας, Ρωσίας και Ουκρανίας.',
            en: 'Removes cover for activity within Belarus, Russia and Ukraine.',
        },
    },
    {
        id: 'sanction_limitation',
        family: 'other',
        label: { el: 'Ρήτρα Κυρώσεων', en: 'Sanction Limitation and Exclusion Clause' },
        match: ['sanction limitation', 'ρήτρα εξαίρεσης κάλυψης λόγω κυρώσεων'],
        covers: [],
        excludes: [],
        note: {
            el: 'Ο ασφαλιστής δεν παρέχει κάλυψη όπου αυτή θα τον εξέθετε σε κυρώσεις. Στην πράξη περιορίζει γεωγραφικά την κάλυψη ανεξάρτητα από τα υπόλοιπα όρια.',
            en: 'The insurer provides no cover where doing so would expose it to sanctions. In practice this narrows cover geographically regardless of the stated limits.',
        },
    },
    {
        id: 'institute_radioactive_exclusion',
        family: 'other',
        label: { el: 'Εξαίρεση Ραδιενεργού Μόλυνσης', en: 'Radioactive Contamination Exclusion' },
        match: ['radioactive contamination', 'cl. 370', 'cl 370'],
        covers: [],
        excludes: [],
        note: {
            el: 'Τυποποιημένη εξαίρεση πυρηνικών, χημικών, βιολογικών και ηλεκτρομαγνητικών όπλων.',
            en: 'Standard exclusion of nuclear, chemical, biological and electromagnetic weapons.',
        },
    },

    // ── Greek statutory ──────────────────────────────────────────────
    {
        id: 'greek_recreational_craft_tpl',
        family: 'greek_statutory',
        label: { el: 'Υποχρεωτική Αστική Ευθύνη Σκαφών Αναψυχής', en: 'Compulsory Recreational Craft Liability' },
        match: ['4926/2022', 'ν.4926', 'γ.κ.λ. αριθμ. 20', 'γκλ 20'],
        covers: ['third_party_liability', 'pollution'],
        excludes: [],
        note: {
            el: 'Υποχρεωτική κάλυψη κατά τον νόμο για σκάφη αναψυχής, με χωριστά όρια ανά πρόσωπο, ανά συμβάν και συνολικά, καθώς και ξεχωριστό όριο θαλάσσιας ρύπανσης.',
            en: 'Cover made compulsory by statute for recreational craft, with separate per-person, per-event and aggregate limits, plus a distinct marine-pollution limit.',
        },
    },
]

const NORMALISE = (value: string) => value.toLowerCase().replace(/\s+/g, ' ').trim()

/**
 * Identify a clause set from the code as printed on a schedule.
 *
 * Returns null rather than guessing. An unrecognised code is a normal outcome —
 * insurers write bespoke clauses constantly — and reporting "we do not know this
 * clause" is the honest answer.
 */
export function interpretClauseSet(code: string | null | undefined): ClauseSetDefinition | null {
    if (!code) return null
    const needle = NORMALISE(code)
    // Longest match wins so "institute cargo clauses (c)" is not captured by a
    // shorter, broader entry that happens to appear first.
    let best: ClauseSetDefinition | null = null
    let bestLength = 0
    for (const set of CLAUSE_SETS) {
        for (const token of set.match) {
            if (needle.includes(token) && token.length > bestLength) {
                best = set
                bestLength = token.length
            }
        }
    }
    return best
}

export interface ClauseCoverageView {
    /** Recognised sets, in the order they were cited. */
    recognised: ClauseSetDefinition[]
    /** Codes present on the policy that this table does not know. */
    unrecognised: string[]
    /** Union of perils granted by the recognised sets. */
    covered: Peril[]
    /**
     * Perils a recognised set expressly excludes and no other recognised set
     * grants. A peril excluded by one clause and granted by another is NOT
     * listed here — that is exactly what a strikes clause added on top of ICC (C)
     * is for.
     */
    notCovered: Peril[]
    /** The narrowest cargo set cited, when one was. */
    narrowestCargoSet: ClauseSetDefinition | null
}

/**
 * Build the combined view across every clause a policy cites.
 *
 * The composition rule matters: clause sets stack, and a later grant beats an
 * earlier exclusion. Treating each clause in isolation would report a cargo
 * policy with an added strikes clause as not covering strikes.
 */
export function summariseClauseCoverage(
    // Input shape rather than parsed: this is useful on raw extraction output
    // too, and the only field it reads is `code`.
    namedClauses: NonNullable<AcordDataInput['namedClauses']> | undefined | null
): ClauseCoverageView {
    const recognised: ClauseSetDefinition[] = []
    const unrecognised: string[] = []

    for (const clause of namedClauses ?? []) {
        const match = interpretClauseSet(clause.code)
        if (match) {
            if (!recognised.some((r) => r.id === match.id)) recognised.push(match)
        } else if (clause.code) {
            unrecognised.push(clause.code)
        }
    }

    const covered = new Set<Peril>()
    for (const set of recognised) for (const peril of set.covers) covered.add(peril)

    const notCovered = new Set<Peril>()
    for (const set of recognised) {
        for (const peril of set.excludes) {
            if (!covered.has(peril)) notCovered.add(peril)
        }
    }

    const cargoSets = recognised.filter((s) => s.family === 'institute_cargo')
    const narrowestCargoSet = cargoSets.length
        ? cargoSets.reduce((narrowest, set) =>
            (set.breadth ?? 1) < (narrowest.breadth ?? 1) ? set : narrowest)
        : null

    return {
        recognised,
        unrecognised,
        covered: [...covered],
        notCovered: [...notCovered],
        narrowestCargoSet,
    }
}

/** Human-readable peril labels, so nothing renders a raw enum id to a reader. */
export const PERIL_LABELS: Record<Peril, { el: string; en: string }> = {
    fire_explosion: { el: 'Πυρκαγιά ή έκρηξη', en: 'Fire or explosion' },
    stranding_sinking: { el: 'Προσάραξη ή βύθιση', en: 'Stranding or sinking' },
    overturning_derailment: { el: 'Ανατροπή ή εκτροχιασμός', en: 'Overturning or derailment' },
    collision: { el: 'Σύγκρουση ή πρόσκρουση', en: 'Collision or impact' },
    general_average: { el: 'Γενική αβαρία', en: 'General average' },
    jettison: { el: 'Ρίψη φορτίου στη θάλασσα', en: 'Jettison' },
    washing_overboard: { el: 'Έκπλυση από το κατάστρωμα', en: 'Washing overboard' },
    water_ingress: { el: 'Εισροή νερού', en: 'Water ingress' },
    total_loss_during_handling: { el: 'Ολική απώλεια δέματος κατά τη φορτοεκφόρτωση', en: 'Total loss of a package during handling' },
    theft: { el: 'Κλοπή', en: 'Theft' },
    non_delivery: { el: 'Μη παράδοση', en: 'Non-delivery' },
    malicious_damage: { el: 'Κακόβουλη βλάβη', en: 'Malicious damage' },
    handling_damage: { el: 'Ζημιά κατά τον χειρισμό', en: 'Handling damage' },
    all_other_fortuity: { el: 'Κάθε άλλο τυχαίο περιστατικό', en: 'All other fortuity' },
    war: { el: 'Πόλεμος', en: 'War' },
    strikes_riots: { el: 'Απεργίες και ταραχές', en: 'Strikes and riots' },
    terrorism: { el: 'Τρομοκρατία', en: 'Terrorism' },
    machinery_damage: { el: 'Μηχανικές βλάβες', en: 'Machinery damage' },
    pollution: { el: 'Θαλάσσια ρύπανση', en: 'Marine pollution' },
    third_party_liability: { el: 'Αστική ευθύνη προς τρίτους', en: 'Third-party liability' },
    cyber: { el: 'Κυβερνοκίνδυνοι', en: 'Cyber' },
}

export function perilLabel(peril: Peril, language: 'el' | 'en'): string {
    return PERIL_LABELS[peril][language]
}
