import type { Metadata } from "next"
import { OG_IMAGES, TWITTER_IMAGES } from "@/lib/seo/site"

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
    | "for-agents"
    | "product-motor"
    | "product-property"
    | "product-health"
    | "product-cyber"
    | "product-group-health"
    | "product-group-pension"
    | "product-pet"
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
            "Ανεβάστε τα ασφαλιστήριά σας σε PDF και η AI τα αναλύει σε λιγότερο από 30 δευτερόλεπτα: καλύψεις, κενά, υπενθυμίσεις ανανέωσης. Δωρεάν έως 3 συμβόλαια.",
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
                "Upload your insurance policies as PDFs and AI analyzes them in under 30 seconds: coverages, gaps and renewal reminders. Free for up to 3 policies.",
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
        description:
            "Στείλτε μας μήνυμα για υποστήριξη, τιμολόγηση ή συνεργασία. Απαντάμε Δευτέρα–Παρασκευή 09:00–18:00 στο hello@policywallet.com. Θα χαρούμε να βοηθήσουμε.",
        breadcrumb: "Επικοινωνία",
    },
    "solutions-agents": {
        path: "/solutions/agents",
        title: "Λογισμικό με AI για ασφαλιστικούς πράκτορες",
        description:
            "Χαρτοφυλάκιο πελατών, ανάλυση κενών με AI, pipeline ευκαιριών και υπενθυμίσεις ανανεώσεων για πράκτορες και πρακτορεία. Δείτε πώς λειτουργεί το PolicyWallet.",
        keywords: ["λογισμικό ασφαλιστικού πράκτορα", "CRM ασφαλιστών"],
        breadcrumb: "Για Πράκτορες",
        en: {
            title: "AI software for insurance agents",
            description:
                "Client portfolio oversight, AI coverage-gap analysis, opportunity pipeline and renewal reminders for insurance agents and agencies. See how PolicyWallet works.",
            breadcrumb: "For Agents",
        },
    },
    "for-agents": {
        path: "/for-agents",
        title: "Εργαλεία AI για ασφαλιστές και πρακτορεία",
        description:
            "KPIs χαρτοφυλακίου, AI ανάλυση καλύψεων και διαχείριση πελατών 360° για επαγγελματίες ασφαλιστές. Απλοποιήστε ανανεώσεις και cross-selling με το PolicyWallet.",
        breadcrumb: "Για Ασφαλιστές",
    },
    "product-motor": {
        path: "/product/motor",
        title: "Ασφάλεια αυτοκινήτου: ανάλυση καλύψεων με AI",
        description:
            "Παρακολουθήστε την εμπορική αξία του οχήματος, συγκρίνετε καλύψεις και εντοπίστε κενά όπως η οδική βοήθεια. Η AI διαβάζει το συμβόλαιό σας σε δευτερόλεπτα.",
        keywords: ["ασφάλεια αυτοκινήτου", "καλύψεις ασφάλειας αυτοκινήτου"],
        breadcrumb: "Αυτοκίνητο",
    },
    "product-property": {
        path: "/product/property",
        title: "Ασφάλεια κατοικίας: κενά, ΕΝΦΙΑ, rebuild cost",
        description:
            "Ελέγξτε αν το σπίτι σας είναι υπασφαλισμένο, αν δικαιούστε έκπτωση ΕΝΦΙΑ (σεισμός–φωτιά–πλημμύρα) και αν το κόστος ανακατασκευής είναι ενημερωμένο.",
        keywords: ["ασφάλεια κατοικίας", "έκπτωση ΕΝΦΙΑ ασφάλιση", "υπασφάλιση"],
        breadcrumb: "Κατοικία",
    },
    "product-health": {
        path: "/product/health",
        title: "Ασφάλεια υγείας: καλύψεις, απαλλαγές και όρια",
        description:
            "Κατανοήστε απαλλαγές, ανώτατα όρια και απευθείας κάλυψη νοσηλείας. Η AI εξηγεί το συμβόλαιο υγείας σας σε απλά ελληνικά και εντοπίζει τι σας λείπει.",
        keywords: ["ασφάλεια υγείας", "απαλλαγή ασφάλειας υγείας"],
        breadcrumb: "Υγεία",
    },
    "product-cyber": {
        path: "/product/cyber",
        title: "Κυβερνοασφάλεια: ransomware, διακοπή εργασιών",
        description:
            "Καλύψεις για ransomware, παραβιάσεις δεδομένων και διακοπή επιχειρηματικής λειτουργίας. Δείτε τι περιλαμβάνει η κυβερνοασφάλισή σας και πού έχετε κενά.",
        keywords: ["κυβερνοασφάλεια", "ασφάλιση cyber"],
        breadcrumb: "Κυβερνοασφάλεια",
    },
    "product-group-health": {
        path: "/product/group-health",
        title: "Ομαδική ασφάλιση υγείας για επιχειρήσεις",
        description:
            "Συντονισμός παροχών με ατομικά συμβόλαια, καθαρή εικόνα καλύψεων για κάθε εργαζόμενο και εντοπισμός επικαλύψεων με AI. Για HR και εργαζομένους.",
        keywords: ["ομαδική ασφάλιση υγείας", "ομαδικό συμβόλαιο επιχείρησης"],
        breadcrumb: "Ομαδική Υγεία",
    },
    "product-group-pension": {
        path: "/product/group-pension",
        title: "Ομαδική σύνταξη: φοροαπαλλαγές και προβολές",
        description:
            "Παρακολουθήστε το ομαδικό συνταξιοδοτικό σας πρόγραμμα: εισφορές, φορολογικά οφέλη και προβολή σύνταξης. Όλα σε ένα ασφαλές ψηφιακό πορτοφόλι.",
        keywords: ["ομαδικό συνταξιοδοτικό πρόγραμμα", "φοροαπαλλαγή σύνταξης"],
        breadcrumb: "Ομαδική Σύνταξη",
    },
    "product-pet": {
        path: "/product/pet",
        title: "Ασφάλεια κατοικιδίων για σκύλους και γάτες",
        description:
            "Καλύψεις υγείας για σκύλους και γάτες, έλεγχος κάλυψης για λεϊσμανίαση (καλαζάρ) και εξαιρέσεις φυλών. Η AI διαβάζει το συμβόλαιο του κατοικιδίου σας.",
        keywords: ["ασφάλεια κατοικιδίων", "ασφάλεια σκύλου", "λεϊσμανίαση κάλυψη"],
        breadcrumb: "Κατοικίδια",
    },
    guides: {
        path: "/guides",
        title: "Οδηγοί ασφάλισης: ΕΝΦΙΑ, κενά, ανανεώσεις",
        description:
            "Πρακτικοί οδηγοί για την ελληνική ασφαλιστική αγορά: πώς παίρνετε έκπτωση ΕΝΦΙΑ, πώς εντοπίζετε κενά κάλυψης και τι ελέγχετε πριν από κάθε ανανέωση.",
        keywords: ["οδηγοί ασφάλισης", "έκπτωση ΕΝΦΙΑ", "κενά κάλυψης"],
        breadcrumb: "Οδηγοί",
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
