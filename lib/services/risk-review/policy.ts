/**
 * When does the platform ask a customer to review their risk?
 *
 * ## The distinction the whole design rests on
 *
 * **Recalculation is automatic, continuous and silent.** The gap engine already
 * reruns on every material change — an upload, a life event, a questionnaire, a
 * nightly sweep — and publishes derived events when the result actually moves.
 *
 * **A review is a human checkpoint.** It is the far rarer moment where we stop
 * and ask the customer to look at what we concluded and confirm or correct the
 * life it was computed from.
 *
 * Conflating the two is the obvious mistake, and it is why this file exists.
 * If every coverage gap opened a review, a review would become the thing people
 * dismiss without reading — the same failure as a list where everything is
 * urgent. So most triggers here recalculate and say nothing; only a few are
 * worth interrupting someone for.
 *
 * ## Answering the five questions
 *
 * For each trigger this declares: does a review start, does AI recalculate, is
 * the advisor told, does the customer get guidance, and can the protection
 * score move. They are genuinely independent — a birthday moves the score
 * without needing an advisor, and an advisor assignment starts a review without
 * moving the score at all.
 */

export type ReviewTrigger =
    // Life
    | "life_event"
    | "child_born"
    | "marriage"
    | "divorce"
    | "mortgage_added"
    | "property_purchased"
    | "business_started"
    | "travel_increased"
    // Portfolio
    | "policy_uploaded"
    | "policy_renewal"
    | "claim"
    // Derived
    | "protection_score_drop"
    | "coverage_gap"
    | "ai_confidence_drop"
    // Relationship
    | "questionnaire_update"
    | "customer_inactivity"
    | "advisor_assignment"
    // Periodic
    | "annual"
    | "quarterly"
    | "birthday"

export interface ReviewPolicy {
    trigger: ReviewTrigger
    label: { el: string; en: string }
    /** Does this open a customer-facing review? */
    startsReview: boolean
    /** Does the risk engine rerun? */
    recalculates: boolean
    /** Is the advisor told or given work? */
    notifiesAdvisor: boolean
    /** Does the customer get guidance — a notification with something to do? */
    guidesCustomer: boolean
    /** Can the protection score move as a result? */
    movesScore: boolean
    /** Days the customer has to complete it. */
    dueInDays: number
    /**
     * Reviews of the SAME or lower weight are suppressed for this many days
     * after one opens. Without it a busy fortnight — an upload, a life event and
     * a renewal — would produce three reviews for one conversation.
     */
    cooldownDays: number
    /**
     * Higher wins when two triggers collide. An annual review superseded by a
     * child being born is correct; the reverse is not.
     */
    weight: number
    /**
     * What the CUSTOMER is told the review opened for. The dashboard rendered
     * `rationale` here for months — an engineer's note in English («this is a
     * hard time, not a sales moment») under «Άνοιξε επειδή» on a Greek page.
     */
    reason: { el: string; en: string }
    /** Why this policy is what it is. Shown in the admin console. */
    rationale: string
}

const policy = (p: ReviewPolicy) => p

export const REVIEW_POLICIES: Record<ReviewTrigger, ReviewPolicy> = {
    // ── Life events ──────────────────────────────────────────────────────────
    //
    // The strongest signals the product ever gets. A customer telling us their
    // life changed is also telling us the rest of what we hold may be stale, so
    // these are the clearest case for asking them to look.

    life_event: policy({
        trigger: "life_event",
        label: { el: "Αλλαγή στη ζωή σας", en: "A change in your life" },
        startsReview: true,
        recalculates: true,
        notifiesAdvisor: true,
        guidesCustomer: true,
        movesScore: true,
        dueInDays: 14,
        cooldownDays: 7,
        weight: 70,
        reason: {
            el: "Δηλώσατε μια αλλαγή στη ζωή σας — συνήθως σημαίνει ότι κάτι στα ασφαλιστήριά σας δεν ταιριάζει πια.",
            en: "You told us something changed in your life — that usually means something in your cover no longer fits.",
        },
        rationale:
            "A declared life change is the strongest signal we get, and it usually means more than one fact is now out of date.",
    }),

    child_born: policy({
        trigger: "child_born",
        label: { el: "Γέννηση παιδιού", en: "A child was born" },
        startsReview: true,
        recalculates: true,
        notifiesAdvisor: true,
        guidesCustomer: true,
        movesScore: true,
        dueInDays: 30,
        cooldownDays: 14,
        weight: 95,
        reason: {
            el: "Ένα παιδί αλλάζει περισσότερο από οτιδήποτε άλλο το τι χρειάζεται προστασία. Δεν υπάρχει βιασύνη — γι' αυτό το περιθώριο είναι μεγάλο.",
            en: "A child changes what needs protecting more than anything else. No rush — that is why the window is generous.",
        },
        rationale:
            "The single largest change to a household's protection need, and one where the customer has other things on their mind — so the window is generous.",
    }),

    marriage: policy({
        trigger: "marriage",
        label: { el: "Γάμος", en: "Marriage" },
        startsReview: true,
        recalculates: true,
        notifiesAdvisor: true,
        guidesCustomer: true,
        movesScore: true,
        dueInDays: 30,
        cooldownDays: 14,
        weight: 85,
        reason: {
            el: "Δύο ζωές γίνονται μία: δικαιούχοι, κοινές υποχρεώσεις και διπλές καλύψεις αλλάζουν ταυτόχρονα.",
            en: "Two lives become one: beneficiaries, joint commitments and duplicate cover all change at once.",
        },
        rationale:
            "Two financial lives become one; beneficiaries, joint liabilities and duplicate cover all change at once.",
    }),

    divorce: policy({
        trigger: "divorce",
        label: { el: "Διαζύγιο", en: "Divorce" },
        startsReview: true,
        recalculates: true,
        // Handled with care: an advisor is offered, not imposed. Some people
        // want help here and some very much do not.
        notifiesAdvisor: true,
        guidesCustomer: true,
        movesScore: true,
        dueInDays: 45,
        cooldownDays: 21,
        weight: 85,
        reason: {
            el: "Δικαιούχοι και κοινά ασφαλιστήρια συχνά αναφέρουν ακόμη τον ή την πρώην σύντροφο. Με την ησυχία σας — δεν βιάζεται τίποτα.",
            en: "Beneficiaries and joint policies often still name a former partner. In your own time — nothing is urgent.",
        },
        rationale:
            "Beneficiaries and joint policies often still name a former partner. A long window and gentle framing: this is a hard time, not a sales moment.",
    }),

    mortgage_added: policy({
        trigger: "mortgage_added",
        label: { el: "Νέο στεγαστικό δάνειο", en: "A mortgage was added" },
        startsReview: true,
        recalculates: true,
        notifiesAdvisor: true,
        guidesCustomer: true,
        movesScore: true,
        dueInDays: 21,
        cooldownDays: 14,
        weight: 80,
        reason: {
            el: "Ένα δάνειο που συνεχίζει και χωρίς το εισόδημα είναι η πιο συνηθισμένη ακάλυπτη έκθεση — και μόλις δημιουργήθηκε.",
            en: "A debt that continues without the income is the most common uncovered exposure — and it was just created.",
        },
        rationale:
            "A debt that outlives the borrower is the textbook uncovered exposure, and it is newly created at a known moment.",
    }),

    property_purchased: policy({
        trigger: "property_purchased",
        label: { el: "Αγορά ακινήτου", en: "A property was purchased" },
        startsReview: true,
        recalculates: true,
        notifiesAdvisor: true,
        guidesCustomer: true,
        movesScore: true,
        dueInDays: 21,
        cooldownDays: 14,
        weight: 80,
        reason: {
            el: "Ένα νέο ακίνητο συχνά μένει για λίγο χωρίς κάλυψη — και η κάλυψη σεισμού είναι αυτό που οι περισσότεροι θεωρούν δεδομένο.",
            en: "A new property often goes without cover for a while — and earthquake cover is the thing most people assume they have.",
        },
        rationale:
            "A new property is usually uninsured for a window, and in Greece earthquake cover is the specific thing people assume they have.",
    }),

    business_started: policy({
        trigger: "business_started",
        label: { el: "Έναρξη επιχείρησης", en: "A business was started" },
        startsReview: true,
        recalculates: true,
        notifiesAdvisor: true,
        guidesCustomer: true,
        movesScore: true,
        dueInDays: 30,
        cooldownDays: 14,
        weight: 75,
        reason: {
            el: "Μια δική σας επιχείρηση ανοίγει εκθέσεις — ευθύνη, εργοδότη, διακοπή εργασιών — που ένα προσωπικό χαρτοφυλάκιο δεν καλύπτει.",
            en: "A business of your own opens exposures — liability, employer, interruption — that a personal portfolio never covers.",
        },
        rationale:
            "Opens a whole class of exposure — liability, employer, interruption — that a personal portfolio never covers.",
    }),

    travel_increased: policy({
        trigger: "travel_increased",
        label: { el: "Αυξημένα ταξίδια", en: "More frequent travel" },
        // Recalculates, but does not interrupt: it changes one exposure, not
        // the shape of someone's life.
        startsReview: false,
        recalculates: true,
        notifiesAdvisor: false,
        guidesCustomer: true,
        movesScore: true,
        dueInDays: 30,
        cooldownDays: 30,
        weight: 30,
        reason: {
            el: "Αλλάζει μία έκθεση, όχι όλη η εικόνα — το εύρημα μιλάει από μόνο του.",
            en: "One exposure changes, not the whole picture — the finding speaks for itself.",
        },
        rationale:
            "A real exposure change, but a narrow one. The finding speaks for itself; a whole review would be disproportionate.",
    }),

    // ── Portfolio ────────────────────────────────────────────────────────────

    policy_uploaded: policy({
        trigger: "policy_uploaded",
        label: { el: "Νέο ασφαλιστήριο", en: "A policy was added" },
        // Deliberately NOT a review. The customer just acted; the findings ARE
        // the response. Asking them to review immediately after they gave us
        // something would read as us not having looked.
        startsReview: false,
        recalculates: true,
        notifiesAdvisor: false,
        guidesCustomer: true,
        movesScore: true,
        dueInDays: 0,
        cooldownDays: 0,
        weight: 20,
        reason: {
            el: "Μόλις προσθέσατε ένα ασφαλιστήριο — η ανάλυσή του είναι η απάντηση.",
            en: "You just added a policy — its analysis is the answer.",
        },
        rationale:
            "The customer just acted and the analysis is the answer. A review here would be asking them to check our homework.",
    }),

    policy_renewal: policy({
        trigger: "policy_renewal",
        label: { el: "Ανανέωση ασφαλιστηρίου", en: "A policy is up for renewal" },
        // The natural checkpoint in insurance: the one moment a customer is
        // already thinking about cover and can act without friction.
        startsReview: true,
        recalculates: true,
        notifiesAdvisor: true,
        guidesCustomer: true,
        movesScore: false,
        dueInDays: 21,
        cooldownDays: 30,
        weight: 60,
        reason: {
            el: "Η ανανέωση είναι η στιγμή που ήδη αποφασίζετε για την κάλυψή σας — η καλύτερη στιγμή για μια ματιά.",
            en: "Renewal is the moment you are already deciding about your cover — the best moment to look.",
        },
        rationale:
            "The industry's own checkpoint. The customer is already deciding about cover, so the cost of asking them to look is at its lowest.",
    }),

    claim: policy({
        trigger: "claim",
        label: { el: "Απαίτηση", en: "A claim" },
        startsReview: true,
        recalculates: true,
        notifiesAdvisor: true,
        guidesCustomer: true,
        movesScore: true,
        dueInDays: 30,
        cooldownDays: 0,
        weight: 100,
        reason: {
            el: "Μια απαίτηση δείχνει αν η κάλυψη ήταν επαρκής — η μόνη πραγματική ανατροφοδότηση.",
            en: "A claim shows whether cover was adequate — the only real feedback there is.",
        },
        rationale:
            "The moment insurance stops being theoretical. A claim reveals whether cover was adequate — the only real feedback the model ever gets. NOT WIRED: the product has no claims model.",
    }),

    // ── Derived ──────────────────────────────────────────────────────────────

    protection_score_drop: policy({
        trigger: "protection_score_drop",
        label: { el: "Πτώση σκορ προστασίας", en: "Your protection dropped" },
        // Only a band crossing, never ordinary drift — the notification already
        // covers movement, and a review for every dip would be constant.
        startsReview: true,
        recalculates: false,
        notifiesAdvisor: true,
        guidesCustomer: true,
        movesScore: false,
        dueInDays: 14,
        cooldownDays: 30,
        weight: 55,
        reason: {
            el: "Η προστασία σας έπεσε στο χαμηλότερο επίπεδο — αξίζει μια ματιά, όχι ανησυχία.",
            en: "Your protection fell into the lowest band — worth a look, not alarm.",
        },
        rationale:
            "Reserved for a fall into the lowest band. Ordinary movement is already notified; a review for every dip would be a review nobody reads.",
    }),

    coverage_gap: policy({
        trigger: "coverage_gap",
        label: { el: "Κενό κάλυψης", en: "A coverage gap" },
        // Critical only. Gaps open routinely as we learn more, and a review per
        // gap would arrive weekly.
        startsReview: true,
        recalculates: false,
        notifiesAdvisor: true,
        guidesCustomer: true,
        movesScore: false,
        dueInDays: 14,
        cooldownDays: 21,
        weight: 50,
        reason: {
            el: "Εντοπίστηκε ένα κρίσιμο σημείο — ένα από τα λίγα που αξίζουν δική τους ματιά.",
            en: "A critical point was found — one of the few that earn a look of their own.",
        },
        rationale:
            "Critical severity only. Gaps open routinely as the picture fills in; a review for each would arrive weekly and be ignored.",
    }),

    ai_confidence_drop: policy({
        trigger: "ai_confidence_drop",
        label: { el: "Χαμηλή βεβαιότητα ανάγνωσης", en: "We could not read a policy confidently" },
        // NOT a risk review. This is our problem, not the customer's life
        // changing — the fix is a human reading the document, not the customer
        // re-examining their circumstances.
        startsReview: false,
        recalculates: false,
        notifiesAdvisor: true,
        guidesCustomer: true,
        movesScore: false,
        dueInDays: 0,
        cooldownDays: 0,
        weight: 15,
        reason: {
            el: "Δεν καταφέραμε να διαβάσουμε καλά ένα έγγραφο — αυτό είναι δική μας δουλειά, όχι δική σας.",
            en: "We could not read a document well — that is our job to fix, not yours.",
        },
        rationale:
            "Our reading failed, not their circumstances. The work belongs to a human reviewing the extraction, not to the customer reviewing their life.",
    }),

    // ── Relationship ─────────────────────────────────────────────────────────

    questionnaire_update: policy({
        trigger: "questionnaire_update",
        label: { el: "Ενημέρωση ερωτηματολογίου", en: "You updated your answers" },
        startsReview: false,
        recalculates: true,
        notifiesAdvisor: true,
        guidesCustomer: true,
        movesScore: true,
        dueInDays: 0,
        cooldownDays: 0,
        weight: 25,
        reason: {
            el: "Μόλις ενημερώσατε τα στοιχεία σας — δεν χρειάζεται να το κάνετε δύο φορές.",
            en: "You just updated your details — no need to do it twice.",
        },
        rationale:
            "The customer has just reviewed their own facts. Opening a review moments later would ask them to do it twice.",
    }),

    customer_inactivity: policy({
        trigger: "customer_inactivity",
        label: { el: "Καιρό χωρίς έλεγχο", en: "It has been a while" },
        startsReview: true,
        recalculates: true,
        notifiesAdvisor: true,
        guidesCustomer: true,
        movesScore: true,
        dueInDays: 30,
        cooldownDays: 90,
        weight: 40,
        reason: {
            el: "Πέρασε καιρός από την τελευταία σας επίσκεψη — η εικόνα σας μπορεί να μην είναι πια επίκαιρη.",
            en: "It has been a while since your last visit — your picture may no longer be current.",
        },
        rationale:
            "A long absence means the picture is stale by default. A review is a better re-engagement than a marketing email because it has a point.",
    }),

    advisor_assignment: policy({
        trigger: "advisor_assignment",
        label: { el: "Νέος σύμβουλος", en: "You connected with an advisor" },
        startsReview: true,
        recalculates: false,
        notifiesAdvisor: true,
        guidesCustomer: true,
        movesScore: false,
        dueInDays: 21,
        cooldownDays: 30,
        weight: 45,
        reason: {
            el: "Συνδεθήκατε με σύμβουλο — μια κοινή αφετηρία βοηθά τη συζήτηση να ξεκινήσει από την εικόνα σας, όχι από το μηδέν.",
            en: "You connected with an advisor — a shared starting point lets the conversation begin from your picture, not from scratch.",
        },
        rationale:
            "An advisor's first job is to understand the customer. A review gives that conversation a shared starting point instead of a blank page.",
    }),

    // ── Periodic ─────────────────────────────────────────────────────────────

    annual: policy({
        trigger: "annual",
        label: { el: "Ετήσιος έλεγχος", en: "Your annual review" },
        startsReview: true,
        recalculates: true,
        notifiesAdvisor: true,
        guidesCustomer: true,
        movesScore: true,
        dueInDays: 30,
        cooldownDays: 60,
        weight: 65,
        reason: {
            el: "Πέρασε ένας χρόνος — η ζωή αλλάζει και χωρίς να το δηλώσει κανείς. Μια ματιά τον χρόνο αρκεί.",
            en: "A year has passed — life changes without anyone declaring it. One look a year is enough.",
        },
        rationale:
            "The backstop. Lives change without anyone declaring it, and once a year is the cadence people accept without resentment.",
    }),

    quarterly: policy({
        trigger: "quarterly",
        label: { el: "Τριμηνιαίος έλεγχος", en: "A quarterly check" },
        // Only when the picture is genuinely thin. A quarterly review for a
        // complete profile is a reminder that nothing has changed, which is the
        // fastest way to teach someone to ignore reviews.
        startsReview: true,
        recalculates: true,
        notifiesAdvisor: false,
        guidesCustomer: true,
        movesScore: true,
        dueInDays: 21,
        cooldownDays: 60,
        weight: 35,
        reason: {
            el: "Ξέρουμε ακόμη λίγα για την κατάστασή σας — λίγες απαντήσεις ακόμη κάνουν την εικόνα σας πιο αξιόπιστη.",
            en: "We still know little about your situation — a few more answers make your picture more reliable.",
        },
        rationale:
            "Only for customers whose assessment coverage is too thin to score honestly. Quarterly prompts to a complete profile would train people to dismiss them.",
    }),

    birthday: policy({
        trigger: "birthday",
        label: { el: "Γενέθλια", en: "A year older" },
        // Age is a declared risk factor: `age` gates two risks and refines four
        // more. Without this, an assessment quietly goes stale with every
        // birthday and nothing recomputes it.
        startsReview: true,
        recalculates: true,
        notifiesAdvisor: false,
        guidesCustomer: true,
        movesScore: true,
        dueInDays: 30,
        cooldownDays: 180,
        weight: 45,
        reason: {
            el: "Μια νέα δεκαετία αλλάζει τι έχει σημασία να προστατέψετε — και τι κοστίζει.",
            en: "A new decade changes what matters to protect — and what it costs.",
        },
        rationale:
            "Age gates two risks and refines four more, so an assessment silently goes stale every year. Only opened on a decade boundary — most birthdays change nothing material.",
    }),
}

export const REVIEW_TRIGGERS = Object.keys(REVIEW_POLICIES) as ReviewTrigger[]

export function getReviewPolicy(trigger: string): ReviewPolicy | null {
    return REVIEW_POLICIES[trigger as ReviewTrigger] ?? null
}

/** Triggers that open a customer-facing review. */
export function reviewOpeningTriggers(): ReviewPolicy[] {
    return Object.values(REVIEW_POLICIES).filter((p) => p.startsReview)
}

/**
 * Map a life-event definition id to its review trigger.
 *
 * The registry's ids are the vocabulary the product already speaks; this keeps
 * the big four (birth, marriage, divorce, mortgage) distinguishable from the
 * generic `life_event`, because they deserve different windows and different
 * words.
 */
export function triggerForLifeEvent(definitionId: string): ReviewTrigger {
    switch (definitionId) {
        case "birth":
            return "child_born"
        case "marriage":
            return "marriage"
        case "divorce":
            return "divorce"
        case "mortgage":
            return "mortgage_added"
        case "property_purchase":
            return "property_purchased"
        case "business_creation":
            return "business_started"
        case "travel_frequency_increase":
            return "travel_increased"
        default:
            return "life_event"
    }
}
