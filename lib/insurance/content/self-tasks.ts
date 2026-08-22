/**
 * What a `ctaType: 'task'` action creates.
 *
 * These are the only actions that write something the user owns rather than
 * asking someone else for it: a row in `UserTask`, assigned to themselves, via
 * `createSelfTask`. No agent, no entitlement, no AI call — which is why they
 * stay ungated on every tier.
 *
 * Two shapes exist today:
 *
 *  - `target: 'phone'` — «Αποθηκεύστε τη γραμμή επείγουσας βοήθειας». The task's
 *    `actionUrl` is a `tel:` link built from the number the Phase-2 resolver
 *    extracted from THIS policy. The bundle marks these actions
 *    `requiresPhone: true`, so when nothing was extracted the button never
 *    renders. That is deliberate: under the D7 honesty law we may not invent a
 *    hotline, and a saved reminder pointing at no number is a trap at exactly
 *    the moment someone needs it.
 *
 *  - `target: 'policy'` — «Σημειώστε αλλαγή ζωής». Always available; the task
 *    links back to the policy detail page so the note has somewhere to land.
 *
 * Copy is bilingual `{el, en}` in `.ts` so it stays out of the `.tsx`
 * hardcoded-text linter's way while remaining colocated with the bundles.
 */
import type { Bilingual } from './types'

export interface SelfTaskSpec {
    /** Maps to `UserTask.type`. */
    type: 'reminder' | 'general'
    priority: 'low' | 'medium' | 'high'
    title: Bilingual
    description: Bilingual
    actionLabel: Bilingual
    /**
     * 'phone'  → actionUrl is `tel:<resolved phone>` (requires `requiresPhone`)
     * 'policy' → actionUrl is the policy detail page
     */
    target: 'phone' | 'policy'
}

const SAVE_EMERGENCY_LINE: SelfTaskSpec = {
    type: 'reminder',
    priority: 'high',
    title: { el: 'Γραμμή επείγουσας βοήθειας', en: 'Emergency assistance line' },
    description: {
        el: 'Ο αριθμός βοήθειας από το ασφαλιστήριό σας, αποθηκευμένος ώστε να τον βρείτε χωρίς να ψάχνετε το έγγραφο.',
        en: 'The assistance number from your policy, saved so you can find it without digging through the document.',
    },
    actionLabel: { el: 'Κλήση', en: 'Call' },
    target: 'phone',
}

const NOTE_LIFE_CHANGE: SelfTaskSpec = {
    type: 'general',
    priority: 'medium',
    title: { el: 'Σημειώστε αλλαγή ζωής', en: 'Note a life change' },
    description: {
        el: 'Γάμος, παιδί, νέα δουλειά ή δάνειο ενδέχεται να αλλάζουν το τι χρειάζεται αυτό το συμβόλαιο. Αξίζει ένας έλεγχος όταν συμβεί κάτι τέτοιο.',
        en: 'Marriage, a child, a new job or a loan may change what this policy needs to do. It is worth a review when something like that happens.',
    },
    actionLabel: { el: 'Άνοιξε το συμβόλαιο', en: 'Open the policy' },
    target: 'policy',
}

/**
 * «Κρατήστε το πρόχειρο» tasks for branches where the number or the procedure the
 * user needs in an emergency lives ONLY in the document's free text.
 *
 * These deliberately use `target: 'policy'`, not `'phone'`. travel, cyber and
 * standalone roadside have no typed `acordData` section (see the honesty law in
 * ./action-resolvers.ts), so no resolver can ever produce a dialable number for
 * them — a `requiresPhone` task there would be a button that never renders.
 * Linking back to the policy, where the extracted document is shown, is the
 * honest version of "have this at hand".
 */
const KEEP_TRIP_DETAILS: SelfTaskSpec = {
    type: 'reminder',
    priority: 'medium',
    title: { el: 'Στοιχεία ταξιδιωτικής κάλυψης', en: 'Travel cover details' },
    description: {
        el: 'Άνοιξε το συμβόλαιο πριν φύγετε και κρατήστε πρόχειρα τη γραμμή βοήθειας, τον αριθμό συμβολαίου και τα όρια — σε επείγον στο εξωτερικό δεν θα ψάχνετε PDF.',
        en: 'Open the policy before you leave and keep the assistance line, the policy number and the limits at hand — in an emergency abroad you will not be searching PDFs.',
    },
    actionLabel: { el: 'Άνοιξε το συμβόλαιο', en: 'Open the policy' },
    target: 'policy',
}

const KEEP_INCIDENT_STEPS: SelfTaskSpec = {
    type: 'reminder',
    priority: 'medium',
    title: { el: 'Βήματα σε cyber περιστατικό', en: 'Steps in a cyber incident' },
    description: {
        el: 'Η σειρά μετράει: τράπεζα για μπλοκάρισμα, μετά Δίωξη Ηλεκτρονικού Εγκλήματος, μετά ασφαλιστής. Άνοιξε το συμβόλαιο για τις προθεσμίες και τα στοιχεία επικοινωνίας.',
        en: 'The order matters: bank first to block, then the cybercrime unit, then the insurer. Open the policy for the deadlines and the contact details.',
    },
    actionLabel: { el: 'Άνοιξε το συμβόλαιο', en: 'Open the policy' },
    target: 'policy',
}

const KEEP_ASSISTANCE_DETAILS: SelfTaskSpec = {
    type: 'reminder',
    priority: 'high',
    title: { el: 'Στοιχεία κέντρου οδικής βοήθειας', en: 'Roadside assistance centre details' },
    description: {
        el: 'Άνοιξε το συμβόλαιο και κρατήστε πρόχειρο το τηλέφωνο του κέντρου βοήθειας μαζί με τον αριθμό συμβολαίου — τη στιγμή που θα μείνετε, το έγγραφο είναι συνήθως στο σπίτι.',
        en: 'Open the contract and keep the assistance centre’s number and your contract number at hand — the moment you break down, the document is usually at home.',
    },
    actionLabel: { el: 'Άνοιξε το συμβόλαιο', en: 'Open the policy' },
    target: 'policy',
}

export const SELF_TASK_SPECS: Record<string, SelfTaskSpec> = {
    motor_save_emergency_line: SAVE_EMERGENCY_LINE,
    motorbike_save_emergency_line: SAVE_EMERGENCY_LINE,
    home_save_emergency_line: SAVE_EMERGENCY_LINE,
    health_save_emergency_line: SAVE_EMERGENCY_LINE,

    travel_save_trip_note: KEEP_TRIP_DETAILS,
    cyber_save_incident_plan: KEEP_INCIDENT_STEPS,
    roadside_save_assistance_details: KEEP_ASSISTANCE_DETAILS,

    life_note_life_change: NOTE_LIFE_CHANGE,
    income_protection_note_life_change: NOTE_LIFE_CHANGE,
    personal_accident_note_life_change: NOTE_LIFE_CHANGE,
}

export function getSelfTaskSpec(actionId: string): SelfTaskSpec | undefined {
    return SELF_TASK_SPECS[actionId]
}
