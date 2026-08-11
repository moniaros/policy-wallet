import { branchFamilyId, normalizeBranch } from '@/lib/insurance/taxonomy'

import { formatLobPack, type LobPack } from './types'

export { formatLobPack } from './types'
export type { LobPack } from './types'

/**
 * The pack registry.
 *
 * Packs are grouped by how a policy is READ, not by how it is sold: marine hull,
 * cargo and crew share almost no vocabulary and get three packs, while cash,
 * fidelity and fine art share one because they are all schedules of things or
 * people with sub-limits and security conditions attached.
 */

const MARINE_HULL_PACK: LobPack = {
    id: 'marine_hull',
    // 1.1.0 — the hull cover was being emitted with a deductible ladder but no
    // limit, because the sum insured reads as a property of the vessel rather
    // than of a coverage. Adequacy needs it on the coverage.
    version: '1.1.0',
    branchIds: ['boat', 'boat_hull', 'marine_hull'],
    terminology: [
        'ΚΛΑΔΟΣ ΠΛΟΙΩΝ', 'MARINE HULL', 'ΣΚΑΦΟΣ ΚΑΙ ΜΗΧΑΝΕΣ', 'HULL AND MACHINERY',
        'Institute Yacht Clauses', 'Institute Time Clauses Hulls', 'ΑΠΑΡΑΒΑΤΟΙ ΟΡΟΙ',
    ],
    extractionHints: [
        'The vessel block (ΠΛΟΙΟ/VESSEL, ΑΡ.ΝΗΟΛ./REG.NO., flag, year, length, engines) maps to acordData.marineVessel.',
        'ΑΝΤΙΚΕΙΜΕΝΟ ΑΣΦΑΛΙΣΗΣ / SUBJECT-MATTER INSURED lists the hull value AND separately valued tenders, outboards and equipment — put each separately valued item in acordData.insuredItems with its own agreedValue.',
        'ALWAYS emit a coverage for the hull itself, and give it a limit: ΑΣΦΑΛΙΖΟΜΕΝΟ ΚΕΦΑΛΑΙΟ / INSURED HEREUNDER is that coverage\'s per_event limit. Record it in coverages[].limits as well as in marineVessel.hullValue — the value on the vessel describes the object, the limit on the coverage is what the policy pays, and only the second can be judged against an exposure.',
        'Do the same for any liability section on the same schedule: emit it as its own coverage with its own limits, rather than folding it into the hull cover.',
        'ΑΠΑΛΛΑΓΕΣ is a LADDER, not one number: each line names a damage type and its own amount. Emit one entry in coverages[].deductibles per line, with appliesTo carrying the damage type.',
        'If the schedule states how overlapping deductibles resolve ("εφαρμόζεται η μεγαλύτερη μεμονωμένη απαλλαγή"), set acordData.deductibleResolution accordingly.',
        'ΑΠΑΡΑΒΑΤΟΙ ΟΡΟΙ (WARRANTIES) and ΠΡΟΫΠΟΘΕΣΕΙΣ ΚΑΛΥΨΗΣ each become an entry in acordData.conditions. Servicing and certificate requirements are kind="maintenance" or "documentation" with recurrence set; berthing and skipper requirements are kind="condition_precedent".',
        'Every cited clause code (Institute Yacht Clauses, CL. 332, CL. 311, LMA5403, sanction clauses) belongs in acordData.namedClauses with its code exactly as printed.',
        'Navigation limits and lay-up terms go to acordData.marineVessel.layUpPeriod / territorialScope.navigationLimits.',
    ],
    evidenceRules: [
        'Do NOT infer the perils covered from the clause code. Record the code; the peril list is resolved from a reference table outside this extraction.',
        'A hull value and a liability limit are different amounts on the same schedule. Never copy one into the other.',
        'Where a warranty states a consequence ("no claim shall be allowed"), set breachEffect to voids_cover. Where it does not, leave breachEffect unknown — do not assume severity.',
    ],
    negativeExamples: [
        'ΑΣΦΑΛΙΖΟΜΕΝΟ ΚΕΦΑΛΑΙΟ (sum insured) is not ΑΣΦΑΛΙΣΤΡΑ (premium).',
        'A commercial floating unit or working craft is marine_hull; a private pleasure yacht is boat_hull.',
    ],
}

const MARINE_CARGO_PACK: LobPack = {
    id: 'marine_cargo',
    version: '1.0.0',
    branchIds: ['marine_cargo', 'transports'],
    terminology: [
        'ΚΛΑΔΟΣ ΜΕΤΑΦΟΡΩΝ', 'MARINE CARGO', 'ΤΑΞΙΔΙ', 'ΑΣΦΑΛΙΣΜΕΝΑ ΑΝΤΙΚΕΙΜΕΝΑ',
        'Institute Cargo Clauses', 'ΒΑΣΗ ΑΠΟΤΙΜΗΣΗΣ', 'ΣΥΣΚΕΥΑΣΙΑ/ΣΤΟΙΒΑΣΙΑ',
    ],
    extractionHints: [
        'ΤΑΞΙΔΙ (origin and destination), ΤΡΟΠΟΣ ΜΕΤΑΦΟΡΑΣ (mode) and the named conveyance map to acordData.transit.',
        'A cargo policy usually covers ONE shipment, not a year. Set acordData.termBasis to single_transit or voyage when the period matches a journey rather than an annual term.',
        'ΑΣΦΑΛΙΣΜΕΝΟΙ ΚΙΝΔΥΝΟΙ is a list of clause codes, not a list of perils. Put every line in acordData.namedClauses verbatim.',
        'ΒΑΣΗ ΑΠΟΤΙΜΗΣΗΣ (basis of valuation) goes to acordData.transit.valuationBasis.',
        'ΠΡΟΫΠΟΘΕΣΕΙΣ ΚΑΛΥΨΗΣ about packing, stowage and lashing become acordData.conditions with kind="condition_precedent".',
        'Territorial and sanctions exclusions, including named-country lists, go to acordData.territorialScope.excludes with sanctionsClause set.',
    ],
    evidenceRules: [
        'Record the cargo clause letter exactly — (A), (B) or (C). It is the single most consequential value on the document and it is never inferable from anything else on the page.',
        'Do NOT state which perils are covered. Record the clause code and let the reference table resolve it.',
        'Where the deductible is stated as ΜΗΔΕΝΙΚΗ, that is a real value of 0, not a missing one.',
    ],
    negativeExamples: [
        'Cargo insurance covers the OWNER’s goods regardless of fault; carrier’s liability covers what a haulier owes. A schedule naming Institute Cargo Clauses is cargo, even when the carrier arranged it.',
        'A road transit under marine clauses is still marine_cargo — the word "marine" describes the clause set, not the mode.',
    ],
}

const MARINE_CREW_PACK: LobPack = {
    id: 'marine_crew',
    version: '1.0.0',
    branchIds: ['marine_crew', 'employer_liability'],
    terminology: [
        'ΚΛΑΔΟΣ ΠΛΗΡΩΜΑΤΩΝ', 'ΠΛΗΡΩΜΑΤΑ ΠΛΟΙΩΝ', 'ΟΡΙΑ ΚΑΛΥΨΕΩΝ', 'ΣΤΟΙΧΕΙΑ ΠΛΗΡΩΜΑΤΟΣ',
        'εργατικό ατύχημα', 'ναυτολογημένο πλήρωμα',
    ],
    extractionHints: [
        'ΣΤΟΙΧΕΙΑ ΠΛΗΡΩΜΑΤΟΣ lists ranks and how many hold each. Emit acordData.insuredPersons entries carrying role and count.',
        'ΟΡΙΑ ΚΑΛΥΨΕΩΝ is a benefit table per crew class. Each row becomes a benefit under the matching insuredPersons entry, with its currency.',
        'The overall cap for a group accident is a per_event limit on the policy, distinct from any individual benefit.',
        'Crew periods are short and stated with times as well as dates. Set acordData.termBasis to short_period or voyage.',
        'The currency is frequently USD. Record it on policy.currency and on every benefit amount.',
    ],
    evidenceRules: [
        'NEVER extract the names of crew members, even where the schedule lists them. Record rank and count only.',
        'The rule that individual benefits may not exceed the accidental-death capital is a condition — record it in acordData.conditions rather than adjusting any amount yourself.',
    ],
    negativeExamples: [
        'The benefit table is not a sum insured. Do not add the rows together.',
    ],
}

const CRIME_AND_VALUABLES_PACK: LobPack = {
    id: 'crime_and_valuables',
    version: '1.0.0',
    branchIds: ['money', 'fidelity', 'fine_art'],
    terminology: [
        'ΚΛΑΔΟΣ ΚΛΟΠΗΣ & ΕΜΠΙΣΤΟΣΥΝΗΣ', 'ΠΕΡΙΓΡΑΦΗ ΑΣΦΑΛΙΖΟΜΕΝΟΥ ΚΙΝΔΥΝΟΥ',
        'ΑΝΩΤΑΤΟ ΟΡΙΟ ΑΣΦΑΛΙΣΤΙΚΗΣ ΚΑΛΥΨΗΣ', 'ΑΦΑΙΡΕΤΕΑ ΑΠΑΛΛΑΓΗ',
        'ΕΙΔΙΚΕΣ ΕΞΑΙΡΕΣΕΙΣ ΚΑΙ ΠΡΟΫΠΟΘΕΣΕΙΣ ΚΑΛΥΨΗΣ', 'χρηματοκιβώτιο', 'χρηματαποστολή',
        'υπεξαίρεση', 'έργα τέχνης',
    ],
    extractionHints: [
        'Limits in this family NEST: per event, per safe or till, per risk address, and an overall period aggregate. Emit one coverages[].limits entry per level and put the qualifier ("ανά χρηματοκιβώτιο", "ανά υπάλληλο") in appliesTo.',
        'ΕΙΔΙΚΕΣ ΕΞΑΙΡΕΣΕΙΣ ΚΑΙ ΠΡΟΫΠΟΘΕΣΕΙΣ ΚΑΛΥΨΗΣ mixes exclusions and conditions. Security measures — alarm linked to a monitoring centre, safety locks, cameras, keys held off-premises, internal audit — are acordData.conditions with kind="security_requirement".',
        'A requirement that another policy be in force for the same address is a condition with dependsOnOtherPolicy set.',
        'Fine art: the ΚΑΤΑΣΤΑΣΗ ΑΣΦΑΛΙΖΟΜΕΝΩΝ ΕΡΓΩΝ maps item by item to acordData.insuredItems with agreedValue.',
        'Where a cover is listed under ΠΡΟΑΙΡΕΤΙΚΕΣ ΚΑΛΥΨΕΙΣ, set coverages[].status to optional_taken or optional_not_taken according to what the schedule shows.',
        'Fidelity discovery deadlines (months after departure, months after expiry) are notableConditions with conditionType="discovery_period".',
    ],
    evidenceRules: [
        'NEVER extract the names of employees listed in a fidelity schedule. Record the department and the number of positions.',
        'A blank amount on a printed line ("ΕΥΡΩ .............") is a missing value, not zero.',
        'Do not merge two sub-limits into a total. If the schedule gives per-till limits of 1.500, 3.500 and 5.000 under a 30.000 cap, record all four.',
    ],
    negativeExamples: [
        'Cash in safe and cash in transit are separate covers with separate limits even when written on one schedule.',
        'An agreed value per artwork is not a market valuation — record what is printed.',
    ],
}

const PERSONAL_CYBER_PACK: LobPack = {
    id: 'personal_cyber',
    version: '1.0.0',
    branchIds: ['cyber'],
    terminology: [
        'ΠΙΝΑΚΑΣ ΑΣΦΑΛΙΣΗΣ', 'Ασφαλιστικές Ρήτρες', 'Κλοπή ψηφιακής Ταυτότητας',
        'Απάτη στον Κυβερνοχώρο', 'Γραμμή Βοήθειας στον Κυβερνοχώρο',
    ],
    extractionHints: [
        'Personal cyber is written as separate insuring clauses, each with its own per-claim AND aggregate limit. Emit one coverage per clause with both limits.',
        'The helpline and the claims-notification address are perksAndBenefits entries with their contact details.',
        'Γεωγραφικά Όρια maps to acordData.territorialScope.description.',
        'Exclusions in this line are numerous and specific — capture them, especially any that turn on the policyholder’s own conduct.',
    ],
    evidenceRules: [
        'An exclusion for failing to change a device’s default password is a condition the customer can act on. Record it in exclusions AND as a condition with kind="security_requirement" and verifiable=true.',
        'Where business or professional use is excluded, record it verbatim — it is what decides whether a freelancer is covered at all.',
    ],
    negativeExamples: [
        'A per-claim limit is not the aggregate. Both are printed; record both.',
    ],
}

const LIABILITY_PACK: LobPack = {
    id: 'liability',
    version: '1.0.0',
    branchIds: ['liability', 'boat_tpl', 'professional_liability'],
    terminology: [
        'ΑΣΤΙΚΗ ΕΥΘΥΝΗ', 'ΟΡΙΑ ΕΥΘΥΝΗΣ', 'ΘΑΝΑΤΟΣ/ΣΩΜ.ΒΛΑΒΕΣ', 'ΥΛΙΚΕΣ ΖΗΜΙΕΣ ΤΡΙΤΩΝ',
        'ΑΤΟΜΟΥ', 'ΟΜΑΔΑΣ ΑΤΟΜΩΝ', 'θαλάσσια ρύπανση',
    ],
    extractionHints: [
        'Liability limits come in towers. A column headed ΑΤΟΜΟΥ is per_person; ΟΜΑΔΑΣ ΑΤΟΜΩΝ is per_event; a figure described as αθροιστικά or συνολικά για την περίοδο is per_period_aggregate. Emit all of them.',
        'Marine pollution carries its own tower — keep it as a separate coverage, not merged into property damage.',
        'ΠΕΡΙΓΡΑΦΗ ΑΣΦΑΛΙΖΟΜΕΝΟΥ ΚΙΝΔΥΝΟΥ states the capacity insured (for example acting as building manager) and the specific risks named such as lifts or pipework. Record it in coverageSummary and, where it names conditions, in conditions.',
        'A percentage deductible with a stated floor maps to deductibles[].percentOf plus minimum.',
        'Where the policy cites a statute for its limits, record that citation in namedClauses.',
    ],
    evidenceRules: [
        'Do not collapse the towers into one number, and do not assume the overall ceiling equals any individual tower.',
        'Where a liability policy is compulsory by statute, record the statute — but do not assert compliance or non-compliance.',
    ],
    negativeExamples: [
        'Common-areas liability for a block of flats is a consumer liability policy, not a business policy.',
    ],
}

export const LOB_PACKS: LobPack[] = [
    MARINE_HULL_PACK,
    MARINE_CARGO_PACK,
    MARINE_CREW_PACK,
    CRIME_AND_VALUABLES_PACK,
    PERSONAL_CYBER_PACK,
    LIABILITY_PACK,
]

/**
 * Resolve the pack for a line of business.
 *
 * Matches on the exact branch first and then on the branch family, so
 * `boat_hull` finds the marine pack directly while an unlisted child of `boat`
 * still inherits it. Returns null for lines with no pack — motor, health, home
 * and the rest are covered well by Layer 1 and adding thin packs for them would
 * dilute the prompt for no gain.
 */
export function packForLineOfBusiness(lineOfBusiness: string | null | undefined): LobPack | null {
    if (!lineOfBusiness) return null
    const branchId = normalizeBranch(lineOfBusiness).id
    const exact = LOB_PACKS.find((pack) => pack.branchIds.includes(branchId))
    if (exact) return exact

    const family = branchFamilyId(lineOfBusiness)
    return LOB_PACKS.find((pack) => pack.branchIds.includes(family)) ?? null
}

/** The Layer-2 block for a line of business, or "" when no pack applies. */
export function lobPackBlock(lineOfBusiness: string | null | undefined): string {
    const pack = packForLineOfBusiness(lineOfBusiness)
    return pack ? `\n\n${formatLobPack(pack)}` : ''
}

/** Provenance stamp, so a stored extraction records which guidance shaped it. */
export function lobPackProvenance(lineOfBusiness: string | null | undefined): { packId: string; packVersion: string } | null {
    const pack = packForLineOfBusiness(lineOfBusiness)
    return pack ? { packId: pack.id, packVersion: pack.version } : null
}
