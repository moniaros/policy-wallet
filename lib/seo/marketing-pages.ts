import type { Metadata } from "next"
import { OG_IMAGES, siteConfig, TWITTER_IMAGES } from "@/lib/seo/site"

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
    | "product-business"
    | "product-liability"
    | "product-legal-expenses"
    | "product-group-life"
    | "guides"
    | "privacy"
    | "terms"

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
        title: "Ψηφιακό πορτοφόλι ασφαλίσεων με ανάλυση AI",
        description:
            "Ανεβάστε τα ασφαλιστήριά σας σε PDF και η AI τα αναλύει σε λιγότερο από 30 δευτερόλεπτα: καλύψεις, κενά, υπενθυμίσεις ανανέωσης. Δωρεάν για 1 συμβόλαιο.",
        keywords: [
            "διαχείριση ασφαλιστηρίων",
            "ανάλυση ασφαλιστηρίου AI",
            "κενά κάλυψης",
            "ψηφιακό ασφαλιστικό πορτοφόλι",
        ],
        breadcrumb: "Προϊόν",
        en: {
            title: "Digital insurance wallet with AI analysis",
            description:
                "Upload your insurance policies as PDFs and AI analyzes them in under 30 seconds: coverages, gaps and renewal reminders. Free for 1 policy, no card needed.",
            breadcrumb: "Product",
        },
    },
    pricing: {
        path: "/pricing",
        title: "Τιμές: Δωρεάν, Starter 2,99€, Plus 7,99€/μήνα",
        description:
            "Διαφανής τιμολόγηση PolicyWallet: δωρεάν για 1 συμβόλαιο, Starter 2,99€/μήνα για οργάνωση, Plus 7,99€/μήνα με πλήρη AI ανάλυση. Ακύρωση όποτε θέλετε.",
        keywords: ["τιμές PolicyWallet", "συνδρομή διαχείρισης ασφαλιστηρίων"],
        breadcrumb: "Τιμολόγηση",
        en: {
            title: "Pricing: Free, Starter €2.99, Plus €7.99/mo",
            description:
                "Transparent PolicyWallet pricing: a free plan for 1 policy, Starter at €2.99/month for basic organization, and Plus at €7.99/month. Cancel anytime.",
            breadcrumb: "Pricing",
        },
    },
    company: {
        path: "/company",
        title: "Η αποστολή μας: διαφάνεια στην ασφάλιση",
        description:
            "Το PolicyWallet είναι το ουδέτερο ψηφιακό πορτοφόλι ασφαλίσεων: οργανώνει τα συμβόλαιά σας και εντοπίζει κενά κάλυψης με AI. Δείτε τις αξίες μας.",
        breadcrumb: "Εταιρεία",
        en: {
            title: "Our mission: transparency in insurance",
            description:
                "PolicyWallet is the neutral digital insurance wallet: it organizes your policies and detects coverage gaps with AI. Meet the values and team behind it.",
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
            "Χαρτοφυλάκιο πελατών, ανάλυση κενών με AI, υπενθυμίσεις ανανεώσεων και branded αναφορές για πράκτορες και πρακτορεία. Δείτε πώς λειτουργεί το PolicyWallet.",
        keywords: ["λογισμικό ασφαλιστικού πράκτορα", "CRM ασφαλιστών"],
        breadcrumb: "Για Πράκτορες",
        en: {
            title: "AI software for insurance agents",
            description:
                "Client portfolio oversight, AI coverage-gap analysis, renewal reminders and branded reports for insurance agents and agencies. See how PolicyWallet works.",
            breadcrumb: "For Agents",
        },
    },
    "product-motor": {
        path: "/product/motor",
        title: "Ασφάλεια αυτοκινήτου: ανάλυση καλύψεων με AI",
        description:
            "Παρακολουθήστε την εμπορική αξία του οχήματος, συγκρίνετε καλύψεις και εντοπίστε κενά όπως η οδική βοήθεια. Η AI διαβάζει το συμβόλαιό σας σε δευτερόλεπτα.",
        keywords: ["ασφάλεια αυτοκινήτου", "καλύψεις ασφάλειας αυτοκινήτου"],
        breadcrumb: "Αυτοκίνητο",
        en: {
            title: "Car insurance in Greece: AI coverage analysis",
            description:
                "Track your vehicle's market value, compare coverages and spot gaps like missing roadside assistance. AI reads your motor policy in under 30 seconds.",
            breadcrumb: "Motor",
        },
    },
    "product-property": {
        path: "/product/property",
        title: "Ασφάλεια κατοικίας: κενά, ΕΝΦΙΑ, rebuild cost",
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
        title: "Ομαδική σύνταξη: φοροαπαλλαγές και προβολές",
        description:
            "Παρακολουθήστε το ομαδικό συνταξιοδοτικό σας πρόγραμμα: εισφορές, φορολογικά οφέλη και προβολή σύνταξης. Όλα σε ένα ασφαλές ψηφιακό πορτοφόλι.",
        keywords: ["ομαδικό συνταξιοδοτικό πρόγραμμα", "φοροαπαλλαγή σύνταξης"],
        breadcrumb: "Ομαδική Σύνταξη",
        en: {
            title: "Group pension: tax benefits and projections",
            description:
                "Track your employer pension plan: contributions, tax advantages and retirement projections. Everything organized in one secure digital insurance wallet.",
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
                "Death benefit, permanent disability, critical illness and mortgage protection. AI reads your life policy and shows what is missing for your family.",
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
    privacy: {
        path: "/privacy",
        title: "Πολιτική Απορρήτου",
        description:
            "Πώς το PolicyWallet συλλέγει, αποθηκεύει και προστατεύει τα δεδομένα σας: κρυπτογράφηση, ευρωπαϊκοί servers και πλήρης συμμόρφωση με τον GDPR.",
        breadcrumb: "Πολιτική Απορρήτου",
    },
    terms: {
        path: "/terms",
        title: "Όροι Χρήσης",
        description:
            "Οι όροι χρήσης της πλατφόρμας PolicyWallet: λογαριασμοί, συνδρομές, δικαιώματα και υποχρεώσεις για ιδιώτες, ασφαλιστικούς πράκτορες και πρακτορεία.",
        breadcrumb: "Όροι Χρήσης",
    },
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
            images: OG_IMAGES,
        },
        twitter: {
            card: "summary_large_image",
            title: copy.title,
            description: copy.description,
            images: TWITTER_IMAGES,
        },
    }
}
