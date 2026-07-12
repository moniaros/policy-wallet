import type { BranchContent } from './types'

export const cyberContent: BranchContent = {
    branchId: 'cyber',
    tagline: {
        el: 'Οι online συναλλαγές σου έχουν κινδύνους — δες τι από αυτά καλύπτει το συμβόλαιό σου.',
        en: 'Your online life carries risks — see which of them your policy covers.',
    },
    shortDescription: {
        el: 'Online απάτη, κλοπή ταυτότητας, προστασία καρτών, νομική και τεχνική υποστήριξη: τι φαίνεται να προβλέπει η cyber κάλυψή σου και τι πρέπει να κάνεις σε περιστατικό.',
        en: 'Online fraud, identity theft, card protection, legal and technical support: what your cyber cover appears to provide and what to do in an incident.',
    },
    whyItMatters: [
        {
            el: 'Σε απάτη με κάρτα ή phishing, ο χρόνος μετράει: οι καλύψεις συχνά απαιτούν άμεση δήλωση στην τράπεζα και στις αρχές.',
            en: 'In card fraud or phishing, time matters: covers often require immediate reporting to the bank and the authorities.',
        },
        {
            el: 'Τα όρια αποζημίωσης στις cyber καλύψεις είναι συνήθως ανά περιστατικό και ανά έτος — καλό να τα ξέρεις πριν τα χρειαστείς.',
            en: 'Cyber cover limits are usually per incident and per year — worth knowing before you need them.',
        },
        {
            el: 'Οι υποχρεώσεις σου (ενημερωμένο λογισμικό, μη κοινοποίηση κωδικών) είναι προϋπόθεση κάλυψης σε πολλά συμβόλαια.',
            en: 'Your obligations (updated software, not sharing credentials) are a coverage condition in many policies.',
        },
    ],
    whatWeAnalyze: [
        {
            el: 'Με βάση το έγγραφο που ανέβασες: τι καλύπτεται σε online απάτη, κλοπή ταυτότητας και μη εξουσιοδοτημένες συναλλαγές.',
            en: 'Based on the document you uploaded: what is covered for online fraud, identity theft and unauthorised transactions.',
        },
        {
            el: 'Όρια αποζημίωσης, απαλλαγές και εξαιρέσεις — μαζί με τις υποχρεώσεις σου ως χρήστη.',
            en: 'Limits, deductibles and exclusions — together with your obligations as a user.',
        },
        {
            el: 'Υπηρεσίες υποστήριξης: νομική βοήθεια, τεχνική υποστήριξη, ψυχολογική στήριξη σε cyberbullying, όπου προβλέπονται.',
            en: 'Support services: legal aid, technical support, cyberbullying counselling, where provided.',
        },
    ],
    howToUseBetter: [
        {
            el: 'Μάθε από πριν τα βήματα περιστατικού: τράπεζα → αρχές (Δίωξη Ηλεκτρονικού Εγκλήματος) → ασφαλιστής. Η σειρά και η ταχύτητα μετράνε.',
            en: 'Learn the incident steps in advance: bank → authorities (cybercrime unit) → insurer. Order and speed matter.',
        },
        {
            el: 'Κράτα screenshots και emails από κάθε ύποπτη συναλλαγή — είναι τα βασικά αποδεικτικά του φακέλου.',
            en: 'Keep screenshots and emails of any suspicious transaction — they are the core evidence of the file.',
        },
        {
            el: 'Αν το συμβόλαιο προσφέρει τεχνική υποστήριξη, χρησιμοποίησέ την και προληπτικά — όχι μόνο μετά από συμβάν.',
            en: 'If the policy offers technical support, use it preventively too — not only after an incident.',
        },
    ],
    commonGaps: [
        {
            id: 'cyber_limit_gap',
            title: { el: 'Χαμηλά όρια για online απάτη', en: 'Low online-fraud limits' },
            description: {
                el: 'Ορισμένες καλύψεις έχουν χαμηλά όρια ανά περιστατικό — αν κάνεις μεγάλες online συναλλαγές, ίσως αξίζει έλεγχος.',
                en: 'Some covers carry low per-incident limits — if you transact large amounts online, a check may be worth it.',
            },
        },
        {
            id: 'cyber_conditions_gap',
            title: { el: 'Προϋποθέσεις που ακυρώνουν την κάλυψη', en: 'Conditions that void the cover' },
            description: {
                el: 'Κοινοποίηση κωδικών ή παραμελημένο λογισμικό μπορεί να οδηγήσουν σε απόρριψη — δες τις υποχρεώσεις σου στο έγγραφο.',
                en: 'Shared credentials or neglected software can lead to denial — see your obligations in the document.',
            },
        },
        {
            id: 'cyber_family_gap',
            title: { el: 'Δεν καλύπτονται όλα τα μέλη ή οι συσκευές', en: 'Not all members or devices covered' },
            description: {
                el: 'Έλεγξε αν η κάλυψη αφορά μόνο εσένα ή και την οικογένειά σου — και ποιες συσκευές περιλαμβάνει.',
                en: 'Check whether the cover is you-only or includes your family — and which devices it spans.',
            },
        },
    ],
    recommendedActions: [
        {
            id: 'cyber_check_fraud',
            label: { el: 'Δες τι καλύπτεται σε online απάτη', en: 'See what is covered in online fraud' },
            href: null,
            ctaType: 'askAi',
            question: { el: 'Τι καλύπτεται σε περίπτωση online απάτης;', en: 'What is covered in case of online fraud?' },
        },
        {
            id: 'cyber_check_limits',
            label: { el: 'Έλεγξε όρια αποζημίωσης', en: 'Check compensation limits' },
            href: null,
            ctaType: 'askAi',
            question: { el: 'Ποια είναι τα όρια αποζημίωσης;', en: 'What are the compensation limits?' },
        },
        {
            id: 'cyber_incident_steps',
            label: { el: 'Δες τι πρέπει να κάνεις άμεσα σε περιστατικό', en: 'See what to do immediately in an incident' },
            href: null,
            ctaType: 'askAi',
            question: { el: 'Τι πρέπει να κάνω άμεσα σε cyber περιστατικό;', en: 'What must I do immediately in a cyber incident?' },
        },
        {
            id: 'cyber_ask_agent',
            label: { el: 'Ρώτησε τον σύμβουλό σου για την οικογενειακή κάλυψη', en: 'Ask your advisor about family-wide cover' },
            href: '/agent',
            ctaType: 'askAgent',
        },
    ],
    suggestedQuestions: [
        { el: 'Τι καλύπτεται σε online απάτη;', en: 'What is covered in online fraud?' },
        { el: 'Ποιο είναι το όριο αποζημίωσης;', en: 'What is the compensation limit?' },
        { el: 'Τι πρέπει να κάνω άμεσα σε περιστατικό;', en: 'What must I do immediately in an incident?' },
        { el: 'Καλύπτεται κλοπή ταυτότητας;', en: 'Is identity theft covered?' },
        { el: 'Ποιες είναι οι υποχρεώσεις μου ως χρήστη;', en: 'What are my obligations as a user?' },
    ],
    claimsSteps: [
        {
            el: 'Ειδοποίησε αμέσως την τράπεζά σου για μπλοκάρισμα καρτών/λογαριασμών — πριν από οτιδήποτε άλλο.',
            en: 'Notify your bank immediately to block cards/accounts — before anything else.',
        },
        {
            el: 'Κατάθεσε καταγγελία στη Δίωξη Ηλεκτρονικού Εγκλήματος — ο αριθμός πρωτοκόλλου ζητείται σχεδόν πάντα από τον ασφαλιστή.',
            en: 'File a report with the cybercrime unit — the case number is almost always required by the insurer.',
        },
        {
            el: 'Συγκέντρωσε αποδεικτικά (screenshots, emails, κινήσεις λογαριασμού) και δήλωσε το περιστατικό στον ασφαλιστή σου εντός της προθεσμίας του συμβολαίου.',
            en: 'Gather evidence (screenshots, emails, statements) and report to your insurer within the policy deadline.',
        },
    ],
    renewalNote: {
        el: 'Στην ανανέωση, δες αν τα όρια εξακολουθούν να ταιριάζουν με τη χρήση σου — οι online συναλλαγές συνήθως μεγαλώνουν χρόνο με τον χρόνο.',
        en: 'At renewal, see whether the limits still match your usage — online activity usually grows year on year.',
    },
    emptyState: {
        headline: { el: 'Δεν έχεις προσθέσει cyber κάλυψη', en: 'No cyber cover added yet' },
        description: {
            el: 'Ανέβασε το συμβόλαιό σου (ή το πρόγραμμα της τράπεζάς σου) και δες τι ισχύει για online απάτη και κλοπή ταυτότητας.',
            en: 'Upload your policy (or your bank’s programme) and see what applies for online fraud and identity theft.',
        },
        ctaLabel: { el: 'Ανέβασε συμβόλαιο', en: 'Upload policy' },
    },
}
