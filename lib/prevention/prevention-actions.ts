/**
 * Prevention actions — the part of the product that is useful when nothing has
 * gone wrong.
 *
 * Everything else here is reactive: a policy is analysed, gaps are reported,
 * a renewal approaches. None of it gives a policyholder a reason to open the
 * app in an ordinary week, which is what "used daily" actually requires.
 *
 * These are seasonal, line-of-business-matched things a person can DO to lower
 * the chance of a claim — check the boiler before winter, photograph the car
 * before renewal. They are deliberately NOT offers: nothing is sold, so this
 * can be shown without the tone shifting to selling.
 *
 * Design constraints, kept on purpose:
 *  - **Static content, no schema change.** Partner offers live in the database
 *    because a partner negotiates them. Prevention advice is editorial: it
 *    changes when we learn something, not when a contract is signed. Putting it
 *    in code keeps it reviewable in a diff and adds no migration.
 *  - **No new cron and no new cache.** Matching is a pure function; the surface
 *    that shows a card calls it. The existing perk-reminders job can carry a
 *    nudge without becoming a second scheduler.
 *  - **Honest when empty.** If nothing matches the person and the month,
 *    nothing renders. A padded list would train people to ignore the surface.
 */

export type PreventionSeason = "winter" | "spring" | "summer" | "autumn" | "any"

export interface PreventionAction {
    slug: string
    /** Lines of business this is relevant to; empty means everyone. */
    lobs: string[]
    season: PreventionSeason
    title: { el: string; en: string }
    body: { el: string; en: string }
}

/**
 * Greek-market specific and deliberately small. Each entry has to earn its
 * place by being something the reader can act on this week.
 */
export const PREVENTION_ACTIONS: PreventionAction[] = [
    {
        slug: "home-winter-pipes",
        lobs: ["home"],
        season: "winter",
        title: {
            el: "Ελέγξτε σωληνώσεις και θέρμανση πριν τον χειμώνα",
            en: "Check pipes and heating before winter",
        },
        body: {
            el: "Οι ζημιές από νερά είναι από τις συχνότερες αξιώσεις κατοικίας. Ένας έλεγχος σε σωληνώσεις, λέβητα και μονώσεις πριν πέσει η θερμοκρασία κοστίζει ελάχιστα σε σχέση με μια πλημμύρα.",
            en: "Water damage is among the most common home claims. Checking pipes, boiler and insulation before the temperature drops costs very little next to a flood.",
        },
    },
    {
        slug: "home-storm-balcony",
        lobs: ["home"],
        season: "autumn",
        title: {
            el: "Ασφαλίστε ό,τι μπορεί να παρασυρθεί",
            en: "Secure anything that can be blown away",
        },
        body: {
            el: "Τέντες, γλάστρες και έπιπλα μπαλκονιού προκαλούν ζημιά σε τρίτους σε κακοκαιρία — και η ευθύνη μπορεί να βαρύνει εσάς. Μισή ώρα πριν την πρώτη καταιγίδα αρκεί.",
            en: "Awnings, planters and balcony furniture cause third-party damage in a storm, and the liability can be yours. Half an hour before the first storm is enough.",
        },
    },
    {
        slug: "motor-pre-renewal-photos",
        lobs: ["motor", "motorbike"],
        season: "any",
        title: {
            el: "Φωτογραφίστε το όχημα πριν την ανανέωση",
            en: "Photograph your vehicle before renewal",
        },
        body: {
            el: "Καθαρές φωτογραφίες με ημερομηνία, από τέσσερις πλευρές, λύνουν τις περισσότερες διαφωνίες για προϋπάρχουσα ζημιά σε μελλοντική αξίωση. Δύο λεπτά τώρα, πολλή ταλαιπωρία λιγότερη μετά.",
            en: "Clear, dated photos from four sides settle most disputes about pre-existing damage in a future claim. Two minutes now, far less trouble later.",
        },
    },
    {
        slug: "motor-summer-tyres",
        lobs: ["motor", "motorbike"],
        season: "summer",
        title: {
            el: "Ελέγξτε ελαστικά και ψυκτικό πριν τα ταξίδια",
            en: "Check tyres and coolant before long drives",
        },
        body: {
            el: "Η ζέστη και οι μεγάλες αποστάσεις καταπονούν ελαστικά και ψυκτικό. Ο έλεγχος πίεσης και βάθους πέλματος είναι δωρεάν στα περισσότερα πρατήρια.",
            en: "Heat and long distances punish tyres and coolant. Pressure and tread-depth checks are free at most filling stations.",
        },
    },
    {
        slug: "health-annual-checkup",
        lobs: ["health"],
        season: "any",
        title: {
            el: "Κλείστε τον ετήσιο προληπτικό έλεγχο",
            en: "Book your annual preventive check-up",
        },
        body: {
            el: "Πολλά ασφαλιστήρια υγείας καλύπτουν προληπτικές εξετάσεις που οι περισσότεροι δεν χρησιμοποιούν ποτέ. Αξίζει να δείτε τι δικαιούστε φέτος.",
            en: "Many health policies cover preventive screening that most people never use. It is worth checking what you are entitled to this year.",
        },
    },
    {
        slug: "health-heatwave",
        lobs: ["health"],
        season: "summer",
        title: {
            el: "Προσοχή στον καύσωνα",
            en: "Take heatwaves seriously",
        },
        body: {
            el: "Οι εισαγωγές λόγω θερμοπληξίας κορυφώνονται κάθε καλοκαίρι και αφορούν δυσανάλογα ηλικιωμένους και χρόνιους ασθενείς. Ενυδάτωση, σκιά τις μεσημβρινές ώρες, έλεγχος φαρμάκων που επηρεάζονται από τη ζέστη.",
            en: "Heat-related admissions peak every summer and fall disproportionately on older and chronically ill people. Hydration, shade in the middle of the day, and a check of medicines affected by heat.",
        },
    },
]

const MONTH_TO_SEASON: PreventionSeason[] = [
    "winter", "winter", "spring", "spring", "spring", "summer",
    "summer", "summer", "autumn", "autumn", "autumn", "winter",
]

/** Northern-hemisphere season for a month index (0-11). */
export function seasonForMonth(monthIndex: number): PreventionSeason {
    return MONTH_TO_SEASON[monthIndex] ?? "any"
}

/**
 * Actions relevant to the lines of business a person actually holds, in the
 * current season. Sorted deterministically so the same week shows the same
 * card rather than shuffling on every render.
 *
 * @param heldLobs lines of business the person is insured for
 * @param now used for the season; injected so callers and tests agree
 */
export function matchPreventionActions(
    heldLobs: string[],
    now: Date
): PreventionAction[] {
    const season = seasonForMonth(now.getMonth())
    const held = new Set(heldLobs.map((l) => l.toLowerCase()))

    return PREVENTION_ACTIONS.filter((action) => {
        if (action.season !== "any" && action.season !== season) return false
        if (action.lobs.length === 0) return true
        return action.lobs.some((lob) => held.has(lob))
    }).sort((a, b) => a.slug.localeCompare(b.slug))
}

/**
 * The single action to surface this week, or null when nothing fits.
 *
 * Rotates by ISO week so a person is not shown the same card for three months,
 * and is a pure function of (holdings, date) — no stored state, and no
 * randomness that would make it untestable.
 */
export function preventionActionOfTheWeek(
    heldLobs: string[],
    now: Date
): PreventionAction | null {
    const matches = matchPreventionActions(heldLobs, now)
    if (matches.length === 0) return null

    const startOfYear = new Date(now.getFullYear(), 0, 1)
    const week = Math.floor((now.getTime() - startOfYear.getTime()) / (7 * 24 * 60 * 60 * 1000))
    return matches[week % matches.length]
}
