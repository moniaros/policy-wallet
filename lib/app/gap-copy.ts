/**
 * The analyst's sentence for each AUTHORED gap rule (lib/gaps/authored-catalogue.ts).
 *
 * Authored, bilingual, verb-first, naming the object — never model prose. A
 * rule with no sentence here cannot become a finding: the composer logs it
 * and moves on, which is the specificity gate applied to copy. `{asset}` is
 * the policy's asset label («Toyota Yaris · ΙΚΖ-4821», «Κατοικία · Κηφισιά»);
 * `{drift}` is the computed figure a value_drift rule quotes.
 *
 * Wording rule (CLAUDE.md): a `missing`/`all_missing` rule fires on SILENCE and
 * is worded «δεν βρήκα καταγεγραμμένο …» (not recorded) — never «δεν καλύπτεται».
 */
export interface GapSentence {
    el: string
    en: string
    /** Where the rule read — the section named in the source pointer. */
    section: "coverages" | "exclusions" | "schedule" | "conditions"
}

export const GAP_SENTENCES: Record<string, GapSentence> = {
    missing_enfia_components: { section: "coverages", el: "Στο {asset} δεν βρήκα και τις τρεις καλύψεις που χρειάζεται η έκπτωση ΕΝΦΙΑ (πυρκαγιά, σεισμός, πλημμύρα).", en: "On {asset} I did not find all three covers the ENFIA discount needs (fire, earthquake, flood)." },
    missing_coordination_centre: { section: "schedule", el: "Στο {asset} δεν βρήκα καταγεγραμμένο τηλέφωνο συντονιστικού κέντρου.", en: "On {asset} I did not find a recorded coordination-centre phone number." },
    missing_leishmaniasis: { section: "coverages", el: "Στο {asset} δεν βρήκα κάλυψη λεϊσμανίασης.", en: "On {asset} I did not find Leishmaniasis cover." },
    green_card_expiring: { section: "schedule", el: "Στο {asset} η Πράσινη Κάρτα λήγει σύντομα.", en: "On {asset} the Green Card expires soon." },
    insured_value_above_declared: { section: "schedule", el: "Στο {asset} το ασφαλισμένο ποσό είναι {drift}% πάνω από τη δηλωμένη αξία.", en: "On {asset} the insured amount is {drift}% above the declared value." },
    insured_value_below_rebuild_cost: { section: "schedule", el: "Στο {asset} το ασφαλισμένο ποσό είναι {drift}% κάτω από το κόστος ανακατασκευής.", en: "On {asset} the insured amount is {drift}% below the rebuild cost." },
    no_own_damage_cover: { section: "coverages", el: "Στο {asset} δεν βρήκα κάλυψη ιδίων ζημιών.", en: "On {asset} I did not find own-damage cover." },
    no_glass_breakage_cover: { section: "coverages", el: "Στο {asset} δεν βρήκα κάλυψη θραύσης κρυστάλλων.", en: "On {asset} I did not find glass-breakage cover." },
    no_roadside_assistance: { section: "coverages", el: "Στο {asset} δεν βρήκα οδική βοήθεια.", en: "On {asset} I did not find roadside assistance." },
    missing_accident_declaration_phone: { section: "schedule", el: "Στο {asset} δεν βρήκα καταγεγραμμένο τηλέφωνο δήλωσης ατυχήματος.", en: "On {asset} I did not find a recorded accident-declaration phone number." },
    no_earthquake_cover: { section: "coverages", el: "Στο {asset} δεν βρήκα κάλυψη σεισμού.", en: "On {asset} I did not find earthquake cover." },
    no_flood_cover: { section: "coverages", el: "Στο {asset} δεν βρήκα κάλυψη πλημμύρας.", en: "On {asset} I did not find flood cover." },
    no_fire_cover: { section: "coverages", el: "Στο {asset} δεν βρήκα κάλυψη πυρκαγιάς.", en: "On {asset} I did not find fire cover." },
    no_direct_billing: { section: "coverages", el: "Στο {asset} δεν βρήκα απευθείας εξόφληση με το νοσοκομείο.", en: "On {asset} I did not find direct settlement with the hospital." },
    no_annual_checkup: { section: "coverages", el: "Στο {asset} δεν βρήκα ετήσιο check-up.", en: "On {asset} I did not find an annual check-up." },
    missing_hospital_class: { section: "schedule", el: "Στο {asset} δεν βρήκα καταγεγραμμένη θέση νοσηλείας.", en: "On {asset} I did not find a recorded hospital room class." },
    no_direct_vet_payment: { section: "coverages", el: "Στο {asset} δεν βρήκα απευθείας πληρωμή στον κτηνίατρο.", en: "On {asset} I did not find direct payment to the vet." },
    missing_microchip_number: { section: "schedule", el: "Στο {asset} δεν βρήκα καταγεγραμμένο αριθμό microchip.", en: "On {asset} I did not find a recorded microchip number." },
    no_beneficiaries_recorded: { section: "schedule", el: "Στο {asset} δεν βρήκα καταγεγραμμένο δικαιούχο.", en: "On {asset} I did not find a recorded beneficiary." },
    no_repatriation_cover: { section: "coverages", el: "Στο {asset} δεν βρήκα κάλυψη υγειονομικού επαναπατρισμού.", en: "On {asset} I did not find medical repatriation cover." },
    no_trip_cancellation_cover: { section: "coverages", el: "Στο {asset} δεν βρήκα κάλυψη ακύρωσης ταξιδιού.", en: "On {asset} I did not find trip-cancellation cover." },
    missing_emergency_assistance_phone: { section: "schedule", el: "Στο {asset} δεν βρήκα καταγεγραμμένο τηλέφωνο έκτακτης βοήθειας.", en: "On {asset} I did not find a recorded emergency-assistance phone number." },
    group_missing_coordination_centre: { section: "schedule", el: "Στο {asset} δεν βρήκα καταγεγραμμένο τηλέφωνο συντονιστικού κέντρου.", en: "On {asset} I did not find a recorded coordination-centre phone number." },
    group_missing_hospital_class: { section: "schedule", el: "Στο {asset} δεν βρήκα καταγεγραμμένη θέση νοσηλείας.", en: "On {asset} I did not find a recorded hospital room class." },
    group_no_direct_billing: { section: "coverages", el: "Στο {asset} δεν βρήκα απευθείας εξόφληση με το νοσοκομείο.", en: "On {asset} I did not find direct settlement with the hospital." },
    moto_no_own_damage_cover: { section: "coverages", el: "Στο {asset} δεν βρήκα κάλυψη ιδίων ζημιών.", en: "On {asset} I did not find own-damage cover." },
    moto_no_roadside_assistance: { section: "coverages", el: "Στο {asset} δεν βρήκα οδική βοήθεια.", en: "On {asset} I did not find roadside assistance." },
    moto_missing_accident_declaration_phone: { section: "schedule", el: "Στο {asset} δεν βρήκα καταγεγραμμένο τηλέφωνο δήλωσης ατυχήματος.", en: "On {asset} I did not find a recorded accident-declaration phone number." },
    moto_green_card_expiring: { section: "schedule", el: "Στο {asset} η Πράσινη Κάρτα λήγει σύντομα.", en: "On {asset} the Green Card expires soon." },
}

/** The operators that fire on SILENCE — their findings are `review`, never `gap`. */
export const SILENCE_OPERATORS: ReadonlySet<string> = new Set(["missing", "all_missing"])

/** Operators whose finding is a `review` of a figure rather than an absence (still worded by the sentence). */
export const FIGURE_OPERATORS: ReadonlySet<string> = new Set(["value_drift", "less_than"])
