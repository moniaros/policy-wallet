// Plain data module — NOT a client component. A "use client" module's
// non-component exports become client references on the server, so the
// route wrappers could not read this array when it lived in the page
// component (build failed with "AGENT_FAQS.map is not a function").
// Same pattern as lib/product/lob-faqs.ts.

/**
 * The agent-side adversarial questions, answered in the agent's own register.
 * Exported because the route wrappers emit FAQPage JSON-LD from this exact
 * array — the structured data can never claim an answer the page omits.
 * The first one is the CRM negative: this is the page most easily mistaken
 * for a broker CRM, and it previously carried no denial above the footer.
 */
export const AGENT_FAQS: { q: { el: string; en: string }; a: { el: string; en: string } }[] = [
    {
        q: {
            el: "Είναι το PolicyWallet CRM για ασφαλιστικά γραφεία;",
            en: "Is PolicyWallet a CRM for insurance agencies?",
        },
        a: {
            el: "Όχι. Είναι πλατφόρμα προσωπικής ανάλυσης ρίσκου: το πορτοφόλι ανήκει στον ασφαλισμένο και εσείς το βλέπετε μόνο αν εκείνος επιλέξει να το μοιραστεί. Δεν διαχειριζόμαστε το πελατολόγιό σας — διαβάζουμε τα ασφαλιστήρια των πελατών σας και σας δείχνουμε τι λέει το καθένα.",
            en: "No. It is a personal risk intelligence platform: the wallet belongs to the policyholder, and you see it only if they choose to share it. We do not manage your book — we read your clients' policies and show you what each one says.",
        },
    },
    {
        q: {
            el: "Ποιος βλέπει τα δεδομένα του πελάτη μου;",
            en: "Who can see my client's data?",
        },
        a: {
            el: "Μόνο ό,τι μοιράζεται ο πελάτης, και μόνο όσο το επιτρέπει. Την πρόσβαση τη δίνει και την ανακαλεί ο ίδιος, όποτε θέλει. Δεν πουλάμε δεδομένα και δεν τα χρησιμοποιούμε για διαφημιστική κατάρτιση προφίλ.",
            en: "Only what the client shares, and only for as long as they allow it. They grant access and can revoke it themselves at any time. We do not sell data and do not use it for advertising profiles.",
        },
    },
    {
        q: {
            el: "Ανταγωνίζεστε τον ασφαλιστή;",
            en: "Do you compete with the agent?",
        },
        a: {
            el: "Όχι. Δεν πουλάμε ασφάλειες και δεν παίρνουμε προμήθεια — πληρωνόμαστε μόνο από συνδρομές. Η ίδια ανεξάρτητη ανάλυση που εμπιστεύεται ο ασφαλισμένος γίνεται το κοινό έδαφος της κουβέντας σας μαζί του.",
            en: "No. We sell no insurance and take no commission — we are paid only by subscriptions. The same independent analysis the policyholder trusts becomes the common ground for your conversation with them.",
        },
    },
]