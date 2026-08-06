/**
 * The single source of truth for what PolicyWallet SAYS about itself on the
 * public site.
 *
 * Before this module the same claims were retyped on every marketing page, and
 * they had already drifted: the homepage led with "Gap Engine", /product led
 * with "intelligent wallet", /company led with "innovating digital trust".
 * Three answers to "what is this?" is the same as none.
 *
 * ── THE STORY ─────────────────────────────────────────────────────────────
 * Every page on the public site tells one story, in this order:
 *
 *     Life changes.
 *     Your risks change with it.
 *     Your insurance does not always keep up.
 *     PolicyWallet tells you whether you are still protected.
 *
 * and every page answers the same four questions in the same order:
 *
 *     What changed?    →  STORY.changed  /  LIFE_CHANGES
 *     Why care?        →  STORY.matters  /  WHY_NOW
 *     How do you help? →  STORY.helps    /  WHAT_WE_DO
 *     What do I do?    →  STORY.next     /  PRIMARY_ACTION
 *
 * Rules for anything added here:
 *  - Greek is written first; English must carry the IDENTICAL meaning, not a
 *    looser paraphrase.
 *  - Short sentences, concrete nouns, no jargon. If a sentence needs insurance
 *    knowledge to parse, it is wrong for this file.
 *  - Only claims we can defend. No invented metrics, no unsourced statistics,
 *    no testimonials. An absent proof point beats a fabricated one.
 *
 * Pure data (no JSX, no React) so server components, client components and
 * unit tests can all read it.
 */

export type MarketingLocale = "el" | "en"

/** A bilingual string. `el` is authoritative; `en` must mean the same thing. */
export type Bilingual = { el: string; en: string }

export function pick(value: Bilingual, locale: MarketingLocale): string {
    return locale === "el" ? value.el : value.en
}

/**
 * The category we are CREATING, by name. You cannot lead a category you do
 * not name: the label renders wherever a page states what PolicyWallet IS —
 * the hero badge, the sitewide footer identity line, the company kicker —
 * and CATEGORY below is its plain-language decode, always within one glance.
 * Must stay aligned with the definitional sentence in lib/seo/site.ts
 * («προσωπικής ανάλυσης ρίσκου» ↔ "personal risk intelligence").
 */
export const CATEGORY_NAME: Bilingual = {
    el: "Πλατφόρμα προσωπικής ανάλυσης ρίσκου",
    en: "Personal Risk Intelligence Platform",
}

/**
 * The category DECODE: what the label means, as a plain sentence a
 * non-expert understands in one breath. Renders next to CATEGORY_NAME
 * (footer identity line) and anywhere the plain claim carries alone.
 */
export const CATEGORY: Bilingual = {
    el: "Δεν πουλάμε ασφάλειες. Σας λέμε αν είστε καλυμμένοι.",
    en: "We do not sell insurance. We tell you if you are covered.",
}

/**
 * The four beats of the story, as sentences. Pages tell the beats through the
 * derived constants — LIFE_CHANGES for "changed", WHY_NOW for "matters",
 * WHAT_WE_DO for "helps", PRIMARY_ACTION for "next" — and may also render a
 * beat verbatim: the homepage renders `matters` word for word.
 */
export const STORY: Record<"changed" | "matters" | "helps" | "next", Bilingual> = {
    changed: {
        el: "Η ζωή σας αλλάζει.",
        en: "Your life changes.",
    },
    matters: {
        el: "Μαζί της αλλάζουν και τα ρίσκα σας. Η ασφάλειά σας όμως έμεινε εκεί που την αφήσατε.",
        en: "Your risks change with it. Your insurance stayed where you left it.",
    },
    helps: {
        el: "Το PolicyWallet διαβάζει τις ασφάλειές σας και σας λέει αν είστε ακόμη προστατευμένοι.",
        en: "PolicyWallet reads your insurance and tells you whether you are still protected.",
    },
    next: {
        el: "Στείλτε ένα συμβόλαιο και δείτε την απάντηση σήμερα.",
        en: "Send us one policy and see the answer today.",
    },
}

/**
 * The changes that quietly break a policy. Concrete moments a reader
 * recognises in their own life, not abstractions like "changing needs".
 */
export const LIFE_CHANGES: readonly Bilingual[] = [
    { el: "Κάνατε παιδί", en: "You had a child" },
    { el: "Αλλάξατε σπίτι", en: "You moved house" },
    { el: "Πήρατε δάνειο", en: "You took out a loan" },
    { el: "Αλλάξατε δουλειά", en: "You changed jobs" },
    { el: "Αγοράσατε αυτοκίνητο", en: "You bought a car" },
    { el: "Πήρατε σκύλο", en: "You got a dog" },
]

/**
 * What each change does to your risk — the payload of the hero's discovery
 * step. Every line states a FACT about the reader's new situation, never a
 * capability of ours, so nothing here needs a plan attribution. `href` points
 * at the branch page that already explains the cover in depth.
 *
 * Keyed by the English label so the copy above stays the single source.
 */
export const LIFE_CHANGE_EFFECTS: readonly {
    change: Bilingual
    effect: Bilingual
    href: string
}[] = [
    {
        change: { el: "Κάνατε παιδί", en: "You had a child" },
        effect: {
            el: "Τώρα κάποιος εξαρτάται από το εισόδημά σας.",
            en: "Someone now depends on your income.",
        },
        href: "/product/life",
    },
    {
        change: { el: "Αλλάξατε σπίτι", en: "You moved house" },
        effect: {
            el: "Το νέο σπίτι θέλει τη δική του κάλυψη.",
            en: "The new home needs cover of its own.",
        },
        href: "/product/property",
    },
    {
        change: { el: "Πήρατε δάνειο", en: "You took out a loan" },
        effect: {
            el: "Το δάνειο μένει, ακόμη κι αν εσείς λείψετε.",
            en: "The loan stays, even if you are gone.",
        },
        href: "/product/life",
    },
    {
        change: { el: "Αλλάξατε δουλειά", en: "You changed jobs" },
        effect: {
            el: "Μαζί με τη δουλειά άλλαξαν και οι παροχές σας.",
            en: "Your benefits changed with the job.",
        },
        href: "/product/group-health",
    },
    {
        change: { el: "Αγοράσατε αυτοκίνητο", en: "You bought a car" },
        effect: {
            el: "Νέο αυτοκίνητο σημαίνει νέα αξία να καλυφθεί.",
            en: "A new car means a new value to cover.",
        },
        href: "/product/motor",
    },
    {
        change: { el: "Πήρατε σκύλο", en: "You got a dog" },
        effect: {
            el: "Τα έξοδα του κτηνιάτρου τα πληρώνετε εσείς.",
            en: "The vet bills are yours to pay.",
        },
        href: "/product/pet",
    },
]

/**
 * The headline promise. Says the outcome, and why it is urgent, in one line.
 * Split in two so the hero can colour the question without re-typing the copy.
 */
export const PROMISE: { lead: Bilingual; accent: Bilingual } = {
    lead: { el: "Η ζωή σας άλλαξε.", en: "Your life changed." },
    // The no-break spaces keep "ασφάλειά σας" / "your insurance" from
    // splitting across lines when the hero headline wraps.
    accent: { el: "Η ασφάλειά σας το ξέρει;", en: "Does your insurance know?" },
}

/**
 * What we actually do, in one sentence. Used under the headline.
 * Deliberately baseline: "what to fix first" is a Plus-plan output and this
 * sentence shares its span with the free-CTA reassurance line.
 */
export const WHAT_WE_DO: Bilingual = {
    el: "Παιδί, νέο σπίτι, νέα δουλειά. Κάθε αλλαγή αλλάζει και τα ρίσκα σας. Δεν πουλάμε ασφάλειες — σας λέμε αν είστε ακόμη καλυμμένοι.",
    en: "A child, a new home, a new job. Every change changes your risks. We do not sell insurance — we tell you whether you are still covered.",
}

/**
 * Why we are different — the neutrality story. This is the single strongest
 * thing we can say and it used to be buried in the third paragraph of
 * /company. It now runs on the homepage, above the fold.
 */
export const DIFFERENTIATORS: readonly { title: Bilingual; body: Bilingual }[] = [
    {
        title: {
            el: "Δεν πουλάμε ασφάλειες",
            en: "We do not sell insurance",
        },
        body: {
            el: "Δεν είμαστε ασφαλιστική εταιρεία. Δεν έχουμε προϊόν να σας προτείνουμε.",
            en: "We are not an insurance company. We have no product to recommend to you.",
        },
    },
    {
        title: {
            el: "Δεν παίρνουμε προμήθεια",
            en: "We take no commission",
        },
        body: {
            el: "Πληρωνόμαστε μόνο από εσάς, με συνδρομή. Δεν κερδίζουμε τίποτα αν αλλάξετε εταιρεία.",
            en: "We are paid only by you, with a subscription. We earn nothing if you switch insurer.",
        },
    },
    {
        title: {
            el: "Δεν πουλάμε τα δεδομένα σας",
            en: "We do not sell your data",
        },
        body: {
            el: "Τα συμβόλαιά σας είναι δικά σας. Κανείς δεν τα βλέπει αν δεν το ζητήσετε εσείς.",
            en: "Your policies are yours. Nobody else sees them unless you ask us to share.",
        },
    },
]

/**
 * Why you can trust us — verifiable, boring, checkable facts. Every item here
 * must be something an auditor could confirm.
 */
export const TRUST_FACTS: readonly { label: Bilingual; detail: Bilingual }[] = [
    {
        label: { el: "Κρυπτογράφηση AES-256", en: "AES-256 encryption" },
        detail: {
            el: "Τα αρχεία σας αποθηκεύονται κρυπτογραφημένα.",
            en: "Your files are stored encrypted.",
        },
    },
    {
        label: { el: "Διακομιστές στην ΕΕ", en: "Servers in the EU" },
        detail: {
            el: "Τα δεδομένα σας μένουν στην Ευρώπη.",
            en: "Your data stays in Europe.",
        },
    },
    {
        // The behaviour an auditor can confirm — not a self-graded compliance
        // verdict. GDPR gives the rights; we state what you can actually do.
        label: { el: "Τα δεδομένα σας είναι δικά σας", en: "Your data is yours" },
        detail: {
            el: "Ζητάτε αντίγραφο ή πλήρη διαγραφή όποτε θέλετε.",
            en: "Ask for a copy or full deletion whenever you want.",
        },
    },
    {
        // States the privacy default, which is true on every plan. Sharing
        // with an advisor is a paid feature, so it is not promised here.
        label: { el: "Μόνο εσείς τα βλέπετε", en: "Only you see your policies" },
        detail: {
            el: "Κανείς άλλος δεν έχει πρόσβαση, εκτός αν το επιλέξετε εσείς.",
            en: "Nobody else has access unless you choose it.",
        },
    },
]

/**
 * Why now. Not "act fast, offer ends" theatre — the three reasons waiting is
 * genuinely expensive, each stated as a plain fact about how insurance works.
 */
export const WHY_NOW: readonly { title: Bilingual; body: Bilingual }[] = [
    {
        title: {
            el: "Η ζωή αλλάζει. Το συμβόλαιο μένει ίδιο.",
            en: "Life changes. The policy stays the same.",
        },
        body: {
            el: "Το συμβόλαιο που υπογράψατε πέρυσι δεν ξέρει για το παιδί, το νέο σπίτι ή τη νέα δουλειά.",
            en: "The policy you signed last year knows nothing about the child, the new home or the new job.",
        },
    },
    {
        title: {
            el: "Το κενό φαίνεται μόνο όταν είναι αργά.",
            en: "A gap only shows up when it is too late.",
        },
        body: {
            el: "Μαθαίνετε τι δεν καλύπτει τη μέρα που ζητάτε αποζημίωση. Εκείνη τη μέρα δεν διορθώνεται.",
            en: "You find out what it does not cover on the day you make a claim. On that day it cannot be fixed.",
        },
    },
    {
        title: {
            el: "Ίσως πληρώνετε δύο φορές για το ίδιο.",
            en: "You may be paying twice for the same thing.",
        },
        body: {
            el: "Δύο συμβόλαια μπορεί να καλύπτουν το ίδιο πράγμα. Εσείς πληρώνετε και τα δύο.",
            en: "Two policies can cover the same thing. You pay for both of them.",
        },
    },
]

/**
 * The risk-reversal line under every primary CTA. Kept here so the free-tier
 * promise can never say one thing on the homepage and another on /product.
 * Must match what /pricing actually sells.
 */
export const CTA_REASSURANCE: Bilingual = {
    el: "Δωρεάν για 1 συμβόλαιο. Χωρίς κάρτα. Διαγράφετε τα πάντα όποτε θέλετε.",
    en: "Free for 1 policy. No card. Delete everything whenever you want.",
}

/** Primary call to action, worded as the outcome the visitor gets. */
export const PRIMARY_ACTION: Bilingual = {
    el: "Δείτε αν είστε καλυμμένοι",
    en: "See if you are covered",
}

/**
 * How fast, stated once. "Minutes" is the defensible unit — never "seconds"
 * (tests/unit/no-overpromise-copy.test.ts bans it). Pages that mention speed
 * use this claim instead of inventing their own number.
 */
export const SPEED_CLAIM: Bilingual = {
    el: "σε λίγα λεπτά",
    en: "in minutes",
}

/**
 * How the alternatives actually compare. Used by /compare. Each row is a real
 * job the visitor needs done; each cell says plainly whether that option does
 * it. No competitor is named — the honest comparison is against the three
 * things Greek households actually do today.
 */
// "plus" = yes, on the PolicyWallet Plus plan. Plus-only capabilities (gap &
// duplicate detection per the pricing matrix) must not read as an unqualified
// "yes" to a Free reader — the cell itself carries the plan attribution.
export type ComparisonVerdict = "yes" | "plus" | "partial" | "no"

export const COMPARISON_COLUMNS: readonly {
    key: "folder" | "insurer" | "advisor" | "policywallet"
    label: Bilingual
    note: Bilingual
}[] = [
    {
        key: "folder",
        label: { el: "Ο φάκελος στο συρτάρι", en: "The folder in the drawer" },
        note: { el: "Τα χαρτιά σας, όπως τα έχετε σήμερα.", en: "Your papers, exactly as you keep them today." },
    },
    {
        key: "insurer",
        label: { el: "Η ασφαλιστική σας", en: "Your insurance company" },
        note: { el: "Βλέπει μόνο τα δικά της συμβόλαια.", en: "Sees only its own policies." },
    },
    {
        key: "advisor",
        label: { el: "Ο ασφαλιστής σας", en: "Your insurance agent" },
        note: { el: "Ξέρει πολλά, αλλά πληρώνεται με προμήθεια.", en: "Knows a lot, but is paid on commission." },
    },
    {
        key: "policywallet",
        label: { el: "PolicyWallet", en: "PolicyWallet" },
        note: { el: "Πληρωνόμαστε μόνο από εσάς.", en: "We are paid only by you." },
    },
]

export const COMPARISON_ROWS: readonly {
    job: Bilingual
    folder: ComparisonVerdict
    insurer: ComparisonVerdict
    advisor: ComparisonVerdict
    policywallet: ComparisonVerdict
}[] = [
    {
        job: { el: "Βλέπετε όλα τα συμβόλαια μαζί", en: "See all your policies together" },
        folder: "partial",
        insurer: "no",
        advisor: "partial",
        policywallet: "yes",
    },
    {
        job: { el: "Σας εξηγεί τι λένε με απλά λόγια", en: "Explains what they say in plain words" },
        folder: "no",
        insurer: "partial",
        advisor: "yes",
        policywallet: "yes",
    },
    {
        // Gap & duplicate detection is a PolicyWallet Plus feature — these two
        // rows use the "plus" verdict so the cell never over-promises to a
        // Free reader (same honesty rule as the renewal row below).
        job: { el: "Σας δείχνει τι ΔΕΝ καλύπτεται", en: "Shows you what is NOT covered" },
        folder: "no",
        insurer: "no",
        advisor: "partial",
        policywallet: "plus",
    },
    {
        job: { el: "Βρίσκει αν πληρώνετε δύο φορές", en: "Finds if you are paying twice" },
        folder: "no",
        insurer: "no",
        advisor: "partial",
        policywallet: "plus",
    },
    {
        // Worded on what every plan delivers: even Free shows each policy's
        // renewal date. Email reminders are a paid feature, so the row must
        // not promise "warns you" unqualified to a Free reader.
        job: { el: "Ξέρετε πάντα πότε λήγει το καθένα", en: "You always know when each one runs out" },
        folder: "no",
        insurer: "partial",
        advisor: "partial",
        policywallet: "yes",
    },
    {
        job: { el: "Δεν κερδίζει τίποτα από την απάντηση", en: "Earns nothing from the answer it gives" },
        folder: "yes",
        insurer: "no",
        advisor: "no",
        policywallet: "yes",
    },
]
