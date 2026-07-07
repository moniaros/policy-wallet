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
        titleEl: "Ανεβάστε τα ασφαλιστήριά σας",
        titleEn: "Upload your policies",
        descEl: "Φωτογραφίστε ή μεταφορτώστε οποιοδήποτε PDF. Η AI μας εξάγει αυτόματα όλους τους βασικούς όρους.",
        descEn: "Snap a photo or upload any PDF. Our AI automatically extracts every key term for you.",
    },
    {
        n: "02",
        icon: Sparkles,
        titleEl: "Αφήστε την AI να εργαστεί",
        titleEn: "Let the AI work",
        descEl: "Ανάλυση κενών, σύγκριση καλύψεων και επισήμανση κινδύνων σε δευτερόλεπτα, σε γλώσσα που καταλαβαίνετε.",
        descEn: "Gap analysis, coverage comparison, and risk flagging in seconds, in language you actually understand.",
    },
    {
        n: "03",
        icon: Bell,
        titleEl: "Μείνετε ένα βήμα μπροστά",
        titleEn: "Stay one step ahead",
        descEl: "Λαμβάνετε έξυπνες υπενθυμίσεις ανανέωσης, ειδοποιήσεις αλλαγής τιμών και νέες συστάσεις κάλυψης.",
        descEn: "Receive smart renewal reminders, price-change alerts, and new coverage recommendations.",
    },
] as const

export const PRODUCT_STATS = [
    {
        valueEl: `${productCategories.length} κατηγορίες`,
        valueEn: `${productCategories.length} categories`,
        labelEl: "ασφάλισης σε μία πλατφόρμα",
        labelEn: "of insurance in one place",
    },
    {
        valueEl: "< 30''",
        valueEn: "< 30s",
        labelEl: "για ανάλυση κάθε πολιτικής",
        labelEn: "to analyze any policy",
    },
    {
        valueEl: "100%",
        valueEn: "100%",
        labelEl: "δεδομένα υπό τον έλεγχό σας",
        labelEn: "of your data under your control",
    },
] as const

export const PRODUCT_FAQS = [
    {
        qEl: "Πού αποθηκεύονται τα έγγραφά μου;",
        qEn: "Where are my documents stored?",
        aEl: "Τα έγγραφά σας αποθηκεύονται σε κρυπτογραφημένα, ευρωπαϊκά servers. Δεν τα μοιραζόμαστε ποτέ χωρίς τη ρητή σας συγκατάθεση.",
        aEn: "Your documents are stored on encrypted, EU-based servers. We never share them without your explicit consent.",
    },
    {
        qEl: "Λειτουργεί με όλες τις ασφαλιστικές εταιρείες;",
        qEn: "Does it work with all insurance companies?",
        aEl: "Ναι. Εφόσον έχετε το ασφαλιστήριο σε PDF, η AI μας μπορεί να το αναλύσει, ανεξάρτητα από ασφαλιστή ή μεσίτη.",
        aEn: "Yes. As long as you have the policy PDF, our AI can analyze it regardless of insurer or broker.",
    },
    {
        qEl: "Υπάρχει δωρεάν πρόσβαση;",
        qEn: "Is there a free tier?",
        aEl: "Ναι, μπορείτε να ξεκινήσετε δωρεάν. Ανεβάστε έως 3 ασφαλιστήρια και δοκιμάστε την AI ανάλυση χωρίς πιστωτική κάρτα.",
        aEn: "Yes, you can start for free. Upload up to 3 policies and try the AI analysis without a credit card.",
    },
] as const
