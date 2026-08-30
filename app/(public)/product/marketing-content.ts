import { Bell, Sparkles, Upload } from "lucide-react"
import { productCategories } from "@/lib/product/catalog"

/**
 * Product-page marketing copy, shared between the client page (rendering)
 * and the server wrapper (FAQPage / HowTo JSON-LD). Single source so the
 * structured data can never drift from the visible content.
 */

export const PRODUCT_STEPS = [
    {
        n: "01",
        icon: Upload,
        titleEl: "Στείλτε τα συμβόλαιά σας",
        titleEn: "Send us your policies",
        descEl: "Βγάλτε φωτογραφία ή στείλτε το PDF. Βρίσκουμε μόνοι μας όλα τα σημαντικά σημεία.",
        descEn: "Take a photo or send the PDF. We find every important point ourselves.",
    },
    {
        n: "02",
        icon: Sparkles,
        titleEl: "Τα διαβάζουμε για εσάς",
        titleEn: "We read them for you",
        // Gap detection is Family-gated; duplicate detection runs on every plan (D1 amended 2026-08-30) — the step names the plan.
        // This text also ships verbatim inside the HowTo JSON-LD.
        descEl: "Σας εξηγούμε τι καλύπτει και τι όχι, σε γλώσσα που καταλαβαίνετε, και εντοπίζουμε τις διπλές καλύψεις που ίσως πληρώνετε — και, με το Family, τα κενά της κάλυψής σας",
        descEn: "We explain what is covered and what is not, in words you actually understand, and we find the cover you may be paying for twice — and, with Family, the gaps in your protection",
    },
    {
        n: "03",
        icon: Bell,
        titleEl: "Σας κρατάμε ενήμερους",
        titleEn: "We keep you in the loop",
        descEl: "Σας ειδοποιούμε πριν λήξει κάτι — από το πλάνο Plus — και όταν βρούμε κάτι νέο στα έγγραφά σας, με το Family.",
        descEn: "We warn you before something runs out — from the Plus plan — and when we find something new in your documents, with Family."
    },
] as const

export const PRODUCT_STATS = [
    {
        valueEl: `${productCategories.length} είδη`,
        valueEn: `${productCategories.length} kinds`,
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
        valueEl: "Λίγα λεπτά",
        valueEn: "A few minutes",
        labelEl: "για να διαβαστούν τρία συμβόλαια",
        labelEn: "to read three policies",
    },
    {
        valueEl: "0",
        valueEn: "0",
        labelEl: "προμήθειες από ασφαλιστικές εταιρείες",
        labelEn: "commissions from insurance companies",
    },
] as const

export const PRODUCT_FAQS = [
    {
        qEl: "Πού φυλάσσονται τα έγγραφά μου;",
        qEn: "Where are my documents kept?",
        aEl: "Σε κρυπτογραφημένους διακομιστές μέσα στην Ευρωπαϊκή Ένωση. Δεν τα δείχνουμε ποτέ σε κανέναν χωρίς τη ρητή σας άδεια, δεν χρησιμοποιούνται για την εκπαίδευση μοντέλων AI, και τα διαγράφετε όποτε θέλετε.",
        aEn: "On encrypted servers inside the European Union. We never show them to anyone without your explicit permission, they are not used to train AI models, and you can delete them whenever you want.",
    },
    {
        qEl: "Δουλεύει με όλες τις ασφαλιστικές εταιρείες;",
        qEn: "Does it work with all insurance companies?",
        aEl: "Ναι. Αρκεί να έχετε το συμβόλαιο σε αρχείο ή φωτογραφία. Δεν έχει σημασία ποια εταιρεία ή ποιος ασφαλιστής σας το πούλησε.",
        aEn: "Yes. All we need is the policy as a file or a photo. It does not matter which company or which agent sold it to you.",
    },
    {
        qEl: "Πουλάτε ασφάλειες;",
        qEn: "Do you sell insurance?",
        aEl: "Όχι. Δεν είμαστε ασφαλιστική εταιρεία και δεν παίρνουμε προμήθεια από καμία. Πληρωνόμαστε μόνο από τη δική σας συνδρομή.",
        aEn: "No. We are not an insurance company and we take no commission from any of them. We are paid only by your subscription.",
    },
    {
        qEl: "Μπορώ να το δοκιμάσω δωρεάν;",
        qEn: "Can I try it for free?",
        aEl: "Ναι. Στείλτε έως 3 συμβόλαια και πάρτε την πλήρη ανάλυση, χωρίς πιστωτική κάρτα και χωρίς δέσμευση.",
        aEn: "Yes. Send us up to 3 policies and get the full analysis, with no credit card and no commitment.",
    },
] as const
