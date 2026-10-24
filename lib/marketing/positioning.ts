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
 *     PolicyWallet helps you read what your policies say.
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

import { FREE_PLAN_LIMIT } from "@/lib/marketing/limit-statement"
import type { ClaimKey } from "@/lib/marketing/plan-claims"

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
 * Must stay aligned with the definitional sentence in lib/seo/site.ts.
 *
 * PW-CONTENT-02 / H-022: this is the ONE positioning line. Every other
 * variant («προσωπικής ανάλυσης ρίσκου», «έλεγχος ρίσκου», «αν είστε
 * καλυμμένοι», …) is retired from public routes and metadata, and the
 * positioning lint in tests/unit/voice-guards.test.ts keeps it that way.
 *
 * Two FORMS, because a sentence that embeds the label needs its own grammar:
 * the label (`CATEGORY_NAME`, capitalised, article-free) for headings and
 * lines that stand alone; the inline form (`CATEGORY_NAME_INLINE`, lower
 * case) for the middle of a sentence («είναι μια πλατφόρμα…», "is a
 * platform…"). The 2026-10-21 rename shipped «η Πλατφόρμα…» and "is an A
 * platform…" because only the label existed.
 *
 * It is NOT in the homepage hero. A stranger giving the page three seconds
 * cannot do anything with a category label, so the hero leads with the decode
 * and lets the label do its work where it is being looked up rather than read.
 */
export const CATEGORY_NAME: Bilingual = {
    el: "Πλατφόρμα οργάνωσης και κατανόησης ασφαλιστηρίων",
    en: "Platform for organising and understanding insurance policies",
}

/** The same line for the middle of a sentence. Compose with your own article. */
export const CATEGORY_NAME_INLINE: Bilingual = {
    el: "πλατφόρμα οργάνωσης και κατανόησης ασφαλιστηρίων",
    en: "platform for organising and understanding insurance policies",
}

/**
 * The category DECODE: what the label means, as a plain sentence a
 * non-expert understands in one breath. Renders next to CATEGORY_NAME
 * (footer identity line) and anywhere the plain claim carries alone.
 */
export const CATEGORY: Bilingual = {
    el: "Συγκεντρώνουμε τα ασφαλιστήριά σας και εξηγούμε τι γράφουν.",
    // OQ5, decided 2026-08-30: the English mirrors the Greek PROMISE. It had
    // been "AI Personal Risk Intelligence" — a category label, i.e. a different
    // claim — violating this module's own rule that en carries identical
    // meaning. The label still does its SEO work via CATEGORY_NAME; this
    // constant also feeds the JSON-LD `slogan` and both OG alt paths, so the
    // mismatch was living in structured data too.
    en: "We bring your policies together and explain what they say.",
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
        el: "Μια αλλαγή στη ζωή σας είναι καλή αφορμή να ξαναδείτε την ασφάλισή σας.",
        en: "A change in your life is a good reason to review your insurance.",
    },
    helps: {
        el: "Βρείτε τι αναφέρουν τα ασφαλιστήριά σας και τι χρειάζεται να ρωτήσετε τον ασφαλιστή σας.",
        en: "Find what your policies say and what you need to ask your adviser.",
    },
    next: {
        el: "Ανεβάστε το ασφαλιστήριό σας και ξεκινήστε από τα βασικά.",
        en: "Upload your policy and start with the essentials.",
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
            el: "Ελέγξτε ποιο πρόσωπο και ποιο ποσό αφορά η ασφάλιση του δανείου.",
            en: "Check which person and amount the loan insurance covers.",
        },
        href: "/product/life",
    },
    {
        change: { el: "Αλλάξατε δουλειά", en: "You changed jobs" },
        effect: {
            el: "Ελέγξτε αν έχετε νέες παροχές ή αν σταμάτησαν παλιές.",
            en: "Check whether new benefits are available or previous ones have ended.",
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
    lead: { el: "Καταλάβετε εύκολα", en: "Know what your policies" },
    accent: { el: "τι γράφουν τα ασφαλιστήριά σας.", en: "actually cover." },
}

/** The hero email-capture CTA — same single-source rule as PRIMARY_ACTION. */
export const HERO_EMAIL_CTA: Bilingual = {
    el: "Ξεκινήστε δωρεάν",
    en: "Start free",
}

/** The demoted feature line — the old slide-1 headline, now the fixed sub-head. */
export const HERO_SUBHEAD: Bilingual = {
    el: "Συγκεντρώστε τα ασφαλιστήριά σας από διαφορετικές εταιρείες. Δείτε τις καλύψεις, τα ποσά και τις ημερομηνίες τους με απλά λόγια.",
    en: "Bring together policies from different insurers. See their cover, amounts and dates in plain language.",
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
    el: "Εσείς επιλέγετε τι μοιράζεστε με τον ασφαλιστή σας. Η Πολιτική Απορρήτου εξηγεί πώς χρησιμοποιούμε τα στοιχεία σας για να λειτουργεί η υπηρεσία.",
    en: "You choose what to share with your adviser. Our Privacy Policy explains how we use your data to operate the service.",
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
            el: "Τα δεδομένα σας, με σαφείς κανόνες πρόσβασης.",
            en: "Your data, with clear access rules.",
        },
    },
]

/**
 * Why you can trust us — verifiable, boring, checkable facts. Every item here
 * must be something an auditor could confirm.
 */
export const TRUST_FACTS: readonly { label: Bilingual; detail: Bilingual }[] = [
    {
        label: { el: "Κρυπτογραφημένη αποθήκευση", en: "AES-256 encryption" },
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
            el: "Τα αρχεία αποθηκεύονται στην ΕΕ. Η ανάλυση και άλλες τεχνικές υπηρεσίες μπορεί να περιλαμβάνουν επεξεργασία εκτός ΕΕ. Δείτε τους παρόχους και την Πολιτική Απορρήτου.",
            en: "Files are stored in the EU. Analysis and other technical services may involve processing outside the EU. See our providers and Privacy Policy.",
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
            el: "Μπορείτε να ζητήσετε αντίγραφο ή διαγραφή των στοιχείων σας. Η Πολιτική Απορρήτου εξηγεί τη διαδικασία και όσα πρέπει να διατηρηθούν βάσει νόμου.",
            en: "You can request a copy or deletion of your data. Our Privacy Policy explains the process and records that must be retained by law.",
        },
    },
    {
        // States the privacy default, which is true on every plan. Sharing
        // with an advisor is a paid feature, so it is not promised here.
        label: { el: "Ελεγχόμενη πρόσβαση", en: "Controlled access" },
        detail: {
            el: "Η πρόσβαση εξαρτάται από τον ρόλο και τα δικαιώματα κάθε χρήστη. Επιλέγετε τι κοινοποιείτε στον ασφαλιστή σας και μπορείτε να ανακαλέσετε την πρόσβαση που δώσατε.",
            en: "Access depends on each user's role and permissions. You choose what to share with your adviser and can revoke access you granted.",
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
            el: "Όταν αλλάζει η ζωή, ξαναδείτε την ασφάλισή σας.",
            en: "Life changes. The policy stays the same.",
        },
        body: {
            el: "Το ασφαλιστήριο που υπογράψατε πέρυσι δεν ξέρει για το παιδί, το νέο σπίτι ή τη νέα δουλειά.",
            en: "The policy you signed last year knows nothing about the child, the new home or the new job.",
        },
    },
    {
        title: {
            el: "Δείτε τους όρους πριν τους χρειαστείτε.",
            en: "A gap only shows up when it is too late.",
        },
        body: {
            el: "Βρείτε τι καλύπτεται, τι εξαιρείται και τι χρειάζεται επιβεβαίωση από τον ασφαλιστή σας.",
            en: "Find what is covered, what is excluded and what needs confirmation from your adviser.",
        },
    },
    {
        title: {
            el: "Έχετε παρόμοιες καλύψεις σε δύο ασφαλιστήρια;",
            en: "Do you have similar cover in two policies?",
        },
        body: {
            el: "Δύο καλύψεις μπορεί να συμπληρώνουν η μία την άλλη. Δείτε τους όρους και συζητήστε τους με τον ασφαλιστή σας πριν ακυρώσετε κάτι.",
            en: "Two covers may complement each other. Check the terms with your adviser before cancelling anything.",
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
    // The policy cap is read from the entitlement source (lib/marketing/limit-statement.ts),
    // never typed: the free-tier promise has drifted four times when it was.
    el: `${FREE_PLAN_LIMIT.el}. Χωρίς κάρτα. Αναβάθμιση όποτε τη χρειαστείτε.`,
    en: `${FREE_PLAN_LIMIT.en}. No card required. Upgrade when you need to.`,
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
        note: { el: "Σας εξηγεί τις επιλογές και σας συμβουλεύει.", en: "Explains your options and advises you." },
    },
    {
        key: "policywallet",
        label: { el: "PolicyWallet", en: "PolicyWallet" },
        note: { el: "Έσοδα από συνδρομές.", en: "Revenue from subscriptions." },
    },
]

export const COMPARISON_ROWS: readonly {
    /**
     * The enforced capability the PolicyWallet cell states, or `null` for a row
     * that is prose about the product's job. The «policywallet» verdict is
     * checked against `planClaim` for free / plus / pro by plan-gating-parity
     * (review I3): all true → «yes», Family only → «family».
     */
    claim: ClaimKey | null
    job: Bilingual
    folder: ComparisonVerdict
    insurer: ComparisonVerdict
    advisor: ComparisonVerdict
    policywallet: ComparisonVerdict
}[] = [
    {
        claim: null,
        job: { el: "Βλέπετε όλα τα ασφαλιστήρια μαζί", en: "See all your policies together" },
        folder: "partial",
        insurer: "no",
        advisor: "partial",
        policywallet: "yes",
    },
    {
        claim: null,
        job: { el: "Σας εξηγεί τι λένε με απλά λόγια", en: "Explains what they say in plain words" },
        folder: "no",
        insurer: "partial",
        advisor: "yes",
        policywallet: "yes",
    },
    {
        // Exclusions are read from the policy at upload and shown on EVERY plan
        // (ExclusionsCard has no gate), so the cell is «yes», not «family»
        // (H-023: copy follows code). The English used to say "Shows you what is
        // NOT covered" — gap detection, a Family output, which is a different
        // claim from the Greek. Both now state what the policy lists as excluded.
        claim: "exclusions",
        job: { el: "Βοηθά να βρείτε τι εξαιρείται", en: "Helps you find what is excluded" },
        folder: "no",
        insurer: "no",
        advisor: "partial",
        policywallet: "yes",
    },
    {
        claim: "duplicateDetection",
        job: { el: "Εντοπίζει πιθανές κοινές καλύψεις", en: "Finds possible shared cover" },
        folder: "no",
        insurer: "no",
        advisor: "partial",
        policywallet: "yes",
    },
    {
        // Worded on what every plan delivers: even Free shows each policy's
        // renewal date, and «πάντα» promised a date for every policy — a date
        // the document does not state cannot be shown. Every plan also gets a
        // 30-day email reminder; the longer ladder is Plus and Family.
        claim: "renewalDate",
        job: { el: "Βλέπετε πότε λήγει το καθένα", en: "You see when each one runs out" },
        folder: "no",
        insurer: "partial",
        advisor: "partial",
        policywallet: "yes",
    },
]
// There was a sixth row, «Δεν κερδίζει τίποτα από την απάντηση», that marked the
// agent «Όχι» while the same site sells to agents. Deleted outright, with no
// replacement wording (PW-CONTENT-02 A5, 2026-10-21).

export const FINAL_ACTION_HEADING: Bilingual = {
    el: "Δείτε τι γράφει το ασφαλιστήριό σας. Κρατήστε τις ερωτήσεις για τον ασφαλιστή σας.",
    en: "See what your policy says. Keep your questions for your insurance agent.",
}
