/**
 * The life event registry.
 *
 * Pure data. Every entry is a row; there is no branch anywhere in the engine on
 * an event id, so adding an event is a registry change and never a code change.
 *
 * Two things every entry obeys:
 *
 * 1. **It writes to context, never to recommendations.** `introduces` lists risk
 *    ids that MAY become applicable — the catalog still decides, from the
 *    customer's whole situation. A marriage does not create a life-cover need;
 *    a person who depends on your income does.
 *
 * 2. **Disposals are first-class.** `property_sale`, `vehicle_disposal`,
 *    `mortgage_cleared` and `child_leaves_home` exist because a model that only
 *    handles acquisition can add risk forever and never remove it. Advising
 *    someone that they now need LESS cover is the cheapest trust this product can
 *    buy, and it is only expressible if the events exist.
 */

import type { LifeEventDefinition } from "./types"

const W = (days: number, decay: "linear" | "cliff" | "none" = "linear") => ({ days, decay })
const DECLARED_ONLY = [{ source: "customer_declared" as const, confidence: "high" as const }]
const DECLARED_OR_DERIVED = [
    { source: "customer_declared" as const, confidence: "high" as const },
    { source: "profile_delta" as const, confidence: "medium" as const },
]

export const LIFE_EVENT_REGISTRY: LifeEventDefinition[] = [
    // ── Household ────────────────────────────────────────────────────
    {
        id: "marriage",
        domain: "household",
        kind: "status_change",
        label: { en: "Marriage or civil partnership", el: "Γάμος ή σύμφωνο συμβίωσης" },
        description: {
            en: "Two households becoming one usually means two of something — the common finding here is duplicated cover, not a gap.",
            el: "Όταν δύο νοικοκυριά γίνονται ένα, συνήθως υπάρχουν διπλά πράγματα — το σύνηθες εύρημα εδώ είναι διπλή κάλυψη, όχι κενό.",
        },
        contextDelta: [
            { column: "maritalStatus", factor: "maritalStatus", operation: "set", value: "married" },
        ],
        introduces: ["life_dependents"],
        retires: [],
        urgency: "medium",
        window: W(90),
        sensitivity: "standard",
        dependsOn: [],
        detection: DECLARED_OR_DERIVED,
        reversedBy: ["divorce"],
        repeatable: true,
    },
    {
        id: "divorce",
        domain: "household",
        kind: "status_change",
        label: { en: "Divorce", el: "Διαζύγιο" },
        description: {
            en: "Updating beneficiaries is the single most-missed action after a divorce — policies routinely pay a former spouse years later because nobody changed the nomination.",
            el: "Η ενημέρωση των δικαιούχων είναι η πιο συχνά παραλειπόμενη ενέργεια μετά από διαζύγιο — ασφαλιστήρια πληρώνουν τακτικά πρώην συζύγους χρόνια μετά, επειδή κανείς δεν άλλαξε τον ορισμό.",
        },
        contextDelta: [
            { column: "maritalStatus", factor: "maritalStatus", operation: "set", value: "divorced" },
        ],
        introduces: ["home_contents_tenant"],
        retires: [],
        urgency: "high",
        window: W(180),
        sensitivity: "sensitive",
        dependsOn: [{ kind: "requires_event", target: "marriage" }],
        detection: DECLARED_ONLY,
        reversedBy: [],
        repeatable: true,
    },
    {
        id: "birth",
        domain: "household",
        kind: "acquisition",
        label: { en: "A child was born", el: "Γέννηση παιδιού" },
        description: {
            en: "Peak receptivity in the whole model — and peak inertia afterwards, so sizing cover correctly matters more here than anywhere else.",
            el: "Η στιγμή μέγιστης δεκτικότητας — και μέγιστης αδράνειας μετά, οπότε το σωστό ύψος κάλυψης έχει εδώ μεγαλύτερη σημασία από οπουδήποτε αλλού.",
        },
        contextDelta: [
            { column: "childrenCount", factor: "children", operation: "increment", value: 1 },
            { column: "dependentsCount", factor: "dependents", operation: "increment", value: 1 },
        ],
        introduces: ["life_dependents", "income_interruption"],
        retires: [],
        urgency: "high",
        window: W(120),
        sensitivity: "standard",
        dependsOn: [],
        detection: DECLARED_OR_DERIVED,
        reversedBy: [],
        repeatable: true,
    },
    {
        id: "child_leaves_home",
        domain: "household",
        kind: "disposal",
        label: { en: "A child became independent", el: "Ένα παιδί ανεξαρτητοποιήθηκε" },
        description: {
            en: "You may now need less cover than you did. Reducing it is a real outcome, and worth saying.",
            el: "Ίσως χρειάζεστε πλέον λιγότερη κάλυψη από πριν. Η μείωση είναι πραγματικό αποτέλεσμα και αξίζει να ειπωθεί.",
        },
        // childrenCount is deliberately untouched — they are still your child.
        contextDelta: [
            { column: "dependentsCount", factor: "dependents", operation: "increment", value: -1 },
        ],
        introduces: [],
        retires: ["life_dependents"],
        urgency: "low",
        window: W(365),
        sensitivity: "standard",
        dependsOn: [{ kind: "requires_event", target: "birth" }],
        detection: DECLARED_ONLY,
        reversedBy: [],
        repeatable: true,
    },

    // ── Residence & property ─────────────────────────────────────────
    {
        id: "property_purchase",
        domain: "residence",
        kind: "acquisition",
        label: { en: "Bought a property", el: "Αγορά ακινήτου" },
        description: {
            en: "Insure to rebuild cost, not market value, and check earthquake separately — in Greece it is usually its own cover.",
            el: "Ασφαλίστε στο κόστος ανακατασκευής, όχι στην εμπορική αξία, και ελέγξτε χωριστά τον σεισμό — στην Ελλάδα είναι συνήθως ξεχωριστή κάλυψη.",
        },
        contextDelta: [
            { column: "residenceType", factor: "residence", operation: "set", value: "owned" },
            { column: "propertiesOwned", factor: "propertyOwnership", operation: "increment", value: 1 },
        ],
        introduces: ["home_building_damage", "home_legal_disputes"],
        retires: ["home_contents_tenant"],
        urgency: "high",
        window: W(45),
        sensitivity: "standard",
        dependsOn: [],
        detection: DECLARED_OR_DERIVED,
        reversedBy: ["property_sale"],
        repeatable: true,
    },
    {
        id: "property_sale",
        domain: "property",
        kind: "disposal",
        label: { en: "Sold a property", el: "Πώληση ακινήτου" },
        description: {
            en: "Cancel from completion, not from listing — and confirm no lender assignment remains first.",
            el: "Ακυρώστε από την ολοκλήρωση, όχι από την αγγελία — και επιβεβαιώστε πρώτα ότι δεν υπάρχει εκχώρηση προς τράπεζα.",
        },
        contextDelta: [
            { column: "propertiesOwned", factor: "propertyOwnership", operation: "increment", value: -1 },
        ],
        introduces: [],
        retires: ["home_building_damage", "landlord_letting", "home_legal_disputes"],
        urgency: "medium",
        window: W(60),
        sensitivity: "standard",
        dependsOn: [{ kind: "requires_event", target: "property_purchase" }],
        detection: DECLARED_ONLY,
        reversedBy: [],
        repeatable: true,
    },
    {
        id: "renting",
        domain: "residence",
        kind: "status_change",
        label: { en: "Started renting", el: "Έναρξη ενοικίασης" },
        description: {
            en: "Your landlord's policy covers the building, not your belongings — and not you if a leak reaches the flat below.",
            el: "Το ασφαλιστήριο του ιδιοκτήτη καλύπτει το κτίριο, όχι τα υπάρχοντά σας — ούτε εσάς αν μια διαρροή φτάσει στο από κάτω διαμέρισμα.",
        },
        contextDelta: [
            { column: "residenceType", factor: "residence", operation: "set", value: "rented" },
        ],
        introduces: ["home_contents_tenant"],
        // Deliberately retires nothing. Renting the home you LIVE in says
        // nothing about property you own — a landlord renting while letting out
        // a flat is ordinary, and claiming this retires the buildings risk would
        // drop cover on a property they still hold.
        retires: [],
        urgency: "medium",
        window: W(60),
        sensitivity: "standard",
        dependsOn: [],
        detection: DECLARED_OR_DERIVED,
        reversedBy: ["property_purchase"],
        repeatable: true,
    },
    {
        id: "mortgage",
        domain: "money",
        kind: "acquisition",
        label: { en: "Took out a mortgage", el: "Λήψη στεγαστικού δανείου" },
        description: {
            en: "Greek lenders normally require fire cover and often bundle borrower's life cover — check what the bank already arranged before buying anything.",
            el: "Οι ελληνικές τράπεζες συνήθως απαιτούν ασφάλιση πυρός και συχνά περιλαμβάνουν ασφάλιση ζωής δανειολήπτη — ελέγξτε τι έχει ήδη κανονίσει η τράπεζα πριν συνάψετε κάτι.",
        },
        contextDelta: [
            { column: "mortgageAmount", factor: "mortgage", operation: "set" },
        ],
        introduces: ["life_debt", "home_building_damage"],
        retires: [],
        urgency: "high",
        window: W(45),
        sensitivity: "standard",
        dependsOn: [],
        detection: DECLARED_ONLY,
        reversedBy: ["mortgage_cleared"],
        repeatable: true,
    },
    {
        id: "mortgage_cleared",
        domain: "money",
        kind: "disposal",
        label: { en: "Cleared the mortgage", el: "Εξόφληση στεγαστικού δανείου" },
        description: {
            en: "An assigned life policy may now be surplus — or worth keeping, because replacing it at your age could cost more.",
            el: "Ένα εκχωρημένο ασφαλιστήριο ζωής μπορεί πλέον να περισσεύει — ή να αξίζει να διατηρηθεί, καθώς η αντικατάστασή του στην ηλικία σας ίσως κοστίζει περισσότερο.",
        },
        contextDelta: [
            { column: "mortgageAmount", factor: "mortgage", operation: "set", value: 0 },
        ],
        introduces: [],
        retires: ["life_debt"],
        urgency: "low",
        window: W(180),
        sensitivity: "standard",
        dependsOn: [{ kind: "requires_event", target: "mortgage" }],
        detection: DECLARED_OR_DERIVED,
        reversedBy: [],
        repeatable: true,
    },
    {
        id: "letting_start",
        domain: "property",
        kind: "acquisition",
        label: { en: "Started letting a property", el: "Έναρξη εκμίσθωσης ακινήτου" },
        description: {
            en: "An owner-occupier policy usually does not cover a let property, and loss of rent is a separate cover.",
            el: "Ένα ασφαλιστήριο ιδιοκατοίκησης συνήθως δεν καλύπτει εκμισθωμένο ακίνητο, και η απώλεια μισθωμάτων καλύπτεται ξεχωριστά.",
        },
        contextDelta: [
            { column: "rentsOutProperty", factor: "tenants", operation: "set", value: true },
        ],
        introduces: ["landlord_letting", "home_legal_disputes"],
        retires: [],
        urgency: "high",
        window: W(45),
        sensitivity: "standard",
        dependsOn: [],
        detection: DECLARED_ONLY,
        reversedBy: [],
        repeatable: false,
    },

    // ── Mobility ─────────────────────────────────────────────────────
    {
        id: "vehicle_purchase",
        domain: "mobility",
        kind: "acquisition",
        label: { en: "Bought a vehicle", el: "Αγορά οχήματος" },
        description: {
            en: "Third-party liability is compulsory for any vehicle in circulation in Greece — the cover must exist before the vehicle moves.",
            el: "Η ασφάλιση αστικής ευθύνης είναι υποχρεωτική για κάθε όχημα σε κυκλοφορία στην Ελλάδα — η κάλυψη πρέπει να υπάρχει πριν κινηθεί το όχημα.",
        },
        contextDelta: [
            { column: "vehiclesCount", factor: "vehicles", operation: "increment", value: 1 },
        ],
        introduces: ["motor_liability"],
        retires: [],
        urgency: "immediate",
        window: W(14, "cliff"),
        sensitivity: "standard",
        dependsOn: [],
        detection: [
            { source: "customer_declared", confidence: "high" },
            { source: "policy_derived", confidence: "medium", expression: "new motor policy added" },
        ],
        reversedBy: ["vehicle_disposal"],
        repeatable: true,
    },
    {
        id: "motorcycle_purchase",
        domain: "mobility",
        kind: "acquisition",
        label: { en: "Bought a motorcycle", el: "Αγορά μοτοσυκλέτας" },
        description: {
            en: "Motor liability protects other people, not the rider — the injury exposure is what usually goes unaddressed.",
            el: "Η αστική ευθύνη οχήματος προστατεύει τους άλλους, όχι τον αναβάτη — η έκθεση σε τραυματισμό είναι αυτό που συνήθως μένει ακάλυπτο.",
        },
        contextDelta: [
            { column: "vehiclesCount", factor: "vehicles", operation: "increment", value: 1 },
        ],
        introduces: ["motor_liability", "activity_injury"],
        retires: [],
        urgency: "immediate",
        window: W(14, "cliff"),
        sensitivity: "standard",
        dependsOn: [],
        detection: DECLARED_ONLY,
        reversedBy: ["vehicle_disposal"],
        repeatable: true,
    },
    {
        id: "vehicle_disposal",
        domain: "mobility",
        kind: "disposal",
        label: { en: "Sold or scrapped a vehicle", el: "Πώληση ή απόσυρση οχήματος" },
        description: {
            en: "If the plates are deposited (κατάθεση πινακίδων) no cover is required while it stays off the road, and unexpired premium may be refundable.",
            el: "Με κατάθεση πινακίδων δεν απαιτείται ασφάλιση όσο το όχημα μένει εκτός κυκλοφορίας, και τα μη δεδουλευμένα ασφάλιστρα ίσως επιστρέφονται.",
        },
        contextDelta: [
            { column: "vehiclesCount", factor: "vehicles", operation: "increment", value: -1 },
        ],
        introduces: [],
        retires: ["motor_liability", "motor_legal_disputes"],
        urgency: "low",
        window: W(60),
        sensitivity: "standard",
        dependsOn: [{ kind: "requires_event", target: "vehicle_purchase" }],
        detection: DECLARED_ONLY,
        reversedBy: [],
        repeatable: true,
    },
    {
        id: "boat_purchase",
        domain: "mobility",
        kind: "acquisition",
        label: { en: "Bought a boat", el: "Αγορά σκάφους" },
        description: {
            en: "Third-party liability is compulsory for recreational craft, and salvage and wreck removal are frequently the largest costs after an incident.",
            el: "Η αστική ευθύνη είναι υποχρεωτική για σκάφη αναψυχής, και η ναυαγιαίρεση με την ανέλκυση είναι συχνά τα μεγαλύτερα κόστη μετά από συμβάν.",
        },
        contextDelta: [
            { column: "ownsBoat", factor: "boat", operation: "set", value: true },
        ],
        introduces: ["boat_liability"],
        retires: [],
        urgency: "high",
        window: W(30),
        sensitivity: "standard",
        dependsOn: [],
        detection: DECLARED_ONLY,
        reversedBy: [],
        repeatable: false,
    },

    // ── Lifestyle ────────────────────────────────────────────────────
    {
        id: "pet_adoption",
        domain: "lifestyle",
        kind: "acquisition",
        label: { en: "Adopted a pet", el: "Υιοθεσία κατοικιδίου" },
        description: {
            en: "Emergency vet treatment is paid out of pocket, and under Greek law an owner is liable for injury their animal causes.",
            el: "Η επείγουσα κτηνιατρική περίθαλψη πληρώνεται από την τσέπη, και κατά το ελληνικό δίκαιο ο ιδιοκτήτης ευθύνεται για τραυματισμούς που προκαλεί το ζώο του.",
        },
        contextDelta: [
            { column: "hasPets", factor: "pets", operation: "set", value: true },
            { column: "petsCount", factor: "pets", operation: "increment", value: 1 },
        ],
        introduces: ["pet_costs"],
        retires: [],
        urgency: "low",
        window: W(90),
        sensitivity: "standard",
        dependsOn: [],
        detection: DECLARED_ONLY,
        reversedBy: [],
        repeatable: true,
    },
    {
        id: "travel_frequency_increase",
        domain: "lifestyle",
        kind: "threshold_crossing",
        label: { en: "Started travelling frequently", el: "Έναρξη συχνών ταξιδιών" },
        description: {
            en: "Inside the EU your ΕΚΑΑ card covers state treatment; outside it you pay in full, and repatriation is covered by neither.",
            el: "Εντός ΕΕ η ΕΚΑΑ καλύπτει τη δημόσια περίθαλψη· εκτός ΕΕ πληρώνετε εξ ολοκλήρου, και ο επαναπατρισμός δεν καλύπτεται σε καμία περίπτωση.",
        },
        contextDelta: [
            { column: "travelsFrequently", factor: "travelFrequency", operation: "set", value: true },
        ],
        introduces: ["travel_abroad"],
        retires: [],
        urgency: "medium",
        window: W(60),
        sensitivity: "standard",
        dependsOn: [],
        detection: DECLARED_ONLY,
        reversedBy: [],
        repeatable: false,
    },
    {
        id: "high_value_purchase",
        domain: "lifestyle",
        kind: "acquisition",
        label: { en: "Acquired something valuable", el: "Απόκτηση αντικειμένου υψηλής αξίας" },
        description: {
            en: "Contents policies cap individual items at a low single-article limit, and often exclude them away from the home.",
            el: "Τα ασφαλιστήρια περιεχομένου θέτουν χαμηλό όριο ανά αντικείμενο, και συχνά τα εξαιρούν εκτός κατοικίας.",
        },
        contextDelta: [
            { column: "valuablesValue", factor: "valuables", operation: "increment" },
        ],
        introduces: ["valuables_loss"],
        retires: [],
        urgency: "medium",
        window: W(60),
        sensitivity: "standard",
        dependsOn: [],
        detection: DECLARED_ONLY,
        reversedBy: [],
        repeatable: true,
    },

    // ── Work ─────────────────────────────────────────────────────────
    {
        id: "business_creation",
        domain: "work",
        kind: "acquisition",
        label: { en: "Started a business", el: "Δημιουργία επιχείρησης" },
        description: {
            en: "The lost trading period after a loss is usually larger than the damage itself, and it is a separate cover.",
            el: "Η περίοδος διακοπής μετά από ζημιά είναι συνήθως μεγαλύτερη ζημιά από την ίδια την υλική βλάβη, και καλύπτεται ξεχωριστά.",
        },
        contextDelta: [
            { column: "ownsBusiness", factor: "businessOwnership", operation: "set", value: true },
        ],
        introduces: ["business_assets_interruption", "professional_liability"],
        retires: [],
        urgency: "high",
        window: W(90),
        sensitivity: "standard",
        dependsOn: [],
        detection: DECLARED_ONLY,
        reversedBy: [],
        repeatable: false,
    },
    {
        id: "hired_employees",
        domain: "work",
        kind: "threshold_crossing",
        label: { en: "Took on employees", el: "Πρόσληψη προσωπικού" },
        description: {
            en: "An employee's claim for what ΕΦΚΑ does not meet is personal to you as employer, and a general business policy does not cover it by default.",
            el: "Η αξίωση εργαζομένου για ό,τι δεν καλύπτει ο ΕΦΚΑ βαρύνει προσωπικά εσάς ως εργοδότη, και ένα γενικό ασφαλιστήριο επιχείρησης δεν την καλύπτει εξ ορισμού.",
        },
        contextDelta: [
            { column: "businessEmployees", factor: "employees", operation: "set" },
        ],
        introduces: ["employer_liability"],
        retires: [],
        urgency: "high",
        window: W(45),
        sensitivity: "standard",
        dependsOn: [{ kind: "requires_event", target: "business_creation" }],
        detection: DECLARED_ONLY,
        reversedBy: [],
        repeatable: true,
    },
    {
        id: "retirement",
        domain: "work",
        kind: "status_change",
        label: { en: "Retired", el: "Συνταξιοδότηση" },
        description: {
            en: "Cover priced on a working income may now be the wrong size — this is usually a conversation about what to keep, not what to add.",
            el: "Η κάλυψη που τιμολογήθηκε πάνω σε εργασιακό εισόδημα ίσως έχει πλέον λάθος μέγεθος — συνήθως είναι συζήτηση για το τι κρατάτε, όχι για το τι προσθέτετε.",
        },
        contextDelta: [
            { column: "employmentStatus", factor: "selfEmployed", operation: "set", value: "retired" },
        ],
        introduces: ["health_access_delay"],
        retires: ["income_interruption", "professional_liability"],
        urgency: "medium",
        window: W(180),
        sensitivity: "standard",
        dependsOn: [],
        detection: DECLARED_OR_DERIVED,
        reversedBy: [],
        repeatable: false,
    },
    {
        id: "income_increase",
        domain: "money",
        kind: "threshold_crossing",
        label: { en: "Income increased significantly", el: "Σημαντική αύξηση εισοδήματος" },
        description: {
            en: "Cover sized to your old income now replaces less of your life. This changes no applicability at all — it is purely a question of adequacy.",
            el: "Η κάλυψη που υπολογίστηκε στο παλιό σας εισόδημα αναπληρώνει πλέον λιγότερα. Δεν αλλάζει καμία εφαρμοσιμότητα — είναι καθαρά ζήτημα επάρκειας.",
        },
        contextDelta: [
            { column: "annualIncome", factor: "income", operation: "set" },
        ],
        introduces: [],
        retires: [],
        urgency: "medium",
        window: W(120),
        sensitivity: "standard",
        dependsOn: [],
        detection: DECLARED_OR_DERIVED,
        reversedBy: [],
        repeatable: true,
    },

    // ── Health ───────────────────────────────────────────────────────
    {
        id: "health_change",
        domain: "health",
        kind: "shock",
        label: { en: "A change in your health", el: "Μεταβολή στην υγεία σας" },
        description: {
            // The exclusion is stated first, deliberately: raising an expectation
            // the Greek market will not honour is worse than saying nothing.
            en: "Greek health insurers routinely exclude pre-existing conditions, often permanently — a new policy is unlikely to cover a condition already declared.",
            el: "Οι ελληνικές ασφαλιστικές υγείας εξαιρούν συστηματικά τις προϋπάρχουσες παθήσεις, συχνά μόνιμα — ένα νέο ασφαλιστήριο είναι απίθανο να καλύψει πάθηση που έχει ήδη δηλωθεί.",
        },
        // `mark_known` only: this settles that the health factor was ASKED. The
        // condition list itself is Art. 9 data and is written solely through the
        // explicitly consented risk-profile surface, never as a side effect of
        // declaring an event.
        contextDelta: [
            { column: "chronicConditions", factor: "health", operation: "mark_known" },
        ],
        introduces: ["chronic_condition_costs"],
        retires: [],
        urgency: "low",
        window: W(180),
        sensitivity: "special_category",
        dependsOn: [],
        detection: DECLARED_ONLY,
        reversedBy: [],
        repeatable: true,
    },
]

const BY_ID = new Map(LIFE_EVENT_REGISTRY.map((e) => [e.id, e]))

export function getLifeEvent(id: string) {
    return BY_ID.get(id)
}

export function lifeEventIds(): string[] {
    return LIFE_EVENT_REGISTRY.map((e) => e.id)
}

/**
 * Events that carry an amount, and what to call it.
 *
 * Derived from the registry rather than listed in the UI: an event needs a
 * magnitude exactly when one of its deltas has no literal `value` and therefore
 * reads the occurrence's magnitude instead. Keeping this here means a new event
 * cannot acquire an amount field the form does not know how to ask for.
 */
export function magnitudePrompt(id: string): { en: string; el: string } | null {
    const definition = getLifeEvent(id)
    if (!definition) return null
    const needsAmount = definition.contextDelta.some(
        (d) => (d.operation === "set" || d.operation === "increment") && d.value === undefined
    )
    if (!needsAmount) return null
    return MAGNITUDE_LABELS[id] ?? { en: "Amount (€)", el: "Ποσό (€)" }
}

const MAGNITUDE_LABELS: Record<string, { en: string; el: string }> = {
    mortgage: { en: "Outstanding balance (€)", el: "Ανεξόφλητο υπόλοιπο (€)" },
    income_increase: { en: "New annual income (€)", el: "Νέο ετήσιο εισόδημα (€)" },
    hired_employees: { en: "How many people you employ", el: "Πόσα άτομα απασχολείτε" },
    high_value_purchase: { en: "Value of the item (€)", el: "Αξία του αντικειμένου (€)" },
}

/** Events a customer may declare about themselves, in reading order. */
export function declarableLifeEvents(): LifeEventDefinition[] {
    return LIFE_EVENT_REGISTRY.filter((e) =>
        e.detection.some((d) => d.source === "customer_declared")
    )
}
