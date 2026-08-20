import type { Metadata } from "next"
import { ogImagesFor, siteConfig, twitterImagesFor } from "@/lib/seo/site"

/**
 * Registry of unique metadata for every public marketing page.
 *
 * Titles are Greek-first and keyword-bearing, sized so that the root layout
 * template ("%s | PolicyWallet") lands them at ~50–60 characters. Meta
 * descriptions are 140–160 characters with a concrete value proposition.
 * Every page declares its own canonical path.
 */

export type MarketingPageKey =
    | "product"
    | "pricing"
    | "needs"
    | "compare"
    | "trust"
    | "platform"
    | "company"
    | "contact"
    | "solutions-agents"
    | "product-motor"
    | "product-property"
    | "product-health"
    | "product-cyber"
    | "product-group-health"
    | "product-group-pension"
    | "product-pet"
    | "product-life"
    | "product-travel"
    | "product-pension"
    | "product-boat"
    | "product-fine-art"
    | "product-business"
    | "product-liability"
    | "product-legal-expenses"
    | "product-group-life"
    | "guides"
    | "lexiko"
    | "privacy"
    | "terms"
    | "cookies"
    | "subprocessors"

type MarketingPageEntry = {
    path: string
    title: string
    description: string
    keywords?: string[]
    /** Breadcrumb label (Greek) used in BreadcrumbList JSON-LD. */
    breadcrumb: string
    /**
     * English variant served at /en{path}. Only pages that actually have an
     * English route declare this — hreflang must never point at a URL that
     * serves the wrong language, so the en pair is emitted only when set.
     */
    en?: { title: string; description: string; breadcrumb: string }
}

/** English variant path for a marketing page ("/product" → "/en/product"). */
export function enPathFor(path: string): string {
    return `/en${path}`
}

export const marketingPages: Record<MarketingPageKey, MarketingPageEntry> = {
    product: {
        path: "/product",
        // Leads with the answer the visitor gets, not with storage — "wallet"
        // and "upload PDFs" framing sold the filing cabinet, not the check.
        title: "Έλεγχος ασφάλισης με AI: καλύψεις και κενά",
        // "Free basic summary" — the meta must not fuse Plus-only outputs
        // (gaps, fix-first) with the free offer in one extractable span.
        description:
            "Στείλτε το ασφαλιστήριό σας και δείτε σε λίγα λεπτά τι καλύπτει και τι όχι, σε απλά ελληνικά. Δωρεάν βασική σύνοψη για 1 συμβόλαιο, χωρίς κάρτα.",
        keywords: [
            "έλεγχος ασφάλισης",
            "ανάλυση ασφαλιστηρίου AI",
            "κενά κάλυψης",
            "έλεγχος καλύψεων",
        ],
        breadcrumb: "Προϊόν",
        en: {
            title: "AI insurance check: coverages and gaps",
            description:
                "Send us your insurance policy and see in minutes what it covers and what it does not, in plain words. Free basic summary for 1 policy, no card needed.",
            breadcrumb: "Product",
        },
    },
    pricing: {
        path: "/pricing",
        title: "Τιμές: Δωρεάν, Starter €2.99, Plus €7.99/μήνα",
        description:
            "Καθαρές τιμές PolicyWallet: δωρεάν για 1 συμβόλαιο, Starter €2.99/μήνα, PolicyWallet Plus €7.99/μήνα με πλήρη ανάλυση AI. Ακύρωση όποτε θέλετε.",
        keywords: ["τιμές PolicyWallet", "συνδρομή PolicyWallet"],
        breadcrumb: "Τιμές",
        en: {
            title: "Pricing: Free, Starter €2.99, Plus €7.99/mo",
            description:
                "Clear PolicyWallet pricing: a free plan for 1 policy, Starter at €2.99/month and PolicyWallet Plus at €7.99/month with full AI analysis. Cancel anytime.",
            breadcrumb: "Pricing",
        },
    },
    needs: {
        path: "/needs",
        title: "Έλεγχος αναγκών ασφάλισης σε 6 ερωτήσεις",
        description:
            "Έξι ερωτήσεις που απαντάτε από μνήμη, και μια λίστα με το τι αξίζει να ελέγξετε στα ασφαλιστήριά σας. Χωρίς βαθμολογίες και χωρίς λογαριασμό.",
        keywords: [
            "ανάγκες ασφάλισης",
            "τι ασφάλεια χρειάζομαι",
            "έλεγχος ασφαλιστικών αναγκών",
            "κενά κάλυψης",
        ],
        breadcrumb: "Έλεγχος αναγκών",
        en: {
            title: "Insurance needs check in six questions",
            description:
                "Six questions you can answer from memory, and a list of what is worth checking on your own policies. No grade, no account, and nothing to upload.",
            breadcrumb: "Needs check",
        },
    },
    compare: {
        path: "/compare",
        title: "Σύγκριση με τις άλλες επιλογές",
        description:
            "Ο φάκελος στο συρτάρι, η ασφαλιστική σας, ο ασφαλιστής σας ή το PolicyWallet; Δείτε σε έναν καθαρό πίνακα τι κάνει το καθένα και τι δεν κάνει για εσάς.",
        keywords: [
            "σύγκριση ασφαλιστικών εργαλείων",
            "ανεξάρτητος έλεγχος ασφάλισης",
            "PolicyWallet σύγκριση",
        ],
        breadcrumb: "Σύγκριση",
        en: {
            title: "How PolicyWallet compares",
            description:
                "The folder in the drawer, your insurance company, your agent, or PolicyWallet? See in one clear table what each of them does, and what each one does not.",
            breadcrumb: "Compare",
        },
    },
    company: {
        path: "/company",
        title: "Η αποστολή μας: καθαρές απαντήσεις",
        description:
            "Δεν πουλάμε ασφάλειες και δεν παίρνουμε προμήθεια. Διαβάζουμε τις ασφάλειές σας και σας λέμε πού είστε καλυμμένοι και πού όχι. Δείτε γιατί το φτιάξαμε.",
        breadcrumb: "Εταιρεία",
        en: {
            title: "Our mission: clear answers",
            description:
                "We do not sell insurance and we take no commission. We read your insurance and tell you where you are covered and where you are not. See why we built it.",
            breadcrumb: "Company",
        },
    },
    contact: {
        path: "/contact",
        title: "Επικοινωνία: υποστήριξη και συνεργασίες",
        // The mailbox must match the one shown on the page and in the
        // Organization JSON-LD — a SERP snippet advertising a dead inbox is a
        // support black hole.
        description: `Στείλτε μας μήνυμα για υποστήριξη, τιμολόγηση ή συνεργασία. Απαντάμε Δευτέρα–Παρασκευή 09:00–18:00 στο ${siteConfig.contactEmail}. Θα χαρούμε να βοηθήσουμε.`,
        breadcrumb: "Επικοινωνία",
        en: {
            title: "Contact us: support and partnerships",
            description: `Send us a message about support, pricing or partnerships. We reply Monday–Friday 09:00–18:00 at ${siteConfig.contactEmail}. We will be happy to help.`,
            breadcrumb: "Contact",
        },
    },
    "solutions-agents": {
        path: "/solutions/agents",
        title: "Λογισμικό με AI για ασφαλιστικούς πράκτορες",
        description:
            "Όλοι οι πελάτες σας σε μία οθόνη: ανάλυση κενών με AI, υπενθυμίσεις λήξεων και αναφορές με το δικό σας όνομα, για ασφαλιστές και ασφαλιστικά γραφεία.",
        keywords: ["λογισμικό ασφαλιστικού πράκτορα", "CRM ασφαλιστών"],
        breadcrumb: "Για ασφαλιστές",
        en: {
            title: "AI software for insurance agents",
            description:
                "All your clients on one screen: AI coverage-gap analysis, renewal reminders and reports with your own name — for insurance agents and agencies.",
            breadcrumb: "For Agents",
        },
    },
    "product-motor": {
        path: "/product/motor",
        title: "Ασφάλεια αυτοκινήτου: ανάλυση καλύψεων με AI",
        // No "market value tracking": the product has no price feed (see the
        // catalog comment) — the meta promises exactly what the page delivers.
        description:
            "Δείτε τι θα πλήρωνε το συμβόλαιο του αυτοκινήτου σας σε ολική ζημιά, τι περιλαμβάνει η οδική βοήθεια και πού υπάρχουν κενά. Η AI το διαβάζει σε λίγα λεπτά.",
        keywords: ["ασφάλεια αυτοκινήτου", "καλύψεις ασφάλειας αυτοκινήτου"],
        breadcrumb: "Αυτοκίνητο",
        en: {
            title: "Car insurance in Greece: AI coverage analysis",
            description:
                "See what your car policy would pay on a total loss, what your roadside assistance includes, and where the gaps are. AI reads your policy in minutes.",
            breadcrumb: "Motor",
        },
    },
    "product-property": {
        path: "/product/property",
        title: "Ασφάλεια κατοικίας: κενά, ΕΝΦΙΑ, ανακατασκευή",
        description:
            "Ελέγξτε αν το σπίτι σας είναι υπασφαλισμένο, αν δικαιούστε έκπτωση ΕΝΦΙΑ (σεισμός–φωτιά–πλημμύρα) και αν το κόστος ανακατασκευής είναι ενημερωμένο.",
        keywords: ["ασφάλεια κατοικίας", "έκπτωση ΕΝΦΙΑ ασφάλιση", "υπασφάλιση"],
        breadcrumb: "Κατοικία",
        en: {
            title: "Home insurance: gaps, ENFIA, rebuild cost",
            description:
                "Check whether your home is underinsured, if you qualify for Greece's ENFIA tax discount (earthquake-fire-flood) and if your rebuild cost is current.",
            breadcrumb: "Property",
        },
    },
    "product-health": {
        path: "/product/health",
        title: "Ασφάλεια υγείας: καλύψεις, απαλλαγές και όρια",
        description:
            "Κατανοήστε απαλλαγές, ανώτατα όρια και απευθείας κάλυψη νοσηλείας. Η AI εξηγεί το συμβόλαιο υγείας σας σε απλά ελληνικά και εντοπίζει τι σας λείπει.",
        keywords: ["ασφάλεια υγείας", "απαλλαγή ασφάλειας υγείας"],
        breadcrumb: "Υγεία",
        en: {
            title: "Health insurance: deductibles and limits",
            description:
                "Understand deductibles, coverage caps and direct hospital billing. AI explains your health policy in plain language and shows what you are missing.",
            breadcrumb: "Health",
        },
    },
    "product-cyber": {
        path: "/product/cyber",
        title: "Κυβερνοασφάλεια: ransomware, διακοπή εργασιών",
        description:
            "Καλύψεις για ransomware, παραβιάσεις δεδομένων και διακοπή επιχειρηματικής λειτουργίας. Δείτε τι περιλαμβάνει η κυβερνοασφάλισή σας και πού έχετε κενά.",
        keywords: ["κυβερνοασφάλεια", "ασφάλιση cyber"],
        breadcrumb: "Κυβερνοασφάλεια",
        en: {
            title: "Cyber insurance: ransomware, interruption",
            description:
                "Coverage for ransomware, data breaches and business interruption. See exactly what your cyber policy includes, what it excludes and where your gaps are.",
            breadcrumb: "Cyber",
        },
    },
    "product-group-health": {
        path: "/product/group-health",
        title: "Ομαδική ασφάλιση υγείας για επιχειρήσεις",
        description:
            "Συντονισμός παροχών με ατομικά συμβόλαια, καθαρή εικόνα καλύψεων για κάθε εργαζόμενο και εντοπισμός επικαλύψεων με AI. Για HR και εργαζομένους.",
        keywords: ["ομαδική ασφάλιση υγείας", "ομαδικό συμβόλαιο επιχείρησης"],
        breadcrumb: "Ομαδική Υγεία",
        en: {
            title: "Group health insurance for businesses",
            description:
                "Coordinate employer benefits with personal policies, get a clear coverage picture per employee and detect overlaps with AI. For HR and employees.",
            breadcrumb: "Group Health",
        },
    },
    "product-group-pension": {
        path: "/product/group-pension",
        // "Projections" was removed from the page (no projection capability
        // exists) — the meta must promise only what the page keeps.
        title: "Ομαδική σύνταξη: εισφορές και φοροαπαλλαγές",
        description:
            "Παρακολουθήστε το ομαδικό συνταξιοδοτικό σας πρόγραμμα: εισφορές, εργοδοτική συμμετοχή και φορολογικά οφέλη, όλα σε μία καθαρή εικόνα με απλά λόγια.",
        keywords: ["ομαδικό συνταξιοδοτικό πρόγραμμα", "φοροαπαλλαγή σύνταξης"],
        breadcrumb: "Ομαδική Σύνταξη",
        en: {
            title: "Group pension: contributions and tax benefits",
            description:
                "Track your employer pension plan: contributions, employer match and tax advantages, all of it in one clear picture written in plain language.",
            breadcrumb: "Group Pension",
        },
    },
    "product-pet": {
        path: "/product/pet",
        title: "Ασφάλεια κατοικιδίων για σκύλους και γάτες",
        description:
            "Καλύψεις υγείας για σκύλους και γάτες, έλεγχος κάλυψης για λεϊσμανίαση (καλαζάρ) και εξαιρέσεις φυλών. Η AI διαβάζει το συμβόλαιο του κατοικιδίου σας.",
        keywords: ["ασφάλεια κατοικιδίων", "ασφάλεια σκύλου", "λεϊσμανίαση κάλυψη"],
        breadcrumb: "Κατοικίδια",
        en: {
            title: "Pet insurance for dogs and cats in Greece",
            description:
                "Health coverage for dogs and cats, leishmaniasis (kala-azar) coverage checks and breed exclusions. AI reads your pet's policy and shows what is covered.",
            breadcrumb: "Pet",
        },
    },
    "product-life": {
        path: "/product/life",
        title: "Ασφάλεια ζωής: προστασία οικογένειας, δανείου",
        description:
            "Παροχή θανάτου, μόνιμη αναπηρία, σοβαρές ασθένειες και προστασία στεγαστικού. Η AI διαβάζει το συμβόλαιο ζωής σας και δείχνει τι λείπει για τους δικούς σας.",
        keywords: ["ασφάλεια ζωής", "προστασία στεγαστικού δανείου", "κάλυψη σοβαρών ασθενειών"],
        breadcrumb: "Ζωή",
        en: {
            title: "Life insurance: family & mortgage protection",
            description:
                "Death benefit, permanent disability, serious illness and mortgage protection. The AI reads your life policy and shows what is missing for your family.",
            breadcrumb: "Life",
        },
    },
    "product-travel": {
        path: "/product/travel",
        title: "Ταξιδιωτική ασφάλεια: Σένγκεν και ακυρώσεις",
        description:
            "Ιατρικά έκτακτα στο εξωτερικό, ακύρωση ταξιδιού, αποσκευές και επαναπατρισμός. Ελέγξτε αν η κάλυψή σας αρκεί και για βίζα Σένγκεν πριν κλείσετε εισιτήρια.",
        keywords: ["ταξιδιωτική ασφάλεια", "ασφάλεια ταξιδιού Σένγκεν", "ακύρωση ταξιδιού"],
        breadcrumb: "Ταξιδιωτική",
        en: {
            title: "Travel insurance: Schengen and cancellations",
            description:
                "Medical emergencies abroad, trip cancellation, baggage and repatriation. Check whether your coverage also meets Schengen visa rules before booking.",
            breadcrumb: "Travel",
        },
    },
    "product-pension": {
        path: "/product/pension",
        title: "Συνταξιοδοτικό πρόγραμμα: εισφορές και όροι",
        description:
            "Εισφορές, επιλογές ωρίμανσης (εφάπαξ ή σύνταξη) και όροι εξαγοράς σε απλά ελληνικά. Η AI αναλύει το αποταμιευτικό σας πρόγραμμα και εντοπίζει τα κενά.",
        keywords: ["συνταξιοδοτικό πρόγραμμα", "αποταμιευτικό πρόγραμμα", "ιδιωτική σύνταξη"],
        breadcrumb: "Σύνταξη & Αποταμίευση",
        en: {
            title: "Pension plans: contributions and terms",
            description:
                "Contributions, maturity options (lump sum or annuity) and surrender terms in plain language. AI analyzes your savings plan and finds the gaps.",
            breadcrumb: "Pension & Savings",
        },
    },
    "product-boat": {
        path: "/product/boat",
        title: "Ασφάλεια σκάφους: αστική ευθύνη στη θάλασσα",
        description:
            "Η αστική ευθύνη σκάφους αναψυχής είναι υποχρεωτική στα ελληνικά ύδατα. Δείτε κάλυψη σκάφους και μηχανής, επιθαλάσσια αρωγή και όρια πριν σαλπάρετε.",
        keywords: ["ασφάλεια σκάφους", "αστική ευθύνη σκάφους", "ασφάλιση σκάφους αναψυχής"],
        breadcrumb: "Σκάφος",
        en: {
            title: "Boat insurance: liability in Greek waters",
            description:
                "Liability insurance is mandatory for pleasure craft in Greek waters. Review hull and engine cover, sea assistance and limits before you set sail.",
            breadcrumb: "Boat",
        },
    },
    "product-fine-art": {
        path: "/product/fine-art",
        title: "Ασφάλεια έργων τέχνης: συμφωνημένη αξία",
        description:
            "Έργα τέχνης και τιμαλφή ασφαλίζονται ανά αντικείμενο, σε συμφωνημένη αξία. Δείτε την κατάσταση αντικειμένων, τους όρους ασφαλείας κι αν ο σεισμός έχει επιλεγεί.",
        keywords: ["ασφάλεια έργων τέχνης", "ασφάλιση τιμαλφών", "συμφωνημένη αξία"],
        breadcrumb: "Έργα Τέχνης & Τιμαλφή",
        en: {
            title: "Fine art insurance: agreed values & terms",
            description:
                "Artworks and valuables are insured item by item, at agreed values. See the schedule of items, the security conditions and whether earthquake cover was taken.",
            breadcrumb: "Fine Art & Valuables",
        },
    },
    "product-business": {
        path: "/product/business",
        title: "Ασφάλεια επιχείρησης: πολυκάλυψη για ΜμΕ",
        description:
            "Στέγη, εξοπλισμός, εμπορεύματα, διακοπή εργασιών και αστική ευθύνη σε μία εικόνα. Η AI χαρτογραφεί τα συμβόλαια της επιχείρησής σας και δείχνει τα κενά.",
        keywords: ["ασφάλεια επιχείρησης", "πολυασφαλιστήριο επιχείρησης", "ασφάλιση καταστήματος"],
        breadcrumb: "Επιχείρηση",
        en: {
            title: "Business insurance: multi-cover for SMEs",
            description:
                "Premises, equipment, stock, business interruption and liability in one picture. AI maps your company's policies and shows where the gaps are.",
            breadcrumb: "Business",
        },
    },
    "product-liability": {
        path: "/product/liability",
        title: "Αστική ευθύνη: η κάλυψη που ίσως έχετε ήδη",
        description:
            "Ζημιές σε τρίτους από εσάς, το παιδί ή τον σκύλο σας. Η αστική ευθύνη συχνά υπάρχει ήδη μέσα στο συμβόλαιο κατοικίας — δείτε το πριν την ξαναπληρώσετε.",
        keywords: ["αστική ευθύνη", "ασφάλεια αστικής ευθύνης", "οικογενειακή αστική ευθύνη"],
        breadcrumb: "Αστική Ευθύνη",
        en: {
            title: "Personal liability: cover you may own",
            description:
                "Damage to third parties caused by you, your child or your dog. Liability cover often already sits inside your home policy — check before paying for it twice.",
            breadcrumb: "Liability",
        },
    },
    "product-legal-expenses": {
        path: "/product/legal-expenses",
        title: "Νομική προστασία: τι καλύπτει πραγματικά",
        description:
            "Δικηγόροι, δικαστήρια, εξωδικαστικές διαφορές: τροχαία, εργασιακά, καταναλωτικά. Δείτε τι καλύπτει το συμβόλαιο νομικής προστασίας και τι εξαιρεί.",
        keywords: ["νομική προστασία", "ασφάλεια νομικής προστασίας", "νομική προστασία οδηγού"],
        breadcrumb: "Νομική Προστασία",
        en: {
            title: "Legal expenses insurance, made clear",
            description:
                "Lawyer fees, court costs and out-of-court disputes: traffic, employment, consumer. See what your legal expenses policy actually covers and what it excludes.",
            breadcrumb: "Legal Expenses",
        },
    },
    "product-group-life": {
        path: "/product/group-life",
        title: "Ομαδική ασφάλιση ζωής για το προσωπικό",
        description:
            "Κεφάλαιο ζωής και ανικανότητας για κάθε εργαζόμενο, δίπλα στην ομαδική υγεία και σύνταξη. Δείτε τις παροχές του προγράμματός σας σε μία καθαρή εικόνα.",
        keywords: ["ομαδική ασφάλιση ζωής", "ομαδικό συμβόλαιο ζωής", "παροχές προσωπικού"],
        breadcrumb: "Ομαδική Ζωή",
        en: {
            title: "Group life insurance for your team",
            description:
                "A life and disability benefit for every employee, alongside group health and pension. See your plan benefits per person in one clear, organized picture.",
            breadcrumb: "Group Life",
        },
    },
    guides: {
        path: "/guides",
        title: "Οδηγοί ασφάλισης: ΕΝΦΙΑ, κενά, ανανεώσεις",
        description:
            "Πρακτικοί οδηγοί για την ελληνική ασφαλιστική αγορά: πώς παίρνετε έκπτωση ΕΝΦΙΑ, πώς εντοπίζετε κενά κάλυψης και τι ελέγχετε πριν από κάθε ανανέωση.",
        keywords: ["οδηγοί ασφάλισης", "έκπτωση ΕΝΦΙΑ", "κενά κάλυψης"],
        breadcrumb: "Οδηγοί",
        en: {
            title: "Insurance guides: ENFIA, gaps, renewals",
            description:
                "Practical guides to the Greek insurance market: how the ENFIA tax discount works, how to spot coverage gaps and what to check before every renewal.",
            breadcrumb: "Guides",
        },
    },
    lexiko: {
        path: "/lexiko",
        title: "Ασφαλιστικό λεξικό: όροι σε απλά ελληνικά",
        description:
            "Τι σημαίνει απαλλαγή, εξαίρεση, ασφαλισμένο κεφάλαιο; Σύντομοι ορισμοί ασφαλιστικών όρων, με οδηγό για το πού βρίσκεται ο καθένας στο δικό σας συμβόλαιο.",
        keywords: [
            "ασφαλιστικό λεξικό",
            "ασφαλιστικοί όροι",
            "τι σημαίνει απαλλαγή",
            "τι είναι το ασφαλιστήριο",
        ],
        breadcrumb: "Λεξικό",
        en: {
            title: "Insurance glossary: terms in plain language",
            description:
                "What do deductible, exclusion and sum insured mean? Short, clear definitions of insurance terms, with a guide to finding each one in your own policy.",
            breadcrumb: "Glossary",
        },
    },
    privacy: {
        path: "/privacy",
        title: "Πολιτική Απορρήτου",
        // States the rights you can exercise, not a self-graded compliance
        // verdict — same rule as TRUST_FACTS in lib/marketing/positioning.ts.
        description:
            "Πώς συλλέγουμε, αποθηκεύουμε και προστατεύουμε τα δεδομένα σας: κρυπτογράφηση, διακομιστές στην Ευρώπη και δικαιώματα GDPR — αντίγραφο ή διαγραφή όποτε θέλετε.",
        breadcrumb: "Πολιτική Απορρήτου",
        en: {
            title: "Privacy Policy",
            description:
                "How PolicyWallet collects, stores and protects your data: encryption, European servers and your GDPR rights — ask for a copy or a deletion at any time.",
            breadcrumb: "Privacy Policy",
        },
    },
    terms: {
        path: "/terms",
        title: "Όροι Χρήσης",
        description:
            "Οι όροι χρήσης της πλατφόρμας PolicyWallet: λογαριασμοί, συνδρομές, δικαιώματα και υποχρεώσεις για ιδιώτες, ασφαλιστικούς πράκτορες και πρακτορεία.",
        breadcrumb: "Όροι Χρήσης",
        en: {
            title: "Terms of Service",
            description:
                "The terms governing the PolicyWallet platform: accounts, subscriptions, rights and obligations for individuals, insurance agents and agencies.",
            breadcrumb: "Terms of Service",
        },
    },
    cookies: {
        path: "/cookies",
        title: "Πολιτική Cookies",
        description:
            "Ποια cookies χρησιμοποιεί το PolicyWallet, για ποιον σκοπό και για πόσο: cookies σύνδεσης, προτιμήσεις συγκατάθεσης και πώς τα διαχειρίζεστε.",
        breadcrumb: "Πολιτική Cookies",
        en: {
            title: "Cookie Policy",
            description:
                "Which cookies PolicyWallet uses, for what purpose and for how long: session cookies, consent preferences and how you can manage them at any time.",
            breadcrumb: "Cookie Policy",
        },
    },
    trust: {
        path: "/trust",
        title: "Εμπιστοσύνη και προστασία δεδομένων",
        description:
            "Πού δεν πηγαίνουν τα δεδομένα σας, ποιος μπορεί να τα δει, πόσο κρατάμε τα αρχεία πρόσβασης και πώς παίρνετε αντίγραφο ή ζητάτε διαγραφή του λογαριασμού.",
        breadcrumb: "Εμπιστοσύνη",
        en: {
            title: "Trust and data governance",
            description:
                "Where your data does not go, who can see it, how long we keep access records, and how you download a copy of your data or ask for its deletion.",
            breadcrumb: "Trust",
        },
    },
    platform: {
        path: "/platform",
        title: "Πώς δουλεύει η ανάλυση",
        description:
            "Το ασφαλιστήριο γίνεται δομημένα δεδομένα, κανόνες αποφασίζουν ποια κενά κάλυψης υπάρχουν και η τεχνητή νοημοσύνη τα εξηγεί, με αυτή τη σειρά.",
        breadcrumb: "Πώς δουλεύει",
        en: {
            title: "How the analysis works",
            description:
                "Your policy becomes structured data, rules decide which coverage gaps exist, and the AI explains them, in that order, with every rule recorded.",
            breadcrumb: "How it works",
        },
    },
    subprocessors: {
        path: "/subprocessors",
        title: "Υπο-εκτελούντες Επεξεργασίας",
        description:
            "Οι τεχνικοί πάροχοι που επεξεργάζονται δεδομένα για λογαριασμό του PolicyWallet: ρόλος, κατηγορίες δεδομένων και τοποθεσία επεξεργασίας για καθέναν.",
        breadcrumb: "Υπο-εκτελούντες",
        en: {
            title: "Subprocessors",
            description:
                "The technical providers that process data on behalf of PolicyWallet: the role, data categories and processing location for each subprocessor.",
            breadcrumb: "Subprocessors",
        },
    },
}

// For pages that localize via ?lang= (or Accept-Language) on the Greek route —
// the legal set. The copy must follow the served language so the browser-tab
// title matches what the reader sees, but URL identity (canonical + hreflang)
// stays the Greek route's: the ?lang= variant is a parameterized duplicate of
// this URL, not a separate document (the real English document lives at /en/*).
export function buildLegalPageMetadata(
    key: MarketingPageKey,
    language: "el" | "en"
): Metadata {
    if (language !== "en") return buildMarketingMetadata(key)
    const meta = buildMarketingMetadata(key, "en")
    meta.alternates = buildMarketingMetadata(key).alternates
    if (meta.openGraph) meta.openGraph.url = marketingPages[key].path
    return meta
}

export function buildMarketingMetadata(
    key: MarketingPageKey,
    locale: "el" | "en" = "el"
): Metadata {
    const page = marketingPages[key]
    const isEnglish = locale === "en"
    const copy = isEnglish && page.en ? page.en : page
    const canonical = isEnglish ? enPathFor(page.path) : page.path

    // Greek is always self-referenced; the en pair only exists for pages
    // with a real English route; x-default → the Greek page (primary market).
    const languages: Record<string, string> = { el: page.path }
    if (page.en) {
        languages.en = enPathFor(page.path)
    }
    languages["x-default"] = page.path

    return {
        title: copy.title,
        description: copy.description,
        ...(isEnglish ? {} : { keywords: page.keywords }),
        alternates: {
            canonical,
            languages,
        },
        openGraph: {
            type: "website",
            locale: isEnglish ? "en_US" : "el_GR",
            url: canonical,
            siteName: "PolicyWallet",
            title: copy.title,
            description: copy.description,
            images: ogImagesFor(locale),
        },
        twitter: {
            card: "summary_large_image",
            title: copy.title,
            description: copy.description,
            images: twitterImagesFor(locale),
        },
    }
}
