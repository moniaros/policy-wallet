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
 *     How do you help? →  STORY.helps    /  CATEGORY
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
 * the sitewide footer identity line, the company kicker, /product, /compare
 * and the OG cards — and CATEGORY below is its plain-language decode.
 * Must stay aligned with the definitional sentence in lib/seo/site.ts
 * («προσωπικής ανάλυσης ρίσκου» ↔ "personal risk intelligence").
 *
 * It is NOT in the homepage hero. A stranger giving the page three seconds
 * cannot do anything with a category label, so the hero leads with the decode
 * and lets the label do its work where it is being looked up rather than read.
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
    el: "Δεν αξιολογούμε ασφαλιστήρια. Αξιολογούμε την προστασία σας.",
    // OQ5, decided 2026-08-30: the English mirrors the Greek PROMISE. It had
    // been "AI Personal Risk Intelligence" — a category label, i.e. a different
    // claim — violating this module's own rule that en carries identical
    // meaning. The label still does its SEO work via CATEGORY_NAME; this
    // constant also feeds the JSON-LD `slogan` and both OG alt paths, so the
    // mismatch was living in structured data too.
    en: "We do not rate policies. We rate your protection.",
}

/**
 * The four beats of the story, as sentences. Pages tell the beats through the
 * derived constants — LIFE_CHANGES for "changed", WHY_NOW for "matters",
 * CATEGORY for "helps", PRIMARY_ACTION for "next" — and may also render a
 * beat verbatim: the homepage renders `matters` word for word.
 */
export const STORY: Record<"changed" | "matters" | "helps" | "next", Bilingual> = {
    changed: {
        el: "Η ζωή σας αλλάζει.",
        en: "Your life changes.",
    },
    matters: {
        el: "Μαζί της αλλάζουν και τα ρίσκα σας. Η ασφάλισή σας, όμως, έμεινε εκεί που την αφήσατε.",
        en: "Your risks change with it. Your insurance stayed where you left it.",
    },
    helps: {
        el: "Το PolicyWallet διαβάζει τα ασφαλιστήριά σας και σας λέει αν είστε ακόμη προστατευμένοι.",
        en: "PolicyWallet reads your insurance and tells you whether you are still protected.",
    },
    next: {
        el: "Στείλτε ένα ασφαλιστήριο και δείτε την απάντηση σήμερα.",
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
    // The fixed hero H1 — the PROMISE, not the feature. Was a dead import for
    // months («Η ζωή σας άλλαξε…»); rewritten and wired 2026-08-30 per the
    // approved repositioning (docs/marketing/03-COPY-pass1 §1.2). The storage
    // line demotes to HERO_SUBHEAD below, and the rotating headline is gone:
    // one visitor, one value proposition, one <h1>.
    lead: { el: "Μάθετε τι πραγματικά", en: "Know what your policies" },
    accent: { el: "καλύπτουν τα ασφαλιστήριά σας.", en: "actually cover." },
}

/** The hero email-capture CTA — same single-source rule as PRIMARY_ACTION. */
export const HERO_EMAIL_CTA: Bilingual = {
    el: "Ξεκινήστε δωρεάν",
    en: "Start free",
}

/** The demoted feature line — the old slide-1 headline, now the fixed sub-head. */
export const HERO_SUBHEAD: Bilingual = {
    el: "Όλα τα ασφαλιστήρια, από όλες τις εταιρείες, σε ένα σημείο — διαβασμένα και εξηγημένα στα ελληνικά.",
    en: "Every policy, from every company, in one place — read and explained in plain language.",
}


/**
 * Why we are different — the neutrality story. This is the single strongest
 * thing we can say and it used to be buried in the third paragraph of
 * /company. It now runs on the homepage, above the fold.
 */
/**
 * The neutrality argument, grounded in how we are paid and how the analysis
 * works — never in an absence of relationships. The retired sentence («Δεν
 * συνεργαζόμαστε με καμία ασφαλιστική — γι' αυτό μπορούμε να σας πούμε την
 * αλήθεια») grounded trust in our contact list, and became false the day any
 * pilot was signed. Four clauses, each independently checkable, each true
 * standalone and embedded.
 */
export const NEUTRALITY_STATEMENT: Bilingual = {
    el: "Καμία ασφαλιστική και καμία τράπεζα δεν μας πληρώνει για να σας προτείνουμε κάτι. Δεν παίρνουμε προμήθεια. Η ανάλυση είναι ίδια για κάθε ασφαλιστήριο, όποιος κι αν το εξέδωσε — και τίποτα από όσα ανεβάζετε δεν κοινοποιείται χωρίς τη δική σας, ξεχωριστή και ανακλητή συγκατάθεση.",
    en: "No insurer and no bank pays us to recommend anything. We take no commission. The analysis is the same for every policy, whoever issued it — and nothing you upload is shared without your separate, revocable consent.",
}

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
            // NOT «πληρωνόμαστε μόνο από εσάς»: that claims who funds us, and
            // becomes false the day an institution pays for an embedded
            // deployment. The commission claim is the one a reader actually
            // cares about, and it survives every scenario.
            el: "Δεν παίρνουμε προμήθεια από καμία ασφαλιστική. Δεν κερδίζουμε τίποτα αν αλλάξετε εταιρεία — ούτε αν δεν αλλάξετε.",
            en: "We take no commission from any insurer. We earn nothing if you switch insurer — and nothing if you stay.",
        },
    },
    {
        title: {
            el: "Δεν πουλάμε τα δεδομένα σας",
            en: "We do not sell your data",
        },
        body: {
            el: "Τα ασφαλιστήριά σας είναι δικά σας. Κανείς άλλος δεν τα βλέπει — ούτε ασφαλιστική, ούτε τράπεζα — παρά μόνο αν το επιλέξετε εσείς, ξεχωριστά για κάθε έγγραφο.",
            en: "Your policies are yours. Nobody else sees them — not an insurer, not a bank — unless you choose it, separately for each document.",
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
        // NOT «τα δεδομένα σας μένουν στην Ευρώπη»: storage does, but AI
        // analysis may involve providers outside the EU under EU-approved
        // safeguards, and /trust says so. A trust fact that the privacy
        // policy contradicts is worse than no fact at all.
        label: { el: "Αποθήκευση στην ΕΕ", en: "Storage in the EU" },
        detail: {
            el: "Τα αρχεία σας αποθηκεύονται κρυπτογραφημένα στην Ευρώπη. Η ανάλυση AI γίνεται μόνο με τη συγκατάθεσή σας — και κανένας πάροχος δεν εκπαιδεύει μοντέλα στα έγγραφά σας.",
            en: "Your files are stored encrypted in Europe. AI analysis runs only with your consent — and no provider trains models on your documents.",
        },
    },
    {
        // The behaviour an auditor can confirm — not a self-graded compliance
        // verdict. GDPR gives the rights; we state what you can actually do.
        label: { el: "Τα δεδομένα σας είναι δικά σας", en: "Your data is yours" },
        detail: {
            // Two different mechanics, so two different promises.
            //
            // The export IS immediate and self-service. Deletion is not: the
            // request is self-service, a person reviews and executes it, and
            // the statutory clock is one month (GDPR Art. 12(3)). And it is not
            // "full" — invoices are kept 5 years for tax law, consent records
            // as proof of consent. The in-product copy has said all of this
            // accurately for months; this line had not.
            el: "Κατεβάζετε αντίγραφο όποτε θέλετε. Ζητάτε διαγραφή και την ολοκληρώνουμε εντός ενός μήνα.",
            en: "Download a copy whenever you want. Ask for deletion and we complete it within one month.",
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
            el: "Η ζωή αλλάζει. Το ασφαλιστήριο μένει ίδιο.",
            en: "Life changes. The policy stays the same.",
        },
        body: {
            el: "Το ασφαλιστήριο που υπογράψατε πέρυσι δεν ξέρει για το παιδί, το νέο σπίτι ή τη νέα δουλειά.",
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
            el: "Δύο ασφαλιστήρια μπορεί να καλύπτουν το ίδιο πράγμα. Εσείς πληρώνετε και τα δύο.",
            en: "Two policies can cover the same thing. You pay for both of them.",
        },
    },
]

/**
 * The risk-reversal line under every primary CTA. Kept here so the free-tier
 * promise can never say one thing on the homepage and another on /product.
 * Must match what /pricing actually sells.
 */
/**
 * The SHORT risk-reversal line, for pages where the long one does not fit.
 *
 * Two sanctioned wordings for one promise, and no third — the long form above
 * and this. Both live here because this is a claim about what the free tier
 * gives you, and 17 hand-typed copies of a free-tier promise is 17 chances for
 * one page to promise something the product does not do.
 */
/**
 * ONE reassurance line. There is deliberately no `_SHORT` variant.
 *
 * Two exports meant two free-tier promises, and they drifted the moment the
 * tier changed: sixteen product pages rendered one string while the landing
 * page rendered another, and a pricing change had to find both. The free tier
 * is three policies with full analysis — stated once, here.
 */
export const CTA_REASSURANCE: Bilingual = {
    el: "Δωρεάν για 3 ασφαλιστήρια. Χωρίς κάρτα. Διαγράφετε τα πάντα όποτε θέλετε.",
    en: "Free for 3 policies. No card. Delete everything whenever you want.",
}

/**
 * Primary call to action, worded as the outcome the visitor gets.
 *
 * It has to survive the free tier. "See what is NOT covered" reads stronger,
 * but COMPARISON_ROWS already rules that job a Family one, so a CTA
 * that opens a free signup must not promise it. Reading back what a policy
 * actually says is baseline behaviour — Free stores one policy and gets its
 * basic parsed summary — and it is the question every policyholder has.
 */
export const PRIMARY_ACTION: Bilingual = {
    // Was «Δείτε τι λέει το συμβόλαιό σας» — an invitation to look, which asks
    // for nothing and promises nothing. The button now names the action the
    // visitor is actually being asked to take, and the value argument sits in
    // the copy around it rather than inside the label.
    el: "Δημιουργήστε λογαριασμό",
    en: "Create your account",
}

/**
 * The SAME action, in the words that fit a fixed-width header.
 *
 * The header is a flex row beside five nav links: with the full PRIMARY_ACTION
 * in it, at 1024px the logo overlapped the first nav item and the button
 * wrapped out of the bar. That constraint is real, so the short form stays —
 * but it lives HERE, next to the long form, instead of being invented in the
 * nav module.
 *
 * Two sanctioned wordings for one action, and no third. Before this, three
 * different strings sent a visitor to the same signup — «Δείτε πού είστε» in
 * the header, «Δείτε τι λέει το συμβόλαιό σας» in the hero, and «Ξεκινήστε τον
 * δωρεάν έλεγχο» hardcoded on all fifteen branch pages — so someone who tapped
 * one could not tell it was the button they had just decided against.
 * tests/unit/primary-action-single-source.test.ts holds the line.
 */
export const PRIMARY_ACTION_SHORT: Bilingual = {
    // NOT «Εγγραφή»: the footer's newsletter button already uses that word for
    // a different action, and one Greek label pointing at two destinations is
    // the drift this constant exists to stop.
    el: "Δημιουργία λογαριασμού",
    en: "Create account",
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
// "plus" = yes, on the Family plan. Plus-only capabilities (gap &
// duplicate detection per the pricing matrix) must not read as an unqualified
// "yes" to a Free reader — the cell itself carries the plan attribution.
export type ComparisonVerdict = "yes" | "family" | "partial" | "no"

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
        note: { el: "Βλέπει μόνο τα δικά της ασφαλιστήρια.", en: "Sees only its own policies." },
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
        job: { el: "Βλέπετε όλα τα ασφαλιστήρια μαζί", en: "See all your policies together" },
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
        // Gap & duplicate detection is a Family feature — these two
        // rows use the "plus" verdict so the cell never over-promises to a
        // Free reader (same honesty rule as the renewal row below).
        job: { el: "Σας δείχνει τι ΔΕΝ καλύπτεται", en: "Shows you what is NOT covered" },
        folder: "no",
        insurer: "no",
        advisor: "partial",
        policywallet: "family",
    },
    {
        job: { el: "Βρίσκει αν πληρώνετε δύο φορές", en: "Finds if you are paying twice" },
        folder: "no",
        insurer: "no",
        advisor: "partial",
        policywallet: "yes",
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
