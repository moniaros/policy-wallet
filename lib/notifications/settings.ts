/**
 * Global notification settings — the kill switches, channel toggles, thresholds
 * and feature flags that are not per-event.
 *
 * Every key is DECLARED here with a type, a default, bounds and a description.
 * The storage is key/value (so a new dial needs no migration), but the contract
 * is not: a value is validated against its declaration before it is written,
 * and the admin UI is generated from this list rather than hand-maintained.
 * That is what stops a key/value settings table from decaying into a bag of
 * untyped strings nobody dares change.
 *
 * The DEFAULT here is the behaviour with an empty settings table, and it is
 * always the behaviour the code shipped with. An operator who has never opened
 * the admin console gets exactly what the registry describes.
 */

export type SettingType = "boolean" | "number"

export interface SettingDefinition {
    key: string
    type: SettingType
    /** The value when nothing is stored — i.e. what the code ships with. */
    default: boolean | number
    /** Which admin group this appears under. */
    group: "automation" | "channels" | "thresholds" | "flags"
    label: { el: string; en: string }
    description: { el: string; en: string }
    /** Numbers only. Inclusive. */
    min?: number
    max?: number
    unit?: string
    /**
     * Turning this ON is the safe direction. Used by the UI to warn before a
     * change that stops notifications reaching people, rather than relying on
     * an operator to know which way is dangerous.
     */
    dangerousWhen?: "true" | "false"
}

export const NOTIFICATION_SETTINGS: SettingDefinition[] = [
    // ── Automation ───────────────────────────────────────────────────────────
    {
        key: "automation.paused",
        type: "boolean",
        default: false,
        group: "automation",
        label: { el: "Παύση όλων των αυτοματισμών", en: "Pause all automations" },
        description: {
            el: "Σταματά κάθε ειδοποίηση σε όλα τα κανάλια. Τα γεγονότα καταγράφονται ως «σε παύση», ώστε να φαίνεται τι δεν στάλθηκε.",
            en: "Stops every notification on every channel. Events are still recorded as paused, so what did not go out is visible.",
        },
        dangerousWhen: "true",
    },
    {
        key: "automation.retryEnabled",
        type: "boolean",
        default: true,
        group: "automation",
        label: { el: "Επανάληψη αποτυχημένων παραδόσεων", en: "Retry failed deliveries" },
        description: {
            el: "Όταν είναι ανενεργό, μια αποτυχημένη ειδοποίηση παραμένει αποτυχημένη και δεν ξαναδοκιμάζεται.",
            en: "When off, a failed notification stays failed and is never re-attempted.",
        },
        dangerousWhen: "false",
    },
    {
        key: "automation.escalationEnabled",
        type: "boolean",
        default: true,
        group: "automation",
        label: { el: "Κλιμάκωση σε διαχειριστές", en: "Escalate to administrators" },
        description: {
            el: "Ειδοποιεί τους διαχειριστές όταν μια ειδοποίηση αποτυγχάνει επανειλημμένα.",
            en: "Notifies administrators when a notification keeps failing.",
        },
        dangerousWhen: "false",
    },
    {
        key: "automation.retryBatchSize",
        type: "number",
        default: 200,
        min: 10,
        max: 2000,
        group: "automation",
        label: { el: "Μέγεθος παρτίδας επανάληψης", en: "Retry batch size" },
        description: {
            el: "Πόσες εγγραφές επεξεργάζεται μία εκτέλεση. Αναφέρεται πάντα τι έμεινε πίσω.",
            en: "How many rows one sweep processes. What is left over is always reported, never silently dropped.",
        },
    },

    // ── Channels ─────────────────────────────────────────────────────────────
    {
        key: "channel.in_app.enabled",
        type: "boolean",
        default: true,
        group: "channels",
        label: { el: "Κανάλι: εντός εφαρμογής", en: "Channel: in-app" },
        description: {
            el: "Το καμπανάκι και το κέντρο ειδοποιήσεων.",
            en: "The bell and the notification centre.",
        },
        dangerousWhen: "false",
    },
    {
        key: "channel.email.enabled",
        type: "boolean",
        default: true,
        group: "channels",
        label: { el: "Κανάλι: email", en: "Channel: email" },
        description: {
            el: "Απενεργοποιεί κάθε email ειδοποίησης, συμπεριλαμβανομένων των συναλλακτικών.",
            en: "Disables every notification email, including transactional ones.",
        },
        dangerousWhen: "false",
    },
    {
        key: "channel.push.enabled",
        type: "boolean",
        default: true,
        group: "channels",
        label: { el: "Κανάλι: push", en: "Channel: push" },
        description: {
            el: "Ανεξάρτητο από τη ρύθμιση VAPID: χωρίς κλειδιά το κανάλι είναι έτσι κι αλλιώς μη διαθέσιμο.",
            en: "Independent of VAPID configuration — without keys the channel is unavailable regardless.",
        },
        dangerousWhen: "false",
    },

    // ── Thresholds ───────────────────────────────────────────────────────────
    {
        key: "threshold.scoreMateriality",
        type: "number",
        default: 5,
        min: 1,
        max: 50,
        unit: "points",
        group: "thresholds",
        label: { el: "Ουσιώδης μεταβολή σκορ προστασίας", en: "Protection score materiality" },
        description: {
            el: "Πόσο πρέπει να κινηθεί το σκορ πριν ειδοποιηθεί ο πελάτης. Μια μονάδα είναι αριθμητική, όχι είδηση.",
            en: "How far the score must move before the customer is told. One point is arithmetic, not news.",
        },
    },
    {
        key: "threshold.maxGapsPerNotification",
        type: "number",
        default: 1,
        min: 1,
        max: 20,
        group: "thresholds",
        label: { el: "Κενά ανά ειδοποίηση", en: "Gaps named per notification" },
        description: {
            el: "Πόσα κενά ονομάζονται πριν η ειδοποίηση συνοψίσει σε «και N ακόμη».",
            en: "How many gaps are named before the notification summarises as \"and N more\".",
        },
    },
    {
        key: "threshold.riskChangeNotifyEnabled",
        type: "boolean",
        default: true,
        group: "thresholds",
        label: { el: "Ειδοποίηση για μεταβολές κινδύνου", en: "Notify on risk-level changes" },
        description: {
            el: "Μεταβολές πέραν του ανοίγματος νέου κενού — κλείσιμο κινδύνου, απώλεια κάλυψης, αλλαγή προτεραιότητας.",
            en: "Movement other than a new gap opening — a risk closing, cover lost, a priority change.",
        },
    },

    // ── Orchestration ────────────────────────────────────────────────────────
    {
        key: "orchestrator.quietHoursEnabled",
        type: "boolean",
        default: true,
        group: "automation",
        label: { el: "Ώρες ησυχίας", en: "Quiet hours" },
        description: {
            el: "Καθυστερεί τις μη επείγουσες ειδοποιήσεις τη νύχτα αντί να τις ακυρώνει. Οι επείγουσες περνούν πάντα.",
            en: "Defers non-urgent notifications overnight rather than cancelling them. Urgent ones always go through.",
        },
        dangerousWhen: "false",
    },
    {
        key: "orchestrator.rateLimitEnabled",
        type: "boolean",
        default: true,
        group: "automation",
        label: { el: "Ημερήσιο όριο ειδοποιήσεων", en: "Daily notification cap" },
        description: {
            el: "Καθυστερεί —δεν ακυρώνει— ό,τι υπερβαίνει το ημερήσιο όριο του χρήστη.",
            en: "Defers — never drops — anything past a user's daily cap. A runaway job reaching someone forty times is worse than the job.",
        },
        dangerousWhen: "false",
    },
    {
        key: "orchestrator.defaultMaxPerDay",
        type: "number",
        default: 12,
        min: 1,
        max: 200,
        group: "automation",
        label: { el: "Προεπιλογή ορίου ανά ημέρα", en: "Default cap per day" },
        description: {
            el: "Για πελάτες που δεν έχουν ορίσει δικό τους όριο. Οι σύμβουλοι έχουν υψηλότερο προεπιλεγμένο.",
            en: "For customers who have not set their own. Advisors default higher — a book of clients legitimately generates more than one person's life does.",
        },
    },

    // ── Feature flags ────────────────────────────────────────────────────────
    {
        key: "flag.templatesEnabled",
        type: "boolean",
        default: true,
        group: "flags",
        label: { el: "Χρήση προτύπων διαχειριστή", en: "Use admin templates" },
        description: {
            el: "Όταν είναι ανενεργό, αγνοούνται τα πρότυπα και χρησιμοποιείται το κείμενο του κώδικα. Ο ασφαλής διακόπτης αν ένα πρότυπο βγει λάθος.",
            en: "When off, templates are ignored and the code's own copy is used. The safety switch if a template goes wrong.",
        },
    },
    {
        key: "flag.testSendEnabled",
        type: "boolean",
        default: true,
        group: "flags",
        label: { el: "Δοκιμαστικές αποστολές", en: "Allow test sends" },
        description: {
            el: "Επιτρέπει σε διαχειριστή να στείλει δοκιμαστική ειδοποίηση στον ΕΑΥΤΟ του. Ποτέ σε άλλον χρήστη.",
            en: "Lets an administrator send a test notification to THEMSELVES. Never to another user.",
        },
    },
]

export const SETTINGS_BY_KEY: Record<string, SettingDefinition> = Object.fromEntries(
    NOTIFICATION_SETTINGS.map((s) => [s.key, s])
)

export type SettingsMap = Record<string, boolean | number>

/** Every declared key at its default — the behaviour of an empty table. */
export function defaultSettings(): SettingsMap {
    const out: SettingsMap = {}
    for (const s of NOTIFICATION_SETTINGS) out[s.key] = s.default
    return out
}

export interface SettingValidation {
    ok: boolean
    value?: boolean | number
    error?: string
}

/**
 * Validate a raw value against its declaration.
 *
 * Rejects rather than coerces. A settings table that silently turns "yes" into
 * `true`, or an out-of-range number into a clamped one, is a table whose stored
 * value differs from what the operator believes they set.
 */
export function validateSetting(key: string, raw: unknown): SettingValidation {
    const def = SETTINGS_BY_KEY[key]
    if (!def) return { ok: false, error: `Unknown setting "${key}"` }

    if (def.type === "boolean") {
        if (typeof raw !== "boolean") return { ok: false, error: `${key} must be true or false` }
        return { ok: true, value: raw }
    }

    if (typeof raw !== "number" || !Number.isFinite(raw)) {
        return { ok: false, error: `${key} must be a number` }
    }
    if (!Number.isInteger(raw)) return { ok: false, error: `${key} must be a whole number` }
    if (def.min !== undefined && raw < def.min) {
        return { ok: false, error: `${key} must be at least ${def.min}` }
    }
    if (def.max !== undefined && raw > def.max) {
        return { ok: false, error: `${key} must be at most ${def.max}` }
    }
    return { ok: true, value: raw }
}

/** Read one setting from a map, falling back to its declared default. */
export function settingValue<T extends boolean | number>(map: SettingsMap, key: string): T {
    const def = SETTINGS_BY_KEY[key]
    const stored = map[key]
    if (stored === undefined || stored === null) return (def?.default ?? false) as T
    return stored as T
}
