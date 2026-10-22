import { Bell, Sparkles, Upload } from "lucide-react"
import { BASIC_WHEN } from "@/lib/renewals/reminder-copy"
import { PUBLIC_COUNTS } from "@/lib/marketing/public-counts"
import { FREE_UP_TO } from "@/lib/marketing/limit-statement"

/**
 * Product-page marketing copy, shared between the client page (rendering)
 * and the server wrapper (FAQPage / HowTo JSON-LD). Single source so the
 * structured data can never drift from the visible content.
 */

export const PRODUCT_STEPS = [
    {
        n: "01",
        icon: Upload,
        titleEl: "Στείλτε τα ασφαλιστήριά σας",
        titleEn: "Send us your policies",
        descEl: "Ανεβάστε ένα ευανάγνωστο PDF ή φωτογραφία ασφαλιστηρίου. Διαβάζουμε τα στοιχεία που μπορούμε να αναγνωρίσουμε.",
        descEn: "Upload a legible policy PDF or photo. We read the information we can identify.",
    },
    {
        n: "02",
        icon: Sparkles,
        titleEl: "Τα διαβάζουμε για εσάς",
        titleEn: "We read them for you",
        // Gap detection is Family-gated; duplicate detection runs on every plan (D1 amended 2026-08-30) — the step names the plan.
        // This text also ships verbatim inside the HowTo JSON-LD.
        descEl: "Σας εξηγούμε τις καλύψεις και τους όρους που διαβάστηκαν. Δείτε πιθανές κοινές καλύψεις και, με το Family, σημεία που χρειάζονται έλεγχο.",
        descEn: "We explain the cover and terms that were read. See possible overlapping cover and, with Family, points that need checking.",
    },
    {
        n: "03",
        icon: Bell,
        titleEl: "Σας κρατάμε ενήμερους",
        titleEn: "We keep you in the loop",
        descEl: `Σας ειδοποιούμε με email πριν λήξει κάτι — μία υπενθύμιση ${BASIC_WHEN.el} σε όλα τα πλάνα, περισσότερες στα Plus και Family — και όταν βρούμε κάτι νέο στα έγγραφά σας, με το Family.`,
        descEn: `We email you before something runs out — one reminder ${BASIC_WHEN.en} on every plan, more on Plus and Family — and when we find something new in your documents, with Family.`
    },
] as const

export const PRODUCT_STATS = [
    {
        // Every number in a stat tile reads from lib/marketing/public-counts.ts,
        // the one verified source for a public count. A numeric literal here
        // fails tests/unit/no-fabricated-public-count.test.ts
        // (PW-TRANSPARENCY-02 amendment 01, A1.3).
        valueEl: `${PUBLIC_COUNTS.insuranceKinds.value} είδη`,
        valueEn: `${PUBLIC_COUNTS.insuranceKinds.value} kinds`,
        labelEl: "ασφάλισης, σε ένα μέρος",
        labelEn: "of insurance, in one place",
    },
    {
        // "πολιτική" is the Greek word for a political or company policy, not
        // an insurance one. The label used to read "για ανάλυση κάθε
        // πολιτικής" — a literal translation of "policy" that says the wrong
        // thing in Greek.
        // Minutes, not seconds — the one speed claim the whole site makes
        // (SPEED_CLAIM in lib/marketing/positioning.ts).
        valueEl: "Συγκεντρωμένα",
        valueEn: "In one place",
        labelEl: "τα βασικά στοιχεία των ασφαλιστηρίων σας",
        labelEn: "key details from your policies",
    },
    {
        valueEl: `${PUBLIC_COUNTS.insurerCommissions.value}`,
        valueEn: `${PUBLIC_COUNTS.insurerCommissions.value}`,
        labelEl: "προμήθειες από ασφαλιστικές εταιρείες",
        labelEn: "commissions from insurance companies",
    },
] as const

export const PRODUCT_FAQS = [
    {
        qEl: "Πού φυλάσσονται τα έγγραφά μου;",
        qEn: "Where are my documents kept?",
        aEl: "Τα αρχεία αποθηκεύονται κρυπτογραφημένα στην ΕΕ. Για την ανάλυση, με τη συγκατάθεσή σας, το έγγραφο στέλνεται σε πάροχο τεχνητής νοημοσύνης που μπορεί να το επεξεργαστεί εκτός ΕΕ. Δείτε την Πολιτική Απορρήτου για πρόσβαση, αντίγραφο και διαγραφή.",
        aEn: "Files are stored encrypted in the EU. With your consent, analysis sends the document to an AI provider that may process it outside the EU. See the Privacy Policy for access, copies and deletion.",
    },
    {
        qEl: "Δουλεύει με όλες τις ασφαλιστικές εταιρείες;",
        qEn: "Does it work with all insurance companies?",
        aEl: "Ναι. Αρκεί να έχετε το ασφαλιστήριο σε αρχείο ή φωτογραφία. Δεν έχει σημασία ποια εταιρεία ή ποιος ασφαλιστής σας το πούλησε.",
        aEn: "Yes. All we need is the policy as a file or a photo. It does not matter which company or which agent sold it to you.",
    },
    {
        qEl: "Πουλάτε ασφάλειες;",
        qEn: "Do you sell insurance?",
        aEl: "Όχι. Δεν είμαστε ασφαλιστική εταιρεία και δεν παίρνουμε προμήθεια από καμία.",
        aEn: "No. We are not an insurance company and we take no commission from any of them.",
    },
    {
        qEl: "Μπορώ να το δοκιμάσω δωρεάν;",
        qEn: "Can I try it for free?",
        aEl: `Ναι. Ο δωρεάν λογαριασμός χωρά ${FREE_UP_TO.el}, χωρίς κάρτα. Οι πρόσθετες λειτουργίες περιγράφονται στη σελίδα με τα πλάνα.`,
        aEn: `Yes. The free account holds ${FREE_UP_TO.en} without a payment card. Additional features are listed on the plans page.`,
    },
] as const
