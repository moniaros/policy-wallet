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
            el: "Προσφέρει εργαλεία οργάνωσης πελατών και ανάγνωσης ασφαλιστηρίων. Η πρόσβαση στα έγγραφα περιορίζεται από τον ρόλο, τη σχέση με τον πελάτη και τις άδειες μέσα στην εφαρμογή.",
            en: "It provides tools for organising clients and reading policies. Document access is limited by role, the client relationship and permissions in the app.",
        },
    },
    {
        q: {
            el: "Ποιος βλέπει τα δεδομένα του πελάτη μου;",
            en: "Who can see my client's data?",
        },
        a: {
            el: "Η πρόσβαση ελέγχεται από τον ρόλο, τη σχέση με τον πελάτη και τις άδειες που έχουν δοθεί. Οι τεχνικοί πάροχοι περιγράφονται στην Πολιτική Απορρήτου. Δεν πουλάμε προσωπικά δεδομένα.",
            en: "Access is controlled by role, the client relationship and granted permissions. Technical providers are described in the Privacy Policy. We do not sell personal data.",
        },
    },
    {
        q: {
            el: "Ανταγωνίζεστε τον ασφαλιστή;",
            en: "Do you compete with the agent?",
        },
        a: {
            el: "Όχι. Δεν πουλάμε ασφάλειες και δεν παίρνουμε προμήθεια. Η ίδια ανάλυση που βλέπει ο ασφαλισμένος γίνεται το κοινό έδαφος της κουβέντας σας μαζί του.",
            en: "No. We sell no insurance and take no commission. The same analysis the policyholder sees becomes the common ground for your conversation with them.",
        },
    },
]