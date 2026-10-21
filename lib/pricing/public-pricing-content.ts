import type { ClaimKey } from "@/lib/marketing/plan-claims"
import type { CheckoutBlockReason } from "@/lib/pricing/stripe-mode"
import { FREE_UP_TO } from "@/lib/marketing/limit-statement"

export type PricingAudience = "policyholder" | "agent"
export type BillingPeriod = "monthly" | "annual"

export interface LocalizedText {
    el: string
    en: string
}

export interface PublicPricingFeature {
    /**
     * The enforced capability this line states (`lib/marketing/plan-claims.ts`).
     * REQUIRED — `null` is a deliberate «not tied to one entitlement field» and
     * must be listed with a reason in tests/unit/plan-gating-parity.test.ts.
     */
    claim: ClaimKey | null
    label: LocalizedText
    included: boolean
    highlight?: boolean
}

export interface PublicPricingPlan {
    key: string
    checkoutPlanId: string | null
    name: LocalizedText
    description: LocalizedText
    badge?: LocalizedText
    isHighlighted?: boolean
    isContactPlan?: boolean
    pricing: {
        // The PRICE is a number until the moment it is rendered (PW-CONTENT-02
        // A3). It used to be the string "€4.99", which the pricing JSON-LD parsed
        // back with a regex; formatting it «4,99 €» would have made the offer
        // read 499. Render through `formatPlanPrice` (lib/pricing/format-plan-price.ts).
        monthly: {
            value: number
            period: LocalizedText
        }
        annual?: {
            value: number
            period: LocalizedText
            savings: LocalizedText
        }
    }
    features: PublicPricingFeature[]
    /**
     * Set when this deployment cannot complete a purchase of this plan, so the
     * card states that instead of offering a buy button (the rule and its
     * reasoning live in `lib/pricing/stripe-mode.ts`). `undefined` — the normal
     * case — means the plan is buyable. The PRICE still renders either way: the
     * price is true; it is the offer to sell that would not be.
     */
    checkoutUnavailableReason?: CheckoutBlockReason
}

export interface PublicPricingComparisonRow {
    /** See `PublicPricingFeature.claim`. */
    claim: ClaimKey | null
    category?: LocalizedText
    name: LocalizedText
    /**
     * `true`/`false` render as an included/excluded mark; a string renders as
     * given; a LocalizedText renders in the reader's language. The last form
     * exists because these cells used to be language-blind strings, so a Greek
     * visitor read "Unlimited", "No" and "100 rows" in an otherwise Greek
     * table — and one cell displayed "Απεριόριστα / Unlimited" at once.
     */
    values: Record<string, boolean | string | LocalizedText>
}

export interface PublicPricingFaqItem {
    question: LocalizedText
    answer: LocalizedText
}

export interface PublicPricingAudienceContent {
    heading: LocalizedText
    subtitle: LocalizedText
    plans: PublicPricingPlan[]
    comparisonTitle: LocalizedText
    comparisonRows: PublicPricingComparisonRow[]
    faqTitle: LocalizedText
    faqItems: PublicPricingFaqItem[]
}

/** Header of the feature column in the comparison table. */
export const FEATURE_COLUMN_HEADER: LocalizedText = { el: "Χαρακτηριστικό", en: "Feature" }

/**
 * Every plan key or checkoutPlanId that the pricing page can send to signup.
 * Used by the RegisterSchema to reject unknown values.
 */
export const VALID_PLAN_IDS = [
    "free",
    "ph-plus",
    "ph-pro",
    "agent-free",
    "agent-starter",
    "agent-pro",
    "agent-agency",
] as const

export type ValidPlanId = (typeof VALID_PLAN_IDS)[number]

export const publicPricingContent: Record<PricingAudience, PublicPricingAudienceContent> = {
    policyholder: {
        heading: {
            el: "Πλάνα για ιδιώτες",
            en: "Plans for individuals",
        },
        subtitle: {
            el: "Διαλέξτε τις λειτουργίες που χρειάζεστε: οργάνωση, ανάλυση εγγράφων και υπενθυμίσεις.",
            en: "Choose the features you need: organisation, document analysis and reminders.",
        },
        plans: [
            {
                key: "free",
                checkoutPlanId: null,
                name: { el: "Δωρεάν", en: "Free" },
                description: { el: "Για να ξεκινήσετε", en: "To get you started" },
                pricing: {
                    monthly: {
                        value: 0,
                        period: { el: "/μήνα", en: "/month" },
                    },
                },
                features: [
                    { claim: "policies", label: { el: "3 ασφαλιστήρια", en: "3 policies" }, included: true, highlight: true },
                    { claim: "basicSummary", label: { el: "Βασική σύνοψη ασφαλιστηρίου", en: "Basic policy summary" }, included: true, highlight: true },
                    { claim: "duplicateDetection", label: { el: "Εντοπισμός διπλών καλύψεων", en: "Duplicate-cover detection" }, included: true },
                    { claim: "renewalDate", label: { el: "Ημερομηνία ανανέωσης", en: "Renewal date" }, included: true },
                    // Free DOES get the 30-day email (renewal.service.ts). This
                    // line said ✗ «Υπενθυμίσεις ανανέωσης» until 2026-10-21.
                    { claim: "renewalEmail30", label: { el: "Υπενθύμιση ανανέωσης 30 ημέρες πριν (email)", en: "Renewal reminder 30 days ahead (email)" }, included: true },
                ],
            },
            {
                key: "plus",
                checkoutPlanId: "ph-plus",
                name: { el: "Plus", en: "Plus" },
                description: { el: "Για όλα τα δικά σας ασφαλιστήρια", en: "For everything in your own name" },
                pricing: {
                    monthly: {
                        value: 4.99,
                        period: { el: "/μήνα", en: "/month" },
                    },
                    annual: {
                        value: 39,
                        period: { el: "/έτος", en: "/year" },
                        savings: { el: "Εξοικονομείτε 4 μήνες", en: "Save 4 months" },
                    },
                },
                features: [
                    { claim: "policies", label: { el: "Έως 10 ασφαλιστήρια", en: "Up to 10 policies" }, included: true, highlight: true },
                    { claim: "basicSummary", label: { el: "Βασική σύνοψη ασφαλιστηρίου", en: "Basic policy summary" }, included: true },
                    { claim: "duplicateDetection", label: { el: "Εντοπισμός διπλών καλύψεων", en: "Duplicate-cover detection" }, included: true },
                    { claim: "renewalLadder", label: { el: "Υπενθυμίσεις ανανέωσης από 90 έως 3 ημέρες πριν (email)", en: "Renewal reminders from 90 to 3 days ahead (email)" }, included: true },
                ],
            },
            {
                key: "pro",
                checkoutPlanId: "ph-pro",
                name: { el: "Family", en: "Family" },
                description: { el: "Για τα ασφαλιστήρια όλου του σπιτιού", en: "For the whole household's policies" },
                badge: { el: "Προτείνεται", en: "Recommended" },
                isHighlighted: true,
                pricing: {
                    monthly: {
                        value: 8.99,
                        period: { el: "/μήνα", en: "/month" },
                    },
                    annual: {
                        value: 79,
                        period: { el: "/έτος", en: "/year" },
                        savings: { el: "Εξοικονομείτε 3 μήνες", en: "Save 3 months" },
                    },
                },
                features: [
                    { claim: "policies", label: { el: "Έως 25 ασφαλιστήρια", en: "Up to 25 policies" }, included: true, highlight: true },
                    { claim: "deepAnalysis", label: { el: "Πλήρης ανάλυση AI", en: "Full AI analysis" }, included: true, highlight: true },
                    { claim: "interactiveQA", label: { el: "Ερωτήσεις στην τεχνητή νοημοσύνη", en: "Interactive AI Q&A" }, included: true },
                    { claim: "gapDetection", label: { el: "Εντοπισμός κενών κάλυψης", en: "Coverage-gap detection" }, included: true },
                    { claim: "duplicateDetection", label: { el: "Εντοπισμός διπλών καλύψεων", en: "Duplicate-cover detection" }, included: true },
                    { claim: "renewalLadder", label: { el: "Υπενθυμίσεις ανανέωσης από 90 έως 3 ημέρες πριν (email)", en: "Renewal reminders from 90 to 3 days ahead (email)" }, included: true },
                    { claim: "reportExport", label: { el: "Εξαγωγή αναφοράς", en: "Report export" }, included: true },
                ],
            },
        ],
        comparisonTitle: {
            el: "Σύγκριση δυνατοτήτων ιδιωτών",
            en: "Feature comparison for individuals",
        },
        comparisonRows: [
            {
                claim: "policies",
                category: { el: "Όρια χρήσης", en: "Usage limits" },
                name: { el: "Αριθμός ασφαλιστηρίων", en: "Number of policies" },
                // Capacity ladder, pricing v2. These MUST equal
                // DEFAULT_ENTITLEMENT_LIMITS.{free,plus,pro}.policies in
                // lib/pricing/plan-defaults.ts. The plan cards higher up this
                // same page state 3 / 10 / 25; until 2026-08-26 this row still
                // carried the v1 figures (1 / 5 / Unlimited), so /pricing
                // contradicted itself. No B2C tier is unlimited in v2.
                values: { free: "3", plus: "10", pro: "25" },
            },
            {
                claim: "basicSummary",
                name: { el: "Βασική σύνοψη ασφαλιστηρίου", en: "Basic policy summary" },
                values: { free: true, plus: true, pro: true },
            },
            {
                claim: "deepAnalysis",
                category: { el: "AI & ειδοποιήσεις", en: "AI & notifications" },
                name: { el: "Πλήρης ανάλυση AI", en: "Full AI analysis" },
                // The deep analysis (clarity, gaps, translation) runs for Family
                // only: canRunDeepAnalysis → FEATURE_GATES.full_ai_policy_analysis.
                // This row said ✓ on all three until 2026-10-21 (PW-CONTENT-02,
                // decision H-019: public copy reflects enforced code). The
                // intended future policy lives in PW-ENTITLE-01; this row moves
                // WITH that code, never before it.
                values: { free: false, plus: false, pro: true },
            },
            {
                claim: "interactiveQA",
                name: { el: "Ερωτήσεις στην τεχνητή νοημοσύνη", en: "Interactive AI Q&A" },
                values: { free: false, plus: false, pro: true },
            },
            {
                // Split from one combined gap-&-duplicate row (D1 as amended
                // 2026-08-30): the two halves have different truths, and a
                // combined row forces one of them to lie. Gap detection is the
                // enforced Family gate; duplicate detection runs on every plan,
                // bounded only by the plan's policy ceiling.
                claim: "gapDetection",
                name: { el: "Εντοπισμός κενών κάλυψης", en: "Coverage-gap detection" },
                values: { free: false, plus: false, pro: true },
            },
            {
                claim: "duplicateDetection",
                name: { el: "Εντοπισμός διπλών καλύψεων", en: "Duplicate-cover detection" },
                values: { free: true, plus: true, pro: true },
            },
            {
                // Split in two (PW-CONTENT-02): every plan gets the 30-day email,
                // the 90→3-day ladder is Plus and Family. One row said ✗ for Free.
                claim: "renewalEmail30",
                name: { el: "Υπενθύμιση ανανέωσης 30 ημέρες πριν (email)", en: "Renewal reminder 30 days ahead (email)" },
                values: { free: true, plus: true, pro: true },
            },
            {
                claim: "renewalLadder",
                name: { el: "Υπενθυμίσεις ανανέωσης από 90 έως 3 ημέρες πριν (email)", en: "Renewal reminders from 90 to 3 days ahead (email)" },
                values: { free: false, plus: true, pro: true },
            },
            {
                // Split from the old «Υπενθυμίσεις & εξαγωγή αναφοράς» row: a
                // combined row forces one half to lie (reminders: Plus = Family;
                // export: Family only).
                claim: "reportExport",
                name: { el: "Εξαγωγή αναφοράς", en: "Report export" },
                values: { free: false, plus: false, pro: true },
            },
            {
                claim: "advisorCollaboration",
                category: { el: "Συνεργασία", en: "Collaboration" },
                name: { el: "Συνεργασία με σύμβουλο", en: "Advisor collaboration" },
                values: { free: false, plus: false, pro: true },
            },
        ],
        faqTitle: {
            el: "Συχνές ερωτήσεις ιδιωτών",
            en: "FAQs for individuals",
        },
        faqItems: [
            // Direct-answer item: answer engines lift this verbatim for "how much
            // does it cost", so the figures stay in the answer text. Keep them in
            // sync with the plan cards above whenever the catalog price changes.
            {
                question: {
                    el: "Πόσο κοστίζει το PolicyWallet;",
                    en: "How much does PolicyWallet cost?",
                },
                answer: {
                    el: `Το δωρεάν πλάνο περιλαμβάνει ${FREE_UP_TO.el} και δεν ζητά κάρτα. Οι τιμές και οι λειτουργίες των πληρωμένων πλάνων εμφανίζονται στους πίνακες αυτής της σελίδας. Η τελική χρέωση επιβεβαιώνεται πριν από την αγορά.`,
                    en: `The free plan includes ${FREE_UP_TO.en} and requires no card. Paid plan prices and features are shown in this page's tables. The final charge is confirmed before purchase.`,
                },
            },
            {
                question: {
                    el: "Μπορώ να αναβαθμίσω το πλάνο μου;",
                    en: "Can I upgrade my plan?",
                },
                answer: {
                    // The «downgrade at any time» half is REMOVED (2026-10-22): the Stripe
                    // customer portal has no configuration in test mode (0 of 0), the app has
                    // no in-app downgrade flow, and the claim rested on the portal only.
                    // Reinstate when a portal configuration with plan switching exists (QUEUE.md).
                    el: "Ναι, μπορείτε να αναβαθμίσετε το πλάνο σας οποτεδήποτε από τις ρυθμίσεις λογαριασμού.",
                    en: "Yes, you can upgrade your plan at any time from account settings.",
                },
            },
            {
                question: {
                    el: "Υπάρχει έκπτωση στην ετήσια χρέωση;",
                    en: "Is there a yearly discount?",
                },
                answer: {
                    el: "Αν υπάρχει όφελος με την ετήσια χρέωση, εμφανίζεται στη σύγκριση τιμών. Δείτε το συνολικό ετήσιο ποσό και συγκρίνετέ το με 12 μηνιαίες χρεώσεις του ίδιου πλάνου.",
                    en: "Any benefit from annual billing is shown in the price comparison. Compare the total annual amount with 12 monthly payments for the same plan.",
                },
            },
            {
                question: {
                    el: "Τι γίνεται αν ακυρώσω;",
                    en: "What happens if I cancel?",
                },
                answer: {
                    el: "Διατηρείτε πρόσβαση μέχρι το τέλος της ήδη πληρωμένης περιόδου χρέωσης.",
                    en: "You keep access until the end of the billing period you have already paid for.",
                },
            },
        ],
    },
    agent: {
        heading: {
            el: "Πλάνα για ασφαλιστές & γραφεία",
            en: "Plans for agents & agencies",
        },
        subtitle: {
            el: "Σχεδιασμένα για χαρτοφυλάκιο πολλών πελατών, ανανεώσεις και συνεργασία ομάδας. Ο πελάτης ελέγχει τι μοιράζεται.",
            en: "Built for a many-client portfolio, renewals, and team collaboration. The client controls what is shared.",
        },
        plans: [
            {
                key: "agent-free",
                checkoutPlanId: null,
                name: { el: "Agent Free", en: "Agent Free" },
                description: { el: "Για να το δοκιμάσετε", en: "To try it out" },
                pricing: {
                    monthly: {
                        value: 0,
                        period: { el: "/μήνα", en: "/month" },
                    },
                },
                features: [
                    { claim: "agent.clients", label: { el: "10 πελάτες", en: "10 clients" }, included: true },
                    // «5 AI αναλύσεις / μήνα» removed 2026-10-21: the 150,000-token
                    // budget can refuse a run at zero usage (run-preflight.ts), so
                    // the count is not a promise this plan keeps (plan-claims.ts).
                    { claim: "agent.clientScreen", label: { el: "Βασική εικόνα πελατών", en: "Basic client view" }, included: true },
                    { claim: "agent.bulkImportRows", label: { el: "Προσθήκη έως 10 πελατών μαζί", en: "Bulk import up to 10 clients" }, included: true },
                    { claim: "agent.renewalAutomation", label: { el: "Αυτοματισμοί ανανέωσης", en: "Renewal automation" }, included: false },
                ],
            },
            {
                key: "agent-starter",
                checkoutPlanId: "agent-starter",
                name: { el: "Agent Starter", en: "Agent Starter" },
                description: { el: "Για ανεξάρτητους συμβούλους", en: "For independent advisors" },
                badge: { el: "Δημοφιλές", en: "Popular" },
                isHighlighted: true,
                pricing: {
                    monthly: {
                        value: 29,
                        period: { el: "/μήνα", en: "/month" },
                    },
                },
                features: [
                    { claim: "agent.clients", label: { el: "100 πελάτες", en: "100 clients" }, included: true, highlight: true },
                    { claim: "agent.analysesPerMonth", label: { el: "50 αναλύσεις τον μήνα", en: "50 analyses a month" }, included: true, highlight: true },
                    // Same plain register as the comparison rows below — the
                    // cards used to say "Portfolio dashboard" / "Renewal
                    // pipeline" in English inside the Greek column.
                    { claim: "agent.clientScreen", label: { el: "Όλοι οι πελάτες σε μία οθόνη", en: "Every client on one screen" }, included: true, highlight: true },
                    { claim: "agent.expiryList", label: { el: "Λίστα με ό,τι λήγει", en: "A list of what is running out" }, included: true },
                    { claim: "agent.bulkImportRows", label: { el: "Προσθήκη έως 100 πελατών μαζί", en: "Bulk import up to 100 clients" }, included: true },
                    { claim: "agent.questionnaireTemplates", label: { el: "Ερωτηματολόγια πελατών (5 πρότυπα)", en: "Client questionnaires (5 templates)" }, included: true },
                ],
            },
            {
                key: "agent-pro",
                checkoutPlanId: "agent-pro",
                name: { el: "Agent Pro", en: "Agent Pro" },
                description: { el: "Για ομάδες παραγωγής", en: "For sales teams" },
                pricing: {
                    monthly: {
                        value: 79,
                        period: { el: "/μήνα", en: "/month" },
                    },
                },
                features: [
                    { claim: "agent.clients", label: { el: "500 πελάτες", en: "500 clients" }, included: true, highlight: true },
                    { claim: "agent.analysesPerMonth", label: { el: "150 αναλύσεις τον μήνα", en: "150 analyses a month" }, included: true, highlight: true },
                    { claim: "agent.teamMembers", label: { el: "Ομάδα έως 3 ασφαλιστές", en: "A team of up to 3 agents" }, included: true },
                    { claim: "agent.crossSellIntelligence", label: { el: "Προτάσεις επιπλέον κάλυψης ανά πελάτη", en: "Extra-cover suggestions per client" }, included: true },
                    // «Οι αναλύσεις σας τρέχουν πρώτες» removed: the orchestrator stores a run `priority` but
                    // nothing reads it (QStash publishes each run unordered), so the claim had no behaviour behind it.
                    { claim: "agent.commissionTracking", label: { el: "Παρακολούθηση προμηθειών", en: "Commission tracking" }, included: true },
                ],
            },
            {
                key: "agent-agency",
                checkoutPlanId: "agent-agency",
                name: { el: "Agency", en: "Agency" },
                description: { el: "Για γραφεία σε ανάπτυξη", en: "For growing brokerages" },
                isContactPlan: true,
                pricing: {
                    monthly: {
                        value: 199,
                        period: { el: "/μήνα", en: "/month" },
                    },
                },
                features: [
                    { claim: "agent.clients", label: { el: "Απεριόριστοι πελάτες", en: "Unlimited clients" }, included: true, highlight: true },
                    { claim: "agent.analysesPerMonth", label: { el: "400 αναλύσεις τον μήνα", en: "400 analyses a month" }, included: true, highlight: true },
                    { claim: "agent.teamMembers", label: { el: "Απεριόριστη ομάδα", en: "Unlimited team members" }, included: true },
                    { claim: "agent.bulkImportRows", label: { el: "Απεριόριστη μαζική εισαγωγή πελατών", en: "Unlimited client import" }, included: true },
                    { claim: null, label: { el: "Υποστήριξη μέσω email", en: "Support by email" }, included: true },
                ],
            },
        ],
        comparisonTitle: {
            el: "Σύγκριση δυνατοτήτων ασφαλιστών",
            en: "Agent feature comparison",
        },
        comparisonRows: [
            {
                claim: "agent.clients",
                category: { el: "Χαρτοφυλάκιο πελατών", en: "Client portfolio" },
                name: { el: "Πελάτες", en: "Clients" },
                values: {
                    "agent-free": "10",
                    "agent-starter": "100",
                    "agent-pro": "500",
                    "agent-agency": { el: "Απεριόριστοι", en: "Unlimited" },
                },
            },
            {
                claim: "agent.clientScreen",
                name: { el: "Όλοι οι πελάτες σε μία οθόνη", en: "Every client on one screen" },
                values: {
                    "agent-free": true,
                    "agent-starter": true,
                    "agent-pro": true,
                    "agent-agency": true,
                },
            },
            {
                // The metered core of the agent product: an agent paying for a
                // plan has to be able to see how many policies it will read.
                // Figures are DEFAULT_ENTITLEMENT_LIMITS (plan-defaults.ts).
                // Pro and Agency read 150 / 400, the same as their cards (this
                // table said 200 / «Απεριόριστες» until 2026-10-21). Agent Free
                // is «—»: its count is not a promise the plan keeps.
                claim: "agent.analysesPerMonth",
                name: { el: "Αναλύσεις AI ανά μήνα", en: "AI analyses per month" },
                values: {
                    "agent-free": "—",
                    "agent-starter": "50",
                    "agent-pro": "150",
                    "agent-agency": "400",
                },
            },
            {
                claim: "agent.expiryList",
                category: { el: "Καθημερινή δουλειά", en: "Day-to-day work" },
                name: { el: "Λίστα με ό,τι λήγει", en: "A list of what is running out" },
                values: {
                    "agent-free": true,
                    "agent-starter": true,
                    "agent-pro": true,
                    "agent-agency": true,
                },
            },
            {
                // It imports CLIENT rows, not policies; Agent Free gets 10.
                claim: "agent.bulkImportRows",
                name: { el: "Προσθήκη πολλών πελατών μαζί", en: "Add many clients at once" },
                values: {
                    "agent-free": { el: "10 γραμμές", en: "10 rows" },
                    "agent-starter": { el: "100 γραμμές", en: "100 rows" },
                    "agent-pro": { el: "500 γραμμές", en: "500 rows" },
                    "agent-agency": { el: "Απεριόριστες", en: "Unlimited" },
                },
            },
            {
                claim: "agent.questionnaireTemplates",
                name: { el: "Ερωτηματολόγια πελατών", en: "Client questionnaires" },
                values: {
                    "agent-free": false,
                    "agent-starter": true,
                    "agent-pro": true,
                    "agent-agency": true,
                },
            },
            {
                claim: "agent.teamMembers",
                category: { el: "Η ομάδα σας", en: "Your team" },
                name: { el: "Μέλη ομάδας", en: "Team members" },
                values: {
                    "agent-free": "1",
                    "agent-starter": "1",
                    "agent-pro": "3",
                    "agent-agency": { el: "Απεριόριστα", en: "Unlimited" },
                },
            },
        ],
        faqTitle: {
            el: "Συχνές ερωτήσεις ασφαλιστών",
            en: "Agent FAQs",
        },
        faqItems: [
            {
                // The CRM denial, verbatim from app/(public)/solutions/agents/faqs.ts:
                // this tab lists client counts and bulk import beside plan prices,
                // which is exactly the broker-CRM read the site denies elsewhere.
                question: {
                    el: "Είναι το PolicyWallet CRM για ασφαλιστικά γραφεία;",
                    en: "Is PolicyWallet a CRM for insurance agencies?",
                },
                answer: {
                    el: "Είναι εργαλείο οργάνωσης πελατών και ασφαλιστηρίων. Σας βοηθά να βρίσκετε έγγραφα, ανανεώσεις και σημεία για έλεγχο. Η πρόσβαση στα στοιχεία εξαρτάται από τον ρόλο, τη σχέση με τον πελάτη και τα δικαιώματα που ισχύουν.",
                    en: "It is a tool for organising clients and policies. It helps you find documents, renewals and points to review. Access depends on your role, client relationship and permissions.",
                },
            },
            {
                question: {
                    el: "Μπορώ να διαχειρίζομαι πολλούς πελάτες;",
                    en: "Can I manage multiple clients?",
                },
                answer: {
                    el: "Ναι. Τα πλάνα για ασφαλιστές σας δίνουν όλους τους πελάτες σας σε ένα σημείο. Κάθε πλάνο έχει το δικό του όριο πελατών.",
                    en: "Yes. The agent plans put all your clients in one place. Each plan has its own client limit.",
                },
            },
            {
                question: {
                    el: "Μπορώ να προσκαλέσω πελάτες να βλέπουν τα ασφαλιστήριά τους;",
                    en: "Can I invite clients to view their policies?",
                },
                answer: {
                    el: "Ναι. Μοιράζεστε ασφαλιστήρια και αναφορές με τον πελάτη μέσα από την ίδια οθόνη.",
                    en: "Yes. You share policies and reports with your client from the same screen.",
                },
            },
            {
                question: {
                    el: "Υποστηρίζεται ομαδική συνεργασία στο γραφείο;",
                    en: "Do you support agency team collaboration?",
                },
                answer: {
                    el: "Ναι, στα μεγαλύτερα πλάνα. Κάθε μέλος της ομάδας βλέπει μόνο ό,τι του αναλογεί.",
                    en: "Yes, on the larger plans. Each team member sees only what is theirs.",
                },
            },
        ],
    },
}

