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
