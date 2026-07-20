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
 *  - `target: 'phone'` — «Αποθήκευσε τη γραμμή επείγουσας βοήθειας». The task's
 *    `actionUrl` is a `tel:` link built from the number the Phase-2 resolver
 *    extracted from THIS policy. The bundle marks these actions
 *    `requiresPhone: true`, so when nothing was extracted the button never
 *    renders. That is deliberate: under the D7 honesty law we may not invent a
 *    hotline, and a saved reminder pointing at no number is a trap at exactly
 *    the moment someone needs it.
 *
 *  - `target: 'policy'` — «Σημείωσε αλλαγή ζωής». Always available; the task
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
        el: 'Ο αριθμός βοήθειας από το ασφαλιστήριό σου, αποθηκευμένος ώστε να τον βρεις χωρίς να ψάχνεις το έγγραφο.',
        en: 'The assistance number from your policy, saved so you can find it without digging through the document.',
    },
    actionLabel: { el: 'Κλήση', en: 'Call' },
    target: 'phone',
}

const NOTE_LIFE_CHANGE: SelfTaskSpec = {
    type: 'general',
    priority: 'medium',
    title: { el: 'Σημείωσε αλλαγή ζωής', en: 'Note a life change' },
    description: {
        el: 'Γάμος, παιδί, νέα δουλειά ή δάνειο ενδέχεται να αλλάζουν το τι χρειάζεται αυτό το συμβόλαιο. Αξίζει ένας έλεγχος όταν συμβεί κάτι τέτοιο.',
        en: 'Marriage, a child, a new job or a loan may change what this policy needs to do. It is worth a review when something like that happens.',
    },
    actionLabel: { el: 'Άνοιξε το συμβόλαιο', en: 'Open the policy' },
    target: 'policy',
}

export const SELF_TASK_SPECS: Record<string, SelfTaskSpec> = {
    motor_save_emergency_line: SAVE_EMERGENCY_LINE,
    motorbike_save_emergency_line: SAVE_EMERGENCY_LINE,
    home_save_emergency_line: SAVE_EMERGENCY_LINE,
    health_save_emergency_line: SAVE_EMERGENCY_LINE,

    life_note_life_change: NOTE_LIFE_CHANGE,
    income_protection_note_life_change: NOTE_LIFE_CHANGE,
    personal_accident_note_life_change: NOTE_LIFE_CHANGE,
}

export function getSelfTaskSpec(actionId: string): SelfTaskSpec | undefined {
    return SELF_TASK_SPECS[actionId]
}
